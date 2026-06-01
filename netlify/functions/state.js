const { getDb } = require('./db');

// ── CORS ─────────────────────────────────────────────────────────────────────
function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (origin === 'https://jrc.hlsr.app') return true;
  if (origin === 'https://jrcpartner.hlsr.app') return true;
  if (/https:\/\/[a-z0-9-]+--jrc-rodeo\.netlify\.app$/.test(origin)) return true;
  if (/https:\/\/[a-z0-9-]+--jrc-assignment-system\.netlify\.app$/.test(origin)) return true;
  return false;
}

function getCorsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? (origin || 'https://jrc.hlsr.app') : 'https://jrc.hlsr.app',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };
}

// ── INPUT VALIDATION ─────────────────────────────────────────────────────────
function isString(v)  { return typeof v === 'string'; }
function isBool(v)    { return typeof v === 'boolean'; }
function isNumber(v)  { return typeof v === 'number' && isFinite(v); }
function isArray(v)   { return Array.isArray(v); }
function isObject(v)  { return v !== null && typeof v === 'object' && !Array.isArray(v); }

function validateJunior(j) {
  if (!j || !isString(j.id) || j.id.length === 0) return 'junior missing id';
  if (j.id.length > 20)        return 'junior id too long';
  if (!isString(j.name))       return 'junior missing name';
  if (j.name.length > 200)     return 'junior name too long';
  return null;
}

function validateAdult(a) {
  if (!a || !isString(a.id) || a.id.length === 0) return 'adult missing id';
  if (a.id.length > 20)        return 'adult id too long';
  if (!isString(a.name))       return 'adult missing name';
  if (a.name.length > 200)     return 'adult name too long';
  return null;
}

function validateSlot(s) {
  if (!s || (s.id === undefined || s.id === null)) return 'slot missing id';
  if (!isString(s.name) || s.name.length === 0)   return 'slot missing name';
  if (s.name.length > 200)     return 'slot name too long';
  const validShifts = ['8am', '12pm', '4pm'];
  if (!validShifts.includes(s.shift)) return `slot has invalid shift: ${s.shift}`;
  if (!isNumber(s.capacity) || s.capacity < 1 || s.capacity > 100) return 'slot capacity out of range';
  if (!isArray(s.assigned))    return 'slot assigned must be array';
  return null;
}

function validateRequest(r) {
  if (!r || !isNumber(r.id))   return 'request missing numeric id';
  if (!isString(r.name) || r.name.length === 0) return 'request missing name';
  if (r.name.length > 300)     return 'request name too long';
  const validStatuses = ['pending', 'approved', 'rejected'];
  if (!validStatuses.includes(r.status)) return `request has invalid status: ${r.status}`;
  return null;
}

function validateStateKey(key, value) {
  if (!isString(key) || key.length === 0 || key.length > 100) return 'invalid state key';
  // Value can be any JSON-serializable type — just check it's not enormous
  const serialized = JSON.stringify(value);
  if (serialized.length > 500000) return `state key "${key}" value too large`;
  return null;
}


// ── RATE LIMITING ────────────────────────────────────────────────────────────
// In-memory store — resets when the function cold-starts (fine for our use case)
// Limits: 60 requests per IP per minute for normal use
//         stricter 10 per minute for DELETE (destructive)
const rateLimitStore = {};

function isRateLimited(ip, method) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const limits = { GET: 60, POST: 60, DELETE: 10 };
  const limit = limits[method] || 60;

  if (!rateLimitStore[ip]) rateLimitStore[ip] = [];

  // Remove entries outside the current window
  rateLimitStore[ip] = rateLimitStore[ip].filter(t => now - t < windowMs);

  if (rateLimitStore[ip].length >= limit) return true;

  rateLimitStore[ip].push(now);
  return false;
}

// Clean up old IPs every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  const windowMs = 60 * 1000;
  for (const ip of Object.keys(rateLimitStore)) {
    rateLimitStore[ip] = rateLimitStore[ip].filter(t => now - t < windowMs);
    if (rateLimitStore[ip].length === 0) delete rateLimitStore[ip];
  }
}, 5 * 60 * 1000);

