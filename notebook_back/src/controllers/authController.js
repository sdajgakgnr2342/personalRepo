const db = require('../config/db');
const multer = require('multer');
const uploadConfig = require('../config/upload');
const cryptoUtil = require('../utils/crypto');
const oss = require('../utils/oss');
const { signToken } = require('../middleware/auth');
const { ok, fail, ensureRootFolder, decodeUploadFilename } = require('../utils/helpers');

const AVATAR_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']);

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: uploadConfig.maxAvatarBytes },
  fileFilter: (_req, file, cb) => {
    if (AVATAR_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 JPG、PNG、GIF、WebP 格式'));
    }
  },
});

async function fetchUserProfile(userId) {
  const [rows] = await db.query(
    'SELECT id, username, nickname, avatar, secret_code_set, is_admin, created_at FROM core_user WHERE id = ?',
    [userId]
  );
  return rows[0] || null;
}

function mapUserInfo(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    nickname: row.nickname,
    avatar: row.avatar,
    secretCodeSet: !!row.secret_code_set,
    isAdmin: !!row.is_admin,
    created_at: row.created_at,
  };
}

function validateSecretCode(code) {
  if (!code || typeof code !== 'string') return '暗号不能为空';
  const trimmed = code.trim();
  if (trimmed.length < 4 || trimmed.length > 16) return '暗号长度为4-16位';
  if (!/^-?\d+\.?\d*$/.test(trimmed)) return '暗号只能包含数字和小数点';
  return null;
}

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
      userInfo: { id: result.insertId, username, nickname: nickname || username, secretCodeSet: false },
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
      userInfo: mapUserInfo(user),
    }, '登录成功');
  } catch (error) {
    console.error('login error:', error);
    return fail(res, '登录失败', 500, 500);
  }
};

const profile = async (req, res) => {
  try {
    const user = await fetchUserProfile(req.user.userId);
    if (!user) return fail(res, '用户不存在', 404, 404);
    return ok(res, mapUserInfo(user));
  } catch (error) {
    return fail(res, '获取用户信息失败', 500, 500);
  }
};

const logout = async (_req, res) => ok(res, null, '已退出登录');

const updateProfile = async (req, res) => {
  try {
    const { nickname } = req.body;
    if (nickname === undefined) return fail(res, '请提供昵称');
    const trimmed = String(nickname).trim();
    if (!trimmed) return fail(res, '昵称不能为空');
    if (trimmed.length > 50) return fail(res, '昵称最多50个字符');

    await db.query('UPDATE core_user SET nickname = ? WHERE id = ?', [trimmed, req.user.userId]);

    const user = await fetchUserProfile(req.user.userId);
    if (!user) return fail(res, '用户不存在', 404, 404);
    return ok(res, mapUserInfo(user), '保存成功');
  } catch (error) {
    console.error('updateProfile error:', error);
    return fail(res, '保存失败', 500, 500);
  }
};

const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return fail(res, '请填写完整密码信息');
    if (newPassword.length < 6) return fail(res, '新密码至少6位');

    const [rows] = await db.query('SELECT password FROM core_user WHERE id = ?', [req.user.userId]);
    if (!rows.length) return fail(res, '用户不存在', 404, 404);

    const valid = await cryptoUtil.verifyPassword(oldPassword, rows[0].password);
    if (!valid) return fail(res, '原密码错误', 401, 401);

    const hashed = await cryptoUtil.hashPassword(newPassword);
    await db.query('UPDATE core_user SET password = ? WHERE id = ?', [hashed, req.user.userId]);
    return ok(res, null, '密码修改成功');
  } catch (error) {
    console.error('changePassword error:', error);
    return fail(res, '修改密码失败', 500, 500);
  }
};

const uploadAvatar = [
  avatarUpload.single('avatar'),
  async (req, res) => {
    try {
      if (!req.file) return fail(res, '请选择头像图片');
      if (!oss.isOssEnabled()) return fail(res, 'OSS 未配置，无法上传头像', 500, 500);

      const [rows] = await db.query('SELECT avatar FROM core_user WHERE id = ?', [req.user.userId]);
      if (!rows.length) return fail(res, '用户不存在', 404, 404);
      const oldAvatar = rows[0].avatar;

      const objectKey = oss.generateObjectKey(
        `avatars/user-${req.user.userId}`,
        decodeUploadFilename(req.file.originalname)
      );
      const uploaded = await oss.uploadBuffer(req.file.buffer, objectKey, {
        contentType: req.file.mimetype,
      });

      await db.query('UPDATE core_user SET avatar = ? WHERE id = ?', [uploaded.url, req.user.userId]);

      if (oldAvatar) {
        try {
          await oss.deleteStoredFile(oldAvatar);
        } catch (delErr) {
          console.error('delete old avatar failed:', delErr.message);
        }
      }

      const updated = await fetchUserProfile(req.user.userId);
      return ok(res, mapUserInfo(updated), '头像已更新');
    } catch (error) {
      console.error('uploadAvatar error:', error);
      if (error.message === '仅支持 JPG、PNG、GIF、WebP 格式') {
        return fail(res, error.message, 400, 400);
      }
      if (db.isRetryableDbError(error)) {
        return fail(res, '数据库连接异常，请稍后重试', 503, 503);
      }
      return fail(res, error.message || '头像上传失败', 500, 500);
    }
  },
];

