require('dotenv').config();
const db = require('../src/config/db');

async function main() {
  const [tables] = await db.query("SHOW TABLES LIKE 'vault_%'");
  const [cols] = await db.query("SHOW COLUMNS FROM core_user LIKE 'is_admin'");
  console.log('DB_HOST:', process.env.DB_HOST);
  console.log('vault tables:', tables.map((r) => Object.values(r)[0]));
  console.log('is_admin column:', cols.length ? cols[0] : 'MISSING');
  process.exit(0);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