// ── HANDLER ──────────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || '';
  const headers = getCorsHeaders(origin);

  if (!isAllowedOrigin(origin)) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  // Rate limiting — get client IP from Netlify headers
  const clientIp = (event.headers && (
    event.headers['x-nf-client-connection-ip'] ||
    event.headers['x-forwarded-for'] ||
    event.headers['client-ip'] ||
    'unknown'
  )).split(',')[0].trim();

  if (isRateLimited(clientIp, event.httpMethod)) {
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({ error: 'Too many requests. Please slow down.' })
    };
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const sql = getDb();

  try {
    // GET — load full state
    if (event.httpMethod === 'GET') {
      const [stateRows, juniorRows, adultRows, slotRows, reqRows] = await Promise.all([
        sql`SELECT key, value FROM app_state`,
        sql`SELECT * FROM juniors ORDER BY name`,
        sql`SELECT * FROM adults ORDER BY name`,
        sql`SELECT * FROM active_slots`,
        sql`SELECT * FROM committee_requests ORDER BY id`
      ]);

      const state = {};
      stateRows.forEach(r => { state[r.key] = r.value; });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          state,
          juniors: juniorRows,
          adults: adultRows,
          activeSlots: slotRows,
          committeeRequests: reqRows,
          config: {
            boardPin: process.env.STATUS_BOARD_PIN || ''
          }
        })
      };
    }

    // POST — save state
    if (event.httpMethod === 'POST') {
      let body;
      try {
        body = JSON.parse(event.body);
      } catch(e) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
      }

      if (!isObject(body)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body must be an object' }) };
      }

      // Validate state keys
      if (body.state !== undefined) {
        if (!isObject(body.state)) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'state must be an object' }) };
        }
        for (const [key, value] of Object.entries(body.state)) {
          const err = validateStateKey(key, value);
          if (err) return { statusCode: 400, headers, body: JSON.stringify({ error: err }) };
        }
        if (Object.keys(body.state).length > 0) {
          await Promise.all(Object.entries(body.state).map(([key, value]) =>
            sql`INSERT INTO app_state (key, value, updated_at)
                VALUES (${key}, ${JSON.stringify(value)}, NOW())
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`
          ));
        }
      }

      // Validate and upsert juniors
      if (body.juniors !== undefined) {
        if (!isArray(body.juniors)) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'juniors must be an array' }) };
        }
        if (body.juniors.length > 2000) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'too many juniors in one request' }) };
        }
        for (const j of body.juniors) {
          const err = validateJunior(j);
          if (err) return { statusCode: 400, headers, body: JSON.stringify({ error: err }) };
        }
        if (body.juniors.length > 0) {
          await Promise.all(body.juniors.map(j =>
            sql`INSERT INTO juniors (
                  id, name, title, ageout, has_hat, notes, phone, email,
                  shift_log, checked_in, assignment, last_assignment,
                  check_in_order, check_in_shift, shift_assignments,
                  planned_shifts, history, inactive, updated_at
                ) VALUES (
                  ${j.id}, ${j.name||''}, ${j.title||'Committeeman'},
                  ${j.ageout||false}, ${j.hasHat||j.has_hat||false},
                  ${j.notes||''}, ${j.phone||''}, ${j.email||''},
                  ${JSON.stringify(j.shiftLog||j.shift_log||[])},
                  ${j.checkedIn||j.checked_in||false},
                  ${j.assignment||null},
                  ${j.last||j.last_assignment||'None'},
                  ${j.order||j.check_in_order||0},
                  ${j.checkInShift||j.check_in_shift||''},
                  ${JSON.stringify(j.shiftAssignments||j.shift_assignments||{})},
                  ${JSON.stringify(j.plannedShifts||j.planned_shifts||[])},
                  ${JSON.stringify(j.history||[])},
                  ${j.inactive||false}, NOW()
                )
                ON CONFLICT (id) DO UPDATE SET
                  name=EXCLUDED.name, title=EXCLUDED.title,
                  ageout=EXCLUDED.ageout, has_hat=EXCLUDED.has_hat,
                  notes=EXCLUDED.notes, phone=EXCLUDED.phone, email=EXCLUDED.email,
                  shift_log=EXCLUDED.shift_log, checked_in=EXCLUDED.checked_in,
                  assignment=EXCLUDED.assignment, last_assignment=EXCLUDED.last_assignment,
                  check_in_order=EXCLUDED.check_in_order, check_in_shift=EXCLUDED.check_in_shift,
                  shift_assignments=EXCLUDED.shift_assignments,
                  planned_shifts=EXCLUDED.planned_shifts, history=EXCLUDED.history,
                  inactive=EXCLUDED.inactive, updated_at=NOW()`
          ));
        }
      }

      // Validate and upsert adults
      if (body.adults !== undefined) {
        if (!isArray(body.adults)) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'adults must be an array' }) };
        }
        if (body.adults.length > 500) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'too many adults in one request' }) };
        }
        for (const a of body.adults) {
          const err = validateAdult(a);
          if (err) return { statusCode: 400, headers, body: JSON.stringify({ error: err }) };
        }
        if (body.adults.length > 0) {
          await Promise.all(body.adults.map(a =>
            sql`INSERT INTO adults (id, name, title, phone, email, inactive, updated_at)
                VALUES (${a.id}, ${a.name||''}, ${a.title||''}, ${a.phone||''}, ${a.email||''}, ${a.inactive||false}, NOW())
                ON CONFLICT (id) DO UPDATE SET
                  name=EXCLUDED.name, title=EXCLUDED.title,
                  phone=EXCLUDED.phone, email=EXCLUDED.email,
                  inactive=EXCLUDED.inactive, updated_at=NOW()`
          ));
        }
      }

      // Validate and upsert active slots
      if (body.activeSlots !== undefined) {
        if (!isArray(body.activeSlots)) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'activeSlots must be an array' }) };
        }
        if (body.activeSlots.length > 200) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'too many active slots' }) };
        }
        for (const s of body.activeSlots) {
          const err = validateSlot(s);
          if (err) return { statusCode: 400, headers, body: JSON.stringify({ error: err }) };
        }
        if (body.activeSlots.length === 0) {
          await sql`DELETE FROM active_slots`;
        } else {
          const existing = await sql`SELECT id FROM active_slots`;
          const existingIds = new Set(existing.map(r => r.id));
          const newIds = new Set(body.activeSlots.map(s => String(s.id)));
          const toDelete = [...existingIds].filter(id => !newIds.has(id));
          if (toDelete.length > 0) {
            await sql`DELETE FROM active_slots WHERE id = ANY(${toDelete})`;
          }
          await Promise.all(body.activeSlots.map(s =>
            sql`INSERT INTO active_slots (
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
                ON CONFLICT (id) DO UPDATE SET
                  name=EXCLUDED.name, shift=EXCLUDED.shift,
                  capacity=EXCLUDED.capacity, assigned=EXCLUDED.assigned,
                  hat=EXCLUDED.hat, liaison=EXCLUDED.liaison,
                  liaison_phone=EXCLUDED.liaison_phone, location=EXCLUDED.location,
                  duties=EXCLUDED.duties, slot_notes=EXCLUDED.slot_notes,
                  custom=EXCLUDED.custom, is_sent=EXCLUDED.is_sent,
                  updated_at=NOW()`
          ));
        }
      }

      // Validate and replace committee requests
      if (body.committeeRequests !== undefined) {
        if (!isArray(body.committeeRequests)) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'committeeRequests must be an array' }) };
        }
        if (body.committeeRequests.length > 500) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'too many committee requests' }) };
        }
        for (const r of body.committeeRequests) {
          const err = validateRequest(r);
          if (err) return { statusCode: 400, headers, body: JSON.stringify({ error: err }) };
        }
        await sql`DELETE FROM committee_requests`;
        if (body.committeeRequests.length > 0) {
          await Promise.all(body.committeeRequests.map(r =>
            sql`INSERT INTO committee_requests (id, status, name, data, updated_at)
                VALUES (${r.id}, ${r.status||'pending'}, ${r.name}, ${JSON.stringify(r)}, NOW())
                ON CONFLICT (id) DO UPDATE SET
                  status=EXCLUDED.status, data=EXCLUDED.data, updated_at=NOW()`
          ));
        }
      }

      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    // DELETE — clear session state, preserve roster
    if (event.httpMethod === 'DELETE') {
      await Promise.all([
        sql`DELETE FROM app_state`,
        sql`DELETE FROM active_slots`,
        sql`UPDATE juniors SET
              checked_in=false, assignment=null, check_in_order=0,
              check_in_shift='', shift_assignments='{}', planned_shifts='[]',
              updated_at=NOW()`
      ]);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  } catch (err) {
    console.error('State function error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
