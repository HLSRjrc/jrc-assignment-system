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

  try {
    const sql = getDb();

    // Create all tables needed for the JRC app
    await sql`
      CREATE TABLE IF NOT EXISTS app_state (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS juniors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        title TEXT,
        ageout BOOLEAN DEFAULT FALSE,
        has_hat BOOLEAN DEFAULT FALSE,
        notes TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        email TEXT DEFAULT '',
        shift_log JSONB DEFAULT '[]',
        checked_in BOOLEAN DEFAULT FALSE,
        assignment TEXT,
        last_assignment TEXT DEFAULT 'None',
        check_in_order INTEGER DEFAULT 0,
        check_in_shift TEXT DEFAULT '',
        shift_assignments JSONB DEFAULT '{}',
        planned_shifts JSONB DEFAULT '[]',
        history JSONB DEFAULT '[]',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS active_slots (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        shift TEXT NOT NULL,
        capacity INTEGER DEFAULT 4,
        assigned JSONB DEFAULT '[]',
        hat BOOLEAN DEFAULT FALSE,
        liaison TEXT DEFAULT '',
        liaison_phone TEXT DEFAULT '',
        location TEXT DEFAULT '',
        duties TEXT DEFAULT '',
        slot_notes TEXT DEFAULT '',
        custom BOOLEAN DEFAULT FALSE,
        is_sent BOOLEAN DEFAULT FALSE,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS committee_requests (
        id INTEGER PRIMARY KEY,
        status TEXT DEFAULT 'pending',
        name TEXT NOT NULL,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Database tables ready' })
    };
  } catch (err) {
    console.error('Setup error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
