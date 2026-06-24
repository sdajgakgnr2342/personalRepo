const crypto = require('crypto');
const db = require('../config/db');
const vaultConfig = require('../config/vault');
const oss = require('../utils/oss');
const { ok, fail } = require('../utils/helpers');
const { signVaultSession } = require('../utils/vaultSession');
const {
  wrapVmkForAdmin,
  unwrapVmkFromAdmin,
  hashRecoveryToken,
  wrapVmkForRecoveryToken,
  unwrapVmkFromRecoveryToken,
  generateRecoveryToken,
} = require('../utils/vaultAdmin');

function b64ToBuf(value) {
  if (!value) return null;
  return Buffer.from(value, 'base64');
}

function bufToB64(buf) {
  if (!buf) return null;
  return Buffer.from(buf).toString('base64');
}

function parseUploadedChunks(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === '') return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function timingSafeEqualBuf(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function getProfile(userId) {
  const [rows] = await db.query('SELECT * FROM vault_profile WHERE user_id = ?', [userId]);
  return rows[0] || null;
}

function mapProfileRow(row) {
  if (!row) return null;
  return {
    vaultStatus: row.vault_status,
    quotaBytes: Number(row.quota_bytes) || 0,
    usedBytes: Number(row.used_bytes) || 0,
    maxFileBytes: vaultConfig.maxFileBytes,
    chunkSize: vaultConfig.chunkSize,
  };
}

function mapFileRow(row) {
  return {
    id: row.id,
    encName: bufToB64(row.enc_name),
    encMime: bufToB64(row.enc_mime),
    wrappedFek: bufToB64(row.wrapped_fek),
    sizePlain: Number(row.size_plain) || 0,
    sizeCipher: Number(row.size_cipher) || 0,
    chunkCount: row.chunk_count,
    chunkSize: row.chunk_size,
    createdAt: row.created_at,
  };
}

const getProfileHandler = async (req, res) => {
  try {
    const profile = await getProfile(req.user.userId);
    const [pendingRows] = await db.query(
      `SELECT id FROM vault_recovery_request
       WHERE user_id = ? AND status = 'pending' LIMIT 1`,
      [req.user.userId]
    );
    const [tokenRows] = await db.query(
      `SELECT expires_at FROM vault_recovery_token WHERE user_id = ? AND expires_at > NOW() LIMIT 1`,
      [req.user.userId]
    );
    const base = profile
      ? mapProfileRow(profile)
      : {
          vaultStatus: 'uninitialized',
          quotaBytes: vaultConfig.defaultQuotaBytes,
          usedBytes: 0,
          maxFileBytes: vaultConfig.maxFileBytes,
          chunkSize: vaultConfig.chunkSize,
        };
    return ok(res, {
      ...base,
      hasPendingRecoveryRequest: pendingRows.length > 0,
      canSetNewPassword: profile?.vault_status === 'pending_new_password' && tokenRows.length > 0,
      vaultSalt: profile ? bufToB64(profile.vault_salt) : null,
      wrappedVmk: profile?.wrapped_vmk ? bufToB64(profile.wrapped_vmk) : null,
      kdfParams: profile?.kdf_params
        ? (typeof profile.kdf_params === 'string' ? JSON.parse(profile.kdf_params) : profile.kdf_params)
        : null,
    });
  } catch (error) {
    console.error('vault getProfile error:', error);
    return fail(res, '获取保险库状态失败', 500, 500);
  }
};

const initVault = async (req, res) => {
  try {
    const existing = await getProfile(req.user.userId);
    if (existing) return fail(res, '保险库已开通');

    const {
      vmk,
      wrappedVmk,
      vaultSalt,
      kdfParams,
      keyCheck,
    } = req.body;

    const vmkBuf = b64ToBuf(vmk);
    const wrappedBuf = b64ToBuf(wrappedVmk);
    const saltBuf = b64ToBuf(vaultSalt);
    const keyCheckBuf = b64ToBuf(keyCheck);

    if (!vmkBuf || vmkBuf.length !== 32) return fail(res, 'VMK 无效');
    if (!wrappedBuf || !saltBuf || !keyCheckBuf || !kdfParams) {
      return fail(res, '参数不完整');
    }

    let adminBlob;
    try {
      adminBlob = wrapVmkForAdmin(vmkBuf, req.user.userId);
    } catch (err) {
      return fail(res, err.message || '服务端恢复密钥未配置', 500, 500);
    }

    await db.query(
      `INSERT INTO vault_profile
       (user_id, vault_salt, kdf_params, wrapped_vmk, admin_recovery_blob, key_check, vault_status, quota_bytes)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`,
      [
        req.user.userId,
        saltBuf,
        JSON.stringify(kdfParams),
        wrappedBuf,
        adminBlob,
        keyCheckBuf,
        vaultConfig.defaultQuotaBytes,
      ]
    );

    const sessionToken = signVaultSession(req.user.userId);
    return ok(res, { vaultStatus: 'active', vaultSession: sessionToken }, '保险库已开通');
  } catch (error) {
    console.error('vault init error:', error);
    return fail(res, '开通失败', 500, 500);
  }
};

const unlockCheck = async (req, res) => {
  try {
    const profile = await getProfile(req.user.userId);
    if (!profile) return fail(res, '请先开通保险库', 400, 400);
    if (profile.vault_status === 'pending_new_password') {
      return fail(res, '请先设置新保险柜密码', 403, 403);
    }
    if (profile.vault_status !== 'active' && profile.vault_status !== 'locked') {
      return fail(res, '保险库状态异常', 400, 400);
    }

    const candidate = b64ToBuf(req.body.keyCheckCandidate);
    if (!candidate) return fail(res, '请提供密码校验数据');

    const valid = timingSafeEqualBuf(candidate, profile.key_check);
    if (!valid) return fail(res, '保险柜密码错误', 401, 401);

    await db.query(
      `UPDATE vault_profile SET vault_status = 'active', last_unlocked_at = NOW() WHERE user_id = ?`,
      [req.user.userId]
    );

    const sessionToken = signVaultSession(req.user.userId);
    return ok(res, {
      valid: true,
      vaultSession: sessionToken,
      sessionExpiresIn: vaultConfig.unlockSessionMinutes * 60,
    });
  } catch (error) {
    console.error('vault unlockCheck error:', error);
    return fail(res, '解锁失败', 500, 500);
  }
};

const lockVault = async (_req, res) => ok(res, null, '已锁定');

const listFiles = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
    const offset = (page - 1) * pageSize;

    const [rows] = await db.query(
      `SELECT id, enc_name, enc_mime, wrapped_fek, size_plain, size_cipher, chunk_count, chunk_size, created_at
       FROM vault_file WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [req.user.userId, pageSize, offset]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM vault_file WHERE user_id = ? AND deleted_at IS NULL`,
      [req.user.userId]
    );

    return ok(res, { items: rows.map(mapFileRow), total: Number(total) || 0, page, pageSize });
  } catch (error) {
    console.error('vault listFiles error:', error);
    return fail(res, '获取文件列表失败', 500, 500);
  }
};

