const db = require('../config/db');

async function adminMiddleware(req, res, next) {
  try {
    const [rows] = await db.query(
      'SELECT id, is_admin FROM core_user WHERE id = ? LIMIT 1',
      [req.user.userId]
    );
    if (!rows.length || !rows[0].is_admin) {
      return res.status(403).json({ success: false, code: 403, message: '需要管理员权限' });
    }
    req.admin = { id: rows[0].id };
    next();
  } catch (error) {
    console.error('adminMiddleware error:', error);
    return res.status(500).json({ success: false, code: 500, message: '鉴权失败' });
  }
}

module.exports = { adminMiddleware };
