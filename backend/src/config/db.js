const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  if (process.env.NODE_ENV !== 'test') {
    console.log('[DB] New client connected');
  }
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Execute a single query with optional parameters.
 * @param {string} text  – SQL string
 * @param {Array}  params – Bound parameters
 */
const query = (text, params) => pool.query(text, params);

/**
 * Grab a client for transactions.
 * Always call client.release() in a finally block.
 */
const getClient = () => pool.connect();

/**
 * Run a function inside a serialisable transaction.
 * Rolls back and re-throws on any error.
 */
const withTransaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { query, getClient, withTransaction, pool };
