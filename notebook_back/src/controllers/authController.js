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
    'SELECT id, username, nickname, avatar, created_at FROM core_user WHERE id = ?',
    [userId]
  );
  return rows[0] || null;
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
    const user = await fetchUserProfile(req.user.userId);
    if (!user) return fail(res, '用户不存在', 404, 404);
    return ok(res, user);
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
    return ok(res, user, '保存成功');
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
      return ok(res, updated, '头像已更新');
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

module.exports = { register, login, profile, logout, updateProfile, changePassword, uploadAvatar };
