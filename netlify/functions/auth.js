// JRC Assignment System — auth.js
// Handles password-based authentication for permissioned adults
// Regular adults (no permission) use member number as password — validated here too

const { getDb } = require('./db');
const bcrypt = require('bcryptjs');

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
    'Access-Control-Allow-Headers': 'Content-Type, x-api-token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
}

// Permissions that require a custom password (not member number)
const CUSTOM_PASSWORD_PERMS = ['admin', 'vc-slt', 'scheduling'];

exports.handler = async (event) => {
  const origin = event.headers && (event.headers.origin || event.headers.Origin);
  const headers = getCorsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Validate API token
  const clientToken = event.headers && (event.headers['x-api-token'] || event.headers['X-Api-Token']);
  const validToken = process.env.API_SECRET;
  if (!validToken || clientToken !== validToken) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const email    = (body.email    || '').trim().toLowerCase();
  const password = (body.password || '').trim();

  if (!email || !password) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email and password are required' }) };
  }

  try {
    const sql = getDb();

    // Look up adult by email
    const rows = await sql`
      SELECT id, name, title, email, permission, password_hash, inactive
      FROM adults
      WHERE LOWER(TRIM(email)) = ${email}
      LIMIT 1
    `;

    if (!rows.length) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Email or password incorrect' }) };
    }

    const adult = rows[0];

    if (adult.inactive) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'This account is inactive' }) };
    }

    const perm = adult.permission || null;
    let authenticated = false;

    if (perm && CUSTOM_PASSWORD_PERMS.includes(perm)) {
      // Admin, VC/SLT, Scheduling — must have a custom password set
      if (!adult.password_hash) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'No password set for this account. Please contact an administrator.' }) };
      }
      authenticated = await bcrypt.compare(password, adult.password_hash);
    } else {
      // Shift Officers and everyone else — password is their member number
      authenticated = (password === String(adult.id).trim());
    }

    if (!authenticated) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Email or password incorrect' }) };
    }

    // Success — return adult info (never return password_hash)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        adult: {
          id:         adult.id,
          name:       adult.name,
          title:      adult.title || '',
          email:      adult.email || '',
          permission: perm
        }
      })
    };

  } catch (err) {
    console.error('[auth] Error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server error' }) };
  }
};
