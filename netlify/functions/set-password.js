// JRC Assignment System — set-password.js
// Admin-only endpoint to set or reset a password for any permissioned adult

const { getDb } = require('./db');
const bcrypt = require('bcryptjs');

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (origin === 'https://jrc.hlsr.app') return true;
  if (/https:\/\/[a-z0-9-]+--jrc-rodeo\.netlify\.app$/.test(origin)) return true;
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
  if (!process.env.API_SECRET || clientToken !== process.env.API_SECRET) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { adultId, newPassword, newPermission } = body;

  if (!adultId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'adultId is required' }) };
  }

  try {
    const sql = getDb();

    // Update password if provided
    if (newPassword && newPassword.length >= 6) {
      const hash = await bcrypt.hash(newPassword, 10);
      await sql`UPDATE adults SET password_hash = ${hash}, updated_at = NOW() WHERE id = ${String(adultId)}`;
    }

    // Update permission if provided
    if (newPermission !== undefined) {
      const perm = newPermission || null;
      await sql`UPDATE adults SET permission = ${perm}, updated_at = NOW() WHERE id = ${String(adultId)}`;
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };

  } catch (err) {
    console.error('[set-password] Error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server error' }) };
  }
};
