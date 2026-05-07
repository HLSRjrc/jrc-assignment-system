const { neon } = require('@neondatabase/serverless');

function getDb() {
  if (!process.env.NEON_DATABASE_URL) {
    throw new Error('NEON_DATABASE_URL environment variable not set');
  }
  return neon(process.env.NEON_DATABASE_URL);
}

module.exports = { getDb };
