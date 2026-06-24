require('dotenv').config();
const db = require('../src/config/db');

(async () => {
  try {
    const [tables] = await db.query("SHOW TABLES LIKE 'vault_%'");
    console.log('vault tables:', tables);

    const sql = `
      SELECT r.id, r.user_id, r.message, r.contact, r.status, r.admin_note, r.reject_reason,
             r.created_at, r.handled_at, u.username, u.nickname
      FROM vault_recovery_request r
      INNER JOIN core_user u ON u.id = r.user_id
      ORDER BY r.created_at DESC LIMIT 100`;
    const [rows] = await db.query(sql);
    console.log('query ok, rows:', rows.length);
  } catch (error) {
    console.error('ERR', error.code, error.message);
  }
  process.exit(0);
})();
