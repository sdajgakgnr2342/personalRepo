const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'notebook-jwt-secret-change-me';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, code: 401, message: '未登录或登录已过期' });
  }
  try {
    const token = header.slice(7);
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ success: false, code: 401, message: '登录令牌无效' });
  }
}

function optionalAuthMiddleware(req, _res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = verifyToken(header.slice(7));
    } catch {
      req.user = null;
    }
  }
  next();
}

module.exports = { signToken, verifyToken, authMiddleware, optionalAuthMiddleware, JWT_SECRET };
