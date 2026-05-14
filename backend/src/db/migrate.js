require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.log('[Migrate] Running schema.sql…');
  await pool.query(sql);
  console.log('[Migrate] ✓ Done');
  await pool.end();
}

migrate().catch((err) => {
  console.error('[Migrate] Error:', err.message);
  process.exit(1);
});