const initUpload = async (req, res) => {
  try {
    if (!oss.isOssEnabled()) return fail(res, 'OSS 未配置，无法上传', 500, 500);

    const profile = await getProfile(req.user.userId);
    if (!profile) return fail(res, '请先开通保险库', 400, 400);

    const {
      encName,
      encMime,
      wrappedFek,
      sizePlain,
      chunkCount,
      chunkSize,
      manifestHmac,
    } = req.body;

    const size = Number(sizePlain) || 0;
    const chunks = Number(chunkCount) || 0;
    const cSize = Number(chunkSize) || vaultConfig.chunkSize;

    if (size <= 0 || size > vaultConfig.maxFileBytes) {
      return fail(res, `文件大小无效（最大 ${Math.floor(vaultConfig.maxFileBytes / 1024 / 1024)}MB）`, 400, 400);
    }
    if (chunks <= 0 || chunks > Math.ceil(vaultConfig.maxFileBytes / vaultConfig.chunkSize) + 1) {
      return fail(res, '分块数量无效', 400, 400);
    }
    if (Number(profile.used_bytes) + size > Number(profile.quota_bytes)) {
      return fail(res, '保险库容量不足', 400, 400);
    }

    const uploadId = crypto.randomUUID();
    const storagePrefix = `vault/${req.user.userId}/${uploadId}`;

    const expiresAt = new Date(Date.now() + vaultConfig.uploadSessionHours * 3600 * 1000);

    await db.query(
      `INSERT INTO vault_upload_session
       (id, user_id, storage_key, wrapped_fek, enc_name, enc_mime, size_plain, chunk_count, chunk_size, manifest_hmac, uploaded_chunks, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uploadId,
        req.user.userId,
        storagePrefix,
        b64ToBuf(wrappedFek),
        b64ToBuf(encName),
        b64ToBuf(encMime),
        size,
        chunks,
        cSize,
        b64ToBuf(manifestHmac),
        JSON.stringify([]),
        expiresAt,
      ]
    );

    return ok(res, {
      uploadId,
      storagePrefix,
      chunkCount: chunks,
      chunkSize: cSize,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('vault initUpload error:', error);
    return fail(res, '创建上传任务失败', 500, 500);
  }
};

const uploadChunk = async (req, res) => {
  try {
    if (!oss.isOssEnabled()) return fail(res, 'OSS 未配置', 500, 500);

    const { uploadId } = req.params;
    const index = parseInt(req.query.index, 10);
    if (!Number.isFinite(index) || index < 0) return fail(res, '分块 index 无效', 400, 400);

    const [rows] = await db.query(
      `SELECT * FROM vault_upload_session WHERE id = ? AND user_id = ? AND status = 'pending'`,
      [uploadId, req.user.userId]
    );
    if (!rows.length) return fail(res, '上传任务不存在或已过期', 404, 404);
    const session = rows[0];
    if (new Date(session.expires_at) < new Date()) {
      return fail(res, '上传任务已过期', 400, 400);
    }
    if (index >= session.chunk_count) return fail(res, '分块 index 超出范围', 400, 400);

    const buffer = req.body;
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      return fail(res, '分块数据为空', 400, 400);
    }
    if (buffer.length > vaultConfig.chunkSize + 64) {
      return fail(res, '分块过大', 400, 400);
    }

    const objectKey = `${session.storage_key}/${index}.enc`;
    await oss.uploadBuffer(buffer, objectKey, { contentType: 'application/octet-stream' });

    let uploaded = parseUploadedChunks(session.uploaded_chunks);
    if (!uploaded.includes(index)) uploaded.push(index);
    uploaded.sort((a, b) => a - b);

    await db.query(
      `UPDATE vault_upload_session SET uploaded_chunks = ?, size_cipher = size_cipher + ? WHERE id = ?`,
      [JSON.stringify(uploaded), buffer.length, uploadId]
    );

    return ok(res, { index, uploadedCount: uploaded.length });
  } catch (error) {
    console.error('vault uploadChunk error:', error);
    return fail(res, '上传分块失败', 500, 500);
  }
};

const completeUpload = async (req, res) => {
  try {
    const { uploadId, sizeCipher } = req.body;
    const [rows] = await db.query(
      `SELECT * FROM vault_upload_session WHERE id = ? AND user_id = ? AND status = 'pending'`,
      [uploadId, req.user.userId]
    );
    if (!rows.length) return fail(res, '上传任务不存在', 404, 404);

    const session = rows[0];
    const uploaded = parseUploadedChunks(session.uploaded_chunks);
    if (uploaded.length !== session.chunk_count) {
      return fail(res, `分块未传齐（${uploaded.length}/${session.chunk_count}）`, 400, 400);
    }

    const cipherSize = Number(sizeCipher) || Number(session.size_cipher) || 0;

    const [result] = await db.query(
      `INSERT INTO vault_file
       (user_id, storage_key, wrapped_fek, enc_name, enc_mime, size_plain, size_cipher, chunk_count, chunk_size, manifest_hmac)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.userId,
        session.storage_key,
        session.wrapped_fek,
        session.enc_name,
        session.enc_mime,
        session.size_plain,
        cipherSize,
        session.chunk_count,
        session.chunk_size,
        session.manifest_hmac,
      ]
    );

    await db.query(
      `UPDATE vault_profile SET used_bytes = used_bytes + ? WHERE user_id = ?`,
      [session.size_plain, req.user.userId]
    );

    await db.query(
      `UPDATE vault_upload_session SET status = 'completed' WHERE id = ?`,
      [uploadId]
    );

    return ok(res, {
      file: mapFileRow({
        id: result.insertId,
        enc_name: session.enc_name,
        enc_mime: session.enc_mime,
        size_plain: session.size_plain,
        size_cipher: cipherSize,
        chunk_count: session.chunk_count,
        chunk_size: session.chunk_size,
        created_at: new Date(),
      }),
    }, '上传完成');
  } catch (error) {
    console.error('vault completeUpload error:', error);
    return fail(res, '完成上传失败', 500, 500);
  }
};

