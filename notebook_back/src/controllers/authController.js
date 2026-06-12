const db = require('../config/db');
const cryptoUtil = require('../utils/crypto');
const { signToken } = require('../middleware/auth');
const { ok, fail, ensureRootFolder } = require('../utils/helpers');

const register = async (req, res) => {
  try {
    const { username, password, nickname } = req.body;
    if (!username || !password) return fail(res, '用户名和密码不能为空');
    if (password.length < 6) return fail(res, '密码至少6位');

    const [exists] = await db.query('SELECT id FROM core_user WHERE username = ?', [username]);
    if (exists.length) return fail(res, '用户名已存在');

    const hashed = await cryptoUtil.hashPassword(password);
    const [result] = await db.query(
      'INSERT INTO core_user (username, password, nickname) VALUES (?, ?, ?)',
      [username, hashed, nickname || username]
    );

    await ensureRootFolder(db, result.insertId);

    const token = signToken({ userId: result.insertId, username });
    return ok(res, {
      token,
      userInfo: { id: result.insertId, username, nickname: nickname || username },
    }, '注册成功');
  } catch (error) {
    console.error('register error:', error);
    return fail(res, '注册失败', 500, 500);
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return fail(res, '用户名和密码不能为空');

    const [rows] = await db.query('SELECT * FROM core_user WHERE username = ?', [username]);
    if (!rows.length) return fail(res, '用户名或密码错误', 401, 401);

    const user = rows[0];
    const valid = await cryptoUtil.verifyPassword(password, user.password);
    if (!valid) return fail(res, '用户名或密码错误', 401, 401);

    const token = signToken({ userId: user.id, username: user.username });
    return ok(res, {
      token,
      userInfo: { id: user.id, username: user.username, nickname: user.nickname, avatar: user.avatar },
    }, '登录成功');
  } catch (error) {
    console.error('login error:', error);
    return fail(res, '登录失败', 500, 500);
  }
};

const profile = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, username, nickname, avatar, created_at FROM core_user WHERE id = ?',
      [req.user.userId]
    );
    if (!rows.length) return fail(res, '用户不存在', 404, 404);
    return ok(res, rows[0]);
  } catch (error) {
    return fail(res, '获取用户信息失败', 500, 500);
  }
};

const logout = async (_req, res) => ok(res, null, '已退出登录');

module.exports = { register, login, profile, logout };
