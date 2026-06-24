const { verifyVaultSession } = require('../utils/vaultSession');

function vaultSessionMiddleware(req, res, next) {
  const header = req.headers['x-vault-session'];
  if (!header) {
    return res.status(403).json({ success: false, code: 403, message: '保险库未解锁或已过期' });
  }
  try {
    const payload = verifyVaultSession(header);
    if (payload.userId !== req.user.userId) {
      return res.status(403).json({ success: false, code: 403, message: '保险库会话无效' });
    }
    req.vaultSession = payload;
    next();
  } catch {
    return res.status(403).json({ success: false, code: 403, message: '保险库未解锁或已过期' });
  }
}

module.exports = { vaultSessionMiddleware };