const setSecretCode = async (req, res) => {
  try {
    const { code, confirmCode } = req.body;
    if (!code || !confirmCode) return fail(res, '请完整输入暗号');
    if (code !== confirmCode) return fail(res, '两次输入的暗号不一致');

    const errMsg = validateSecretCode(code);
    if (errMsg) return fail(res, errMsg);

    const [rows] = await db.query(
      'SELECT secret_code_set FROM core_user WHERE id = ?',
      [req.user.userId]
    );
    if (!rows.length) return fail(res, '用户不存在', 404, 404);
    if (rows[0].secret_code_set) return fail(res, '暗号已设置，无法重复设置');

    const hashed = await cryptoUtil.hashPassword(code);
    await db.query(
      'UPDATE core_user SET secret_code_hash = ?, secret_code_set = 1 WHERE id = ?',
      [hashed, req.user.userId]
    );

    const user = await fetchUserProfile(req.user.userId);
    return ok(res, mapUserInfo(user), '暗号设置成功');
  } catch (error) {
    console.error('setSecretCode error:', error);
    return fail(res, '暗号设置失败', 500, 500);
  }
};

const verifySecretCode = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return fail(res, '请输入暗号');

    const [rows] = await db.query(
      'SELECT secret_code_hash, secret_code_set FROM core_user WHERE id = ?',
      [req.user.userId]
    );
    if (!rows.length) return fail(res, '用户不存在', 404, 404);
    if (!rows[0].secret_code_set || !rows[0].secret_code_hash) {
      return ok(res, { valid: false });
    }

    const valid = await cryptoUtil.verifyPassword(code, rows[0].secret_code_hash);
    return ok(res, { valid });
  } catch (error) {
    console.error('verifySecretCode error:', error);
    return fail(res, '验证失败', 500, 500);
  }
};

const resetSecretCode = async (req, res) => {
  try {
    const { oldCode, code, confirmCode } = req.body;
    if (!oldCode || !code || !confirmCode) return fail(res, '请完整输入暗号信息');
    if (code !== confirmCode) return fail(res, '两次输入的新暗号不一致');

    const errMsg = validateSecretCode(code);
    if (errMsg) return fail(res, errMsg);

    const [rows] = await db.query(
      'SELECT secret_code_hash, secret_code_set FROM core_user WHERE id = ?',
      [req.user.userId]
    );
    if (!rows.length) return fail(res, '用户不存在', 404, 404);
    if (!rows[0].secret_code_set || !rows[0].secret_code_hash) {
      return fail(res, '尚未设置暗号', 400, 400);
    }

    const oldValid = await cryptoUtil.verifyPassword(oldCode, rows[0].secret_code_hash);
    if (!oldValid) return fail(res, '当前暗号错误', 401, 401);

    if (oldCode === code) return fail(res, '新暗号不能与当前暗号相同');

    const hashed = await cryptoUtil.hashPassword(code);
    await db.query(
      'UPDATE core_user SET secret_code_hash = ?, secret_code_set = 1 WHERE id = ?',
      [hashed, req.user.userId]
    );

    const user = await fetchUserProfile(req.user.userId);
    return ok(res, mapUserInfo(user), '暗号重置成功');
  } catch (error) {
    console.error('resetSecretCode error:', error);
    return fail(res, '暗号重置失败', 500, 500);
  }
};

const resetSecretCodeByLogin = async (req, res) => {
  try {
    const { loginPassword, code, confirmCode } = req.body;
    if (!loginPassword || !code || !confirmCode) return fail(res, '请完整填写信息');

    const errMsg = validateSecretCode(code);
    if (errMsg) return fail(res, errMsg);
    if (code !== confirmCode) return fail(res, '两次输入的新暗号不一致');

    const [rows] = await db.query('SELECT password FROM core_user WHERE id = ?', [req.user.userId]);
    if (!rows.length) return fail(res, '用户不存在', 404, 404);

    const loginValid = await cryptoUtil.verifyPassword(loginPassword, rows[0].password);
    if (!loginValid) return fail(res, '登录密码错误', 401, 401);

    const hashed = await cryptoUtil.hashPassword(code);
    await db.query(
      'UPDATE core_user SET secret_code_hash = ?, secret_code_set = 1 WHERE id = ?',
      [hashed, req.user.userId]
    );

    const user = await fetchUserProfile(req.user.userId);
    return ok(res, mapUserInfo(user), '暗号已重置');
  } catch (error) {
    console.error('resetSecretCodeByLogin error:', error);
    return fail(res, '暗号重置失败', 500, 500);
  }
};

module.exports = {
  register,
  login,
  profile,
  logout,
  updateProfile,
  changePassword,
  uploadAvatar,
  setSecretCode,
  verifySecretCode,
  resetSecretCode,
  resetSecretCodeByLogin,
};
