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
      const rows = await sql`SELECT key, value FROM app_state`;
      const state = {};
      rows.forEach(r => { state[r.key] = r.value; });

      const juniorRows = await sql`SELECT * FROM juniors ORDER BY check_in_order`;
      const slotRows = await sql`SELECT * FROM active_slots`;
      const requestRows = await sql`SELECT * FROM committee_requests ORDER BY id`;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          state,
          juniors: juniorRows,
          activeSlots: slotRows,
          committeeRequests: requestRows
        })
      };
    }

    // POST — save full state
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);

      // Save key/value state (currentDate, currentShift, etc.)
      if (body.state) {
        for (const [key, value] of Object.entries(body.state)) {
          await sql`
            INSERT INTO app_state (key, value, updated_at)
            VALUES (${key}, ${JSON.stringify(value)}, NOW())
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
          `;
        }
      }

      // Save junior overrides
      if (body.juniors) {
        for (const j of body.juniors) {
          await sql`
            INSERT INTO juniors (
              id, name, title, ageout, has_hat, notes, phone, email,
              shift_log, checked_in, assignment, last_assignment,
              check_in_order, check_in_shift, shift_assignments,
              planned_shifts, history, updated_at
            ) VALUES (
              ${j.id}, ${j.name}, ${j.title || ''}, ${j.ageout || false},
              ${j.hasHat || false}, ${j.notes || ''}, ${j.phone || ''},
              ${j.email || ''}, ${JSON.stringify(j.shiftLog || [])},
              ${j.checkedIn || false}, ${j.assignment || null},
              ${j.last || 'None'}, ${j.order || 0}, ${j.checkInShift || ''},
              ${JSON.stringify(j.shiftAssignments || {})},
              ${JSON.stringify(j.plannedShifts || [])},
              ${JSON.stringify(j.history || [])}, NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              ageout = EXCLUDED.ageout,
              has_hat = EXCLUDED.has_hat,
              notes = EXCLUDED.notes,
              phone = EXCLUDED.phone,
              email = EXCLUDED.email,
              shift_log = EXCLUDED.shift_log,
              checked_in = EXCLUDED.checked_in,
              assignment = EXCLUDED.assignment,
              last_assignment = EXCLUDED.last_assignment,
              check_in_order = EXCLUDED.check_in_order,
              check_in_shift = EXCLUDED.check_in_shift,
              shift_assignments = EXCLUDED.shift_assignments,
              planned_shifts = EXCLUDED.planned_shifts,
              history = EXCLUDED.history,
              updated_at = NOW()
          `;
        }
      }

      // Save active slots
      if (body.activeSlots) {
        await sql`DELETE FROM active_slots`;
        for (const s of body.activeSlots) {
          await sql`
            INSERT INTO active_slots (
              id, name, shift, capacity, assigned, hat,
              liaison, liaison_phone, location, duties,
              slot_notes, custom, is_sent, updated_at
            ) VALUES (
              ${String(s.id)}, ${s.name}, ${s.shift}, ${s.capacity || 4},
              ${JSON.stringify(s.assigned || [])}, ${s.hat || false},
              ${s.liaison || ''}, ${s.liaisonPhone || ''},
              ${s.location || ''}, ${s.duties || ''},
              ${s.notes || ''}, ${s.custom || false},
              ${s.isSent || false}, NOW()
            )
          `;
        }
      }

      // Save committee requests
      if (body.committeeRequests) {
        await sql`DELETE FROM committee_requests`;
        for (const r of body.committeeRequests) {
          await sql`
            INSERT INTO committee_requests (id, status, name, data, updated_at)
            VALUES (${r.id}, ${r.status}, ${r.name}, ${JSON.stringify(r)}, NOW())
            ON CONFLICT (id) DO UPDATE SET
              status = EXCLUDED.status,
              data = EXCLUDED.data,
              updated_at = NOW()
          `;
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
      };
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