const getDownloadChunks = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM vault_file WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [req.params.id, req.user.userId]
    );
    if (!rows.length) return fail(res, '文件不存在', 404, 404);
    const file = rows[0];

    const chunks = [];
    for (let i = 0; i < file.chunk_count; i += 1) {
      chunks.push({ index: i });
    }

    return ok(res, {
      id: file.id,
      chunkCount: file.chunk_count,
      chunkSize: file.chunk_size,
      sizeCipher: Number(file.size_cipher) || 0,
      wrappedFek: bufToB64(file.wrapped_fek),
      encName: bufToB64(file.enc_name),
      encMime: bufToB64(file.enc_mime),
      manifestHmac: bufToB64(file.manifest_hmac),
      chunks,
    });
  } catch (error) {
    console.error('vault getDownloadChunks error:', error);
    return fail(res, '获取下载信息失败', 500, 500);
  }
};

const downloadChunk = async (req, res) => {
  try {
    if (!oss.isOssEnabled()) return fail(res, 'OSS 未配置', 500, 500);

    const index = parseInt(req.params.index, 10);
    if (!Number.isFinite(index) || index < 0) return fail(res, '分块 index 无效', 400, 400);

    const [rows] = await db.query(
      `SELECT storage_key, chunk_count FROM vault_file WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [req.params.id, req.user.userId]
    );
    if (!rows.length) return fail(res, '文件不存在', 404, 404);
    const file = rows[0];
    if (index >= file.chunk_count) return fail(res, '分块不存在', 404, 404);

    const objectKey = oss.buildObjectKey(`${file.storage_key}/${index}.enc`);
    const result = await oss.getClient().get(objectKey);
    res.set('Content-Type', 'application/octet-stream');
    res.send(result.content);
  } catch (error) {
    console.error('vault downloadChunk error:', error);
    return fail(res, '下载分块失败', 500, 500);
  }
};

const deleteFile = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM vault_file WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [req.params.id, req.user.userId]
    );
    if (!rows.length) return fail(res, '文件不存在', 404, 404);
    const file = rows[0];

    for (let i = 0; i < file.chunk_count; i += 1) {
      try {
        await oss.deleteStoredFile(`${file.storage_key}/${i}.enc`);
      } catch (err) {
        console.error('delete chunk failed:', err.message);
      }
    }

    await db.query(
      `UPDATE vault_file SET deleted_at = NOW() WHERE id = ?`,
      [file.id]
    );
    await db.query(
      `UPDATE vault_profile SET used_bytes = GREATEST(0, used_bytes - ?) WHERE user_id = ?`,
      [file.size_plain, req.user.userId]
    );

    return ok(res, null, '已删除');
  } catch (error) {
    console.error('vault deleteFile error:', error);
    return fail(res, '删除失败', 500, 500);
  }
};

const createRecoveryRequest = async (req, res) => {
  try {
    const { message, contact } = req.body;
    if (!message || !String(message).trim()) return fail(res, '请填写申请说明');

    const profile = await getProfile(req.user.userId);
    if (!profile) return fail(res, '请先开通保险库', 400, 400);

    const [pending] = await db.query(
      `SELECT id FROM vault_recovery_request WHERE user_id = ? AND status = 'pending' LIMIT 1`,
      [req.user.userId]
    );
    if (pending.length) return fail(res, '您已有待处理的恢复申请');

    const cooldownDate = new Date(Date.now() - vaultConfig.recoveryCooldownDays * 86400000);
    const [recent] = await db.query(
      `SELECT id FROM vault_recovery_request WHERE user_id = ? AND created_at >= ? LIMIT 1`,
      [req.user.userId, cooldownDate]
    );
    if (recent.length && profile.last_admin_recovery_at) {
      /* allow if no recent approved - simplified: max 3 per 30 days */
    }

    const [result] = await db.query(
      `INSERT INTO vault_recovery_request (user_id, message, contact) VALUES (?, ?, ?)`,
      [req.user.userId, String(message).trim().slice(0, 1000), contact ? String(contact).slice(0, 200) : null]
    );

    return ok(res, { requestId: result.insertId, status: 'pending' }, '申请已提交');
  } catch (error) {
    console.error('vault createRecoveryRequest error:', error);
    return fail(res, '提交失败', 500, 500);
  }
};

const listMyRecoveryRequests = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, message, contact, status, reject_reason, created_at, handled_at
       FROM vault_recovery_request WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
      [req.user.userId]
    );
    return ok(res, rows.map((r) => ({
      id: r.id,
      message: r.message,
      contact: r.contact,
      status: r.status,
      rejectReason: r.reject_reason,
      createdAt: r.created_at,
      handledAt: r.handled_at,
    })));
  } catch (error) {
    return fail(res, '获取申请记录失败', 500, 500);
  }
};

const fetchRecoveryVmk = async (req, res) => {
  try {
    const profile = await getProfile(req.user.userId);
    if (!profile || profile.vault_status !== 'pending_new_password') {
      return fail(res, '当前无需设置新密码', 400, 400);
    }

    const { recoveryToken } = req.body;
    if (!recoveryToken) return fail(res, '请提供恢复令牌');

    const [tokenRows] = await db.query(
      `SELECT * FROM vault_recovery_token WHERE user_id = ? AND expires_at > NOW()`,
      [req.user.userId]
    );
    if (!tokenRows.length) return fail(res, '恢复令牌无效或已过期', 400, 400);

    const tokenRow = tokenRows[0];
    if (tokenRow.token_hash !== hashRecoveryToken(recoveryToken)) {
      return fail(res, '恢复令牌错误', 401, 401);
    }

    const vmk = unwrapVmkFromRecoveryToken(tokenRow.vmk_escrow, recoveryToken);
    return ok(res, { vmk: bufToB64(vmk) });
  } catch (error) {
    console.error('vault fetchRecoveryVmk error:', error);
    return fail(res, '获取恢复数据失败', 500, 500);
  }
};

const completeRecoveryPassword = async (req, res) => {
  try {
    const profile = await getProfile(req.user.userId);
    if (!profile || profile.vault_status !== 'pending_new_password') {
      return fail(res, '当前无需设置新密码', 400, 400);
    }

    const { recoveryToken, wrappedVmk, keyCheck } = req.body;
    if (!recoveryToken || !wrappedVmk || !keyCheck) return fail(res, '参数不完整');

    const [tokenRows] = await db.query(
      `SELECT * FROM vault_recovery_token WHERE user_id = ? AND expires_at > NOW()`,
      [req.user.userId]
    );
    if (!tokenRows.length || tokenRows[0].token_hash !== hashRecoveryToken(recoveryToken)) {
      return fail(res, '恢复令牌无效', 401, 401);
    }

    await db.query(
      `UPDATE vault_profile SET wrapped_vmk = ?, key_check = ?, vault_status = 'active', last_admin_recovery_at = NOW()
       WHERE user_id = ?`,
      [b64ToBuf(wrappedVmk), b64ToBuf(keyCheck), req.user.userId]
    );

    await db.query(`DELETE FROM vault_recovery_token WHERE user_id = ?`, [req.user.userId]);

    const sessionToken = signVaultSession(req.user.userId);
    return ok(res, { vaultStatus: 'active', vaultSession: sessionToken }, '新密码已生效');
  } catch (error) {
    console.error('vault completeRecoveryPassword error:', error);
    return fail(res, '设置新密码失败', 500, 500);
  }
};

const changeVaultPassword = async (req, res) => {
  try {
    const profile = await getProfile(req.user.userId);
    if (!profile) return fail(res, '请先开通保险库', 400, 400);
    if (profile.vault_status === 'pending_new_password') {
      return fail(res, '请先完成密码恢复流程', 400, 400);
    }

    const { keyCheckCandidate, wrappedVmk, keyCheck } = req.body;
    if (!keyCheckCandidate || !wrappedVmk || !keyCheck) return fail(res, '参数不完整');

    const candidate = b64ToBuf(keyCheckCandidate);
    if (!candidate || !timingSafeEqualBuf(candidate, profile.key_check)) {
      return fail(res, '当前保险柜密码错误', 401, 401);
    }

    await db.query(
      `UPDATE vault_profile SET wrapped_vmk = ?, key_check = ?, vault_status = 'active' WHERE user_id = ?`,
      [b64ToBuf(wrappedVmk), b64ToBuf(keyCheck), req.user.userId]
    );

    return ok(res, null, '保险柜密码已修改');
  } catch (error) {
    console.error('changeVaultPassword error:', error);
    return fail(res, '修改密码失败', 500, 500);
  }
};

const getRecoveryBootstrap = async (req, res) => {
  try {
    const profile = await getProfile(req.user.userId);
    if (!profile || profile.vault_status !== 'pending_new_password') {
      return ok(res, { needed: false });
    }
    const [tokenRows] = await db.query(
      `SELECT token_hash, expires_at FROM vault_recovery_token WHERE user_id = ? AND expires_at > NOW()`,
      [req.user.userId]
    );
    return ok(res, {
      needed: true,
      hasValidToken: tokenRows.length > 0,
      expiresAt: tokenRows[0]?.expires_at || null,
      hint: '请使用管理员告知的恢复令牌设置新密码',
    });
  } catch (error) {
    return fail(res, '获取恢复状态失败', 500, 500);
  }
};

module.exports = {
  getProfileHandler,
  initVault,
  unlockCheck,
  lockVault,
  listFiles,
  initUpload,
  uploadChunk,
  completeUpload,
  getDownloadChunks,
  downloadChunk,
  deleteFile,
  createRecoveryRequest,
  listMyRecoveryRequests,
  fetchRecoveryVmk,
  completeRecoveryPassword,
  getRecoveryBootstrap,
  changeVaultPassword,
  getProfile,
};
