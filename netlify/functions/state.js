const { getDb } = require('./db');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const sql = getDb();

  try {
    // GET — load full state
    if (event.httpMethod === 'GET') {
      const stateRows = await sql`SELECT key, value FROM app_state`;
      const state = {};
      stateRows.forEach(r => { state[r.key] = r.value; });

      const juniorRows = await sql`SELECT * FROM juniors ORDER BY name`;
      const adultRows  = await sql`SELECT * FROM adults ORDER BY name`;
      const slotRows   = await sql`SELECT * FROM active_slots`;
      const reqRows    = await sql`SELECT * FROM committee_requests ORDER BY id`;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          state,
          juniors: juniorRows,
          adults: adultRows,
          activeSlots: slotRows,
          committeeRequests: reqRows
        })
      };
    }

    // POST — save state
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);

      // Save key/value state
      if (body.state) {
        for (const [key, value] of Object.entries(body.state)) {
          await sql`
            INSERT INTO app_state (key, value, updated_at)
            VALUES (${key}, ${JSON.stringify(value)}, NOW())
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
          `;
        }
      }

      // Upsert juniors — never delete, preserve history
      if (body.juniors && body.juniors.length > 0) {
        for (const j of body.juniors) {
          await sql`
            INSERT INTO juniors (
              id, name, title, ageout, has_hat, notes, phone, email,
              shift_log, checked_in, assignment, last_assignment,
              check_in_order, check_in_shift, shift_assignments,
              planned_shifts, history, inactive, updated_at
            ) VALUES (
              ${j.id}, ${j.name || ''}, ${j.title || 'Committeeman'},
              ${j.ageout || false}, ${j.hasHat || j.has_hat || false},
              ${j.notes || ''}, ${j.phone || ''}, ${j.email || ''},
              ${JSON.stringify(j.shiftLog || j.shift_log || [])},
              ${j.checkedIn || j.checked_in || false},
              ${j.assignment || null},
              ${j.last || j.last_assignment || 'None'},
              ${j.order || j.check_in_order || 0},
              ${j.checkInShift || j.check_in_shift || ''},
              ${JSON.stringify(j.shiftAssignments || j.shift_assignments || {})},
              ${JSON.stringify(j.plannedShifts || j.planned_shifts || [])},
              ${JSON.stringify(j.history || [])},
              ${j.inactive || false}, NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              name              = EXCLUDED.name,
              title             = EXCLUDED.title,
              ageout            = EXCLUDED.ageout,
              has_hat           = EXCLUDED.has_hat,
              notes             = EXCLUDED.notes,
              phone             = EXCLUDED.phone,
              email             = EXCLUDED.email,
              shift_log         = EXCLUDED.shift_log,
              checked_in        = EXCLUDED.checked_in,
              assignment        = EXCLUDED.assignment,
              last_assignment   = EXCLUDED.last_assignment,
              check_in_order    = EXCLUDED.check_in_order,
              check_in_shift    = EXCLUDED.check_in_shift,
              shift_assignments = EXCLUDED.shift_assignments,
              planned_shifts    = EXCLUDED.planned_shifts,
              history           = EXCLUDED.history,
              inactive          = EXCLUDED.inactive,
              updated_at        = NOW()
          `;
        }
      }

      // Upsert adults
      if (body.adults && body.adults.length > 0) {
        for (const a of body.adults) {
          await sql`
            INSERT INTO adults (id, name, title, phone, email, inactive, updated_at)
            VALUES (${a.id}, ${a.name||''}, ${a.title||''}, ${a.phone||''}, ${a.email||''}, ${a.inactive||false}, NOW())
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name, title = EXCLUDED.title,
              phone = EXCLUDED.phone, email = EXCLUDED.email,
              inactive = EXCLUDED.inactive, updated_at = NOW()
          `;
        }
      }

      // Replace active slots
      if (body.activeSlots !== undefined) {
        await sql`DELETE FROM active_slots`;
        for (const s of body.activeSlots) {
          await sql`
            INSERT INTO active_slots (
              id, name, shift, capacity, assigned, hat,
              liaison, liaison_phone, location, duties,
              slot_notes, custom, is_sent, updated_at
            ) VALUES (
              ${String(s.id)}, ${s.name}, ${s.shift}, ${s.capacity||4},
              ${JSON.stringify(s.assigned||[])}, ${s.hat||false},
              ${s.liaison||''}, ${s.liaisonPhone||s.liaison_phone||''},
              ${s.location||''}, ${s.duties||''},
              ${s.notes||s.slot_notes||''}, ${s.custom||false},
              ${s.isSent||false}, NOW()
            )
          `;
        }
      }

      // Replace committee requests
      if (body.committeeRequests !== undefined) {
        await sql`DELETE FROM committee_requests`;
        for (const r of body.committeeRequests) {
          await sql`
            INSERT INTO committee_requests (id, status, name, data, updated_at)
            VALUES (${r.id}, ${r.status||'pending'}, ${r.name}, ${JSON.stringify(r)}, NOW())
            ON CONFLICT (id) DO UPDATE SET
              status = EXCLUDED.status, data = EXCLUDED.data, updated_at = NOW()
          `;
        }
      }

      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    // DELETE — clear session state but keep roster
    if (event.httpMethod === 'DELETE') {
      await sql`DELETE FROM app_state`;
      await sql`DELETE FROM active_slots`;
      // Reset junior session state without deleting them
      await sql`UPDATE juniors SET
        checked_in = false, assignment = null, check_in_order = 0,
        check_in_shift = '', shift_assignments = '{}', planned_shifts = '[]',
        updated_at = NOW()
      `;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  } catch (err) {
    console.error('State function error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
