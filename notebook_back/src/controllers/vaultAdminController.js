const db = require('../config/db');
const vaultConfig = require('../config/vault');
const { ok, fail } = require('../utils/helpers');
const {
  getProfile,
} = require('./vaultController');
const {
  unwrapVmkFromAdmin,
  generateRecoveryToken,
  hashRecoveryToken,
  wrapVmkForRecoveryToken,
} = require('../utils/vaultAdmin');

const listRecoveryRequests = async (req, res) => {
  try {
    const status = req.query.status;
    let sql = `
      SELECT r.id, r.user_id, r.message, r.contact, r.status, r.admin_note, r.reject_reason,
             r.created_at, r.handled_at, u.username, u.nickname
      FROM vault_recovery_request r
      INNER JOIN core_user u ON u.id = r.user_id`;
    const params = [];
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      sql += ' WHERE r.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY r.created_at DESC LIMIT 100';
    const [rows] = await db.query(sql, params);
    return ok(res, rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      username: r.username,
      nickname: r.nickname,
      message: r.message,
      contact: r.contact,
      status: r.status,
      adminNote: r.admin_note,
      rejectReason: r.reject_reason,
      createdAt: r.created_at,
      handledAt: r.handled_at,
    })));
  } catch (error) {
    console.error('listRecoveryRequests error:', error);
    return fail(res, '获取列表失败', 500, 500);
  }
};

const getRecoveryRequest = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*, u.username, u.nickname, u.created_at AS user_created_at
       FROM vault_recovery_request r
       INNER JOIN core_user u ON u.id = r.user_id
       WHERE r.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return fail(res, '申请不存在', 404, 404);
    const r = rows[0];
    return ok(res, {
      id: r.id,
      userId: r.user_id,
      username: r.username,
      nickname: r.nickname,
      userCreatedAt: r.user_created_at,
      message: r.message,
      contact: r.contact,
      status: r.status,
      adminNote: r.admin_note,
      rejectReason: r.reject_reason,
      createdAt: r.created_at,
      handledAt: r.handled_at,
    });
  } catch (error) {
    return fail(res, '获取详情失败', 500, 500);
  }
};

const approveRecoveryRequest = async (req, res) => {
  try {
    const { adminNote } = req.body;
    const requestId = req.params.id;

    const [reqRows] = await db.query(
      `SELECT * FROM vault_recovery_request WHERE id = ? AND status = 'pending'`,
      [requestId]
    );
    if (!reqRows.length) return fail(res, '申请不存在或已处理', 404, 404);
    const request = reqRows[0];

    const profile = await getProfile(request.user_id);
    if (!profile) return fail(res, '用户未开通保险库', 400, 400);

    let vmk;
    try {
      vmk = unwrapVmkFromAdmin(profile.admin_recovery_blob, request.user_id);
    } catch (err) {
      console.error('unwrap vmk error:', err);
      return fail(res, '恢复密钥解密失败，请检查 VAULT_ADMIN_RECOVERY_KEY', 500, 500);
    }

    const recoveryToken = generateRecoveryToken();
    const tokenHash = hashRecoveryToken(recoveryToken);
    const vmkEscrow = wrapVmkForRecoveryToken(vmk, recoveryToken);
    const expiresAt = new Date(Date.now() + vaultConfig.recoveryTokenHours * 3600 * 1000);

    await db.query(`DELETE FROM vault_recovery_token WHERE user_id = ?`, [request.user_id]);
    await db.query(
      `INSERT INTO vault_recovery_token (user_id, token_hash, vmk_escrow, expires_at) VALUES (?, ?, ?, ?)`,
      [request.user_id, tokenHash, vmkEscrow, expiresAt]
    );

    await db.query(
      `UPDATE vault_profile SET vault_status = 'pending_new_password', wrapped_vmk = NULL WHERE user_id = ?`,
      [request.user_id]
    );

    await db.query(
      `UPDATE vault_recovery_request SET status = 'approved', admin_id = ?, admin_note = ?, handled_at = NOW() WHERE id = ?`,
      [req.admin.id, adminNote ? String(adminNote).slice(0, 1000) : null, requestId]
    );

    await db.query(
      `INSERT INTO vault_admin_audit_log (admin_id, action, target_user_id, request_id, ip, detail)
       VALUES (?, 'approve_recovery', ?, ?, ?, ?)`,
      [
        req.admin.id,
        request.user_id,
        requestId,
        req.ip || null,
        JSON.stringify({ expiresAt: expiresAt.toISOString() }),
      ]
    );

    return ok(res, {
      requestId,
      recoveryToken,
      expiresAt: expiresAt.toISOString(),
      message: '已批准。请将 recoveryToken 安全告知用户，用户需在有效期内设置新密码。',
    }, '已批准恢复');
  } catch (error) {
    console.error('approveRecoveryRequest error:', error);
    return fail(res, '批准失败', 500, 500);
  }
};

const rejectRecoveryRequest = async (req, res) => {
  try {
    const { rejectReason, adminNote } = req.body;
    if (!rejectReason || !String(rejectReason).trim()) {
      return fail(res, '请填写拒绝原因');
    }

    const [reqRows] = await db.query(
      `SELECT * FROM vault_recovery_request WHERE id = ? AND status = 'pending'`,
      [req.params.id]
    );
    if (!reqRows.length) return fail(res, '申请不存在或已处理', 404, 404);
    const request = reqRows[0];

    await db.query(
      `UPDATE vault_recovery_request SET status = 'rejected', admin_id = ?, admin_note = ?, reject_reason = ?, handled_at = NOW() WHERE id = ?`,
      [req.admin.id, adminNote ? String(adminNote).slice(0, 1000) : null, String(rejectReason).trim().slice(0, 500), req.params.id]
    );

    await db.query(
      `INSERT INTO vault_admin_audit_log (admin_id, action, target_user_id, request_id, ip)
       VALUES (?, 'reject_recovery', ?, ?, ?)`,
      [req.admin.id, request.user_id, req.params.id, req.ip || null]
    );

    return ok(res, null, '已拒绝');
  } catch (error) {
    console.error('rejectRecoveryRequest error:', error);
    return fail(res, '拒绝失败', 500, 500);
  }
};

const listAuditLogs = async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT l.id, l.action, l.target_user_id, l.request_id, l.ip, l.created_at, u.username AS admin_username
       FROM vault_admin_audit_log l
       INNER JOIN core_user u ON u.id = l.admin_id
       ORDER BY l.created_at DESC LIMIT 100`
    );
    return ok(res, rows);
  } catch (error) {
    return fail(res, '获取审计日志失败', 500, 500);
  }
};

module.exports = {
  listRecoveryRequests,
  getRecoveryRequest,
  approveRecoveryRequest,
  rejectRecoveryRequest,
  listAuditLogs,
};
