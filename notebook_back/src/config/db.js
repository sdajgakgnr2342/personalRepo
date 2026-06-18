const mysql = require('mysql2');

const RETRYABLE_DB_ERRORS = new Set([
  'ECONNRESET',
  'PROTOCOL_CONNECTION_LOST',
  'ETIMEDOUT',
  'EPIPE',
  'ECONNREFUSED',
]);

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 30000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  maxIdle: 10,
  idleTimeout: 60000,
});

pool.on('connection', (connection) => {
  connection.on('error', (err) => {
    if (RETRYABLE_DB_ERRORS.has(err.code)) {
      console.error('MySQL connection error (pool will recover):', err.message);
    }
  });
});

const promisePool = pool.promise();

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function query(sql, params) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await promisePool.query(sql, params);
    } catch (err) {
      lastError = err;
      if (!RETRYABLE_DB_ERRORS.has(err.code) || attempt === 2) throw err;
      await sleep(300 * (attempt + 1));
    }
  }
  throw lastError;
}

module.exports = { query, isRetryableDbError: (err) => RETRYABLE_DB_ERRORS.has(err.code) };
