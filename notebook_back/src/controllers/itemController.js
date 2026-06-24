const db = require('../config/db');
const cryptoUtil = require('../utils/crypto');
const {
  ok, fail, countWords, getBreadcrumb,
  isFolderUnlocked, getEncryptedAncestor,
  decryptContentIfNeeded, encryptContentIfNeeded,
  collectDescendantIds, ensureRootFolder,
  checkItemAccess, isItemInEncryptedFolder, requireItemAccess,
  getItemEncryptionStatus,
} = require('../utils/helpers');
const { sanitizeNoteHtml } = require('../utils/sanitizeHtml');
const {
  rewriteContentAttachmentUrls,
  normalizeContentAttachmentUrls,
} = require('../utils/attachmentAccess');

async function getItemOrFail(userId, itemId) {
  const [rows] = await db.query(
    'SELECT * FROM nb_item WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
    [itemId, userId]
  );
  return rows[0] || null;
}

async function prepareNoteContent(html, userId, itemId, { shareToken = null } = {}) {
  if (!html) return '';
  const rewritten = await rewriteContentAttachmentUrls(db, html, { userId, itemId, shareToken });
  return sanitizeNoteHtml(rewritten);
}

async function storeNoteContent(html, userId, itemId) {
  if (html === undefined || html === null) return html;
  const normalized = await normalizeContentAttachmentUrls(db, html, userId, itemId);
  return sanitizeNoteHtml(normalized);
}

async function getEncryptedFoldersInIds(userId, ids) {
  if (!ids.length) return [];
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await db.query(
    `SELECT id, name, folder_password_hash FROM nb_item
     WHERE user_id = ? AND id IN (${placeholders})
       AND item_type = 'folder' AND is_encrypted = 1`,
    [userId, ...ids]
  );
  return rows;
}

async function verifyEncryptedFolderPasswords(res, encryptedFolders, passwords = {}) {
  for (const folder of encryptedFolders) {
    const pwd = passwords[folder.id] ?? passwords[String(folder.id)];
    if (!pwd) {
      fail(res, `删除加密文件夹「${folder.name}」需要输入密码`);
      return false;
    }
    const valid = await cryptoUtil.verifyPassword(pwd, folder.folder_password_hash);
    if (!valid) {
      fail(res, `文件夹「${folder.name}」密码错误`, 403, 403);
      return false;
    }
  }
  return true;
}

const getItem = async (req, res) => {
  try {
    const item = await getItemOrFail(req.user.userId, req.params.id);
    if (!item) return fail(res, '笔记不存在', 404, 404);

    const access = await checkItemAccess(db, req.user.userId, item);
    if (!access.ok) {
      return fail(res, '该内容位于加密文件夹中，请先输入密码解锁', 403, 403, {
        folderId: access.folderId,
      });
    }

    const encFolderId = await getEncryptedAncestor(db, req.user.userId, item.id);
    let content = item.item_type === 'note'
      ? decryptContentIfNeeded(item.content, !!encFolderId)
      : null;
    if (item.item_type === 'note') {
      content = await prepareNoteContent(content, req.user.userId, item.id);
    }

    const [allItems] = await db.query(
      'SELECT id, parent_id, name FROM nb_item WHERE user_id = ? AND deleted_at IS NULL',
      [req.user.userId]
    );

    return ok(res, {
      id: item.id,
      name: item.name,
      itemType: item.item_type,
      parentId: item.parent_id,
      content,
      isEncrypted: !!item.is_encrypted,
      isFavorite: !!item.is_favorite,
      status: item.status,
      isSaved: !!item.is_saved,
      wordCount: item.word_count,
      shareToken: item.share_token,
      lastSavedAt: item.last_saved_at,
      updatedAt: item.updated_at,
      breadcrumb: getBreadcrumb(allItems, item.id),
    });
  } catch (error) {
    console.error('getItem error:', error);
    return fail(res, '获取笔记失败', 500, 500);
  }
};

const createFolder = async (req, res) => {
  try {
    const { name, parentId, isEncrypted, password } = req.body;
    if (!name?.trim()) return fail(res, '文件夹名称不能为空');

    const userId = req.user.userId;
    let resolvedParentId = parentId || null;
    if (!resolvedParentId) {
      resolvedParentId = await ensureRootFolder(db, userId);
    } else {
      const parent = await getItemOrFail(userId, resolvedParentId);
      if (!parent || parent.item_type !== 'folder') return fail(res, '父文件夹不存在');
      const access = await checkItemAccess(db, userId, parent);
      if (!access.ok) return fail(res, '目标文件夹已加密，请先解锁', 403, 403);
    }

    let folderPasswordHash = null;
    if (isEncrypted) {
      if (!password || password.length < 6) return fail(res, '加密文件夹密码至少6位');
      folderPasswordHash = await cryptoUtil.hashPassword(password);
    }

    const [result] = await db.query(
      `INSERT INTO nb_item (user_id, parent_id, name, item_type, is_encrypted, folder_password_hash)
       VALUES (?, ?, ?, 'folder', ?, ?)`,
      [userId, resolvedParentId, name.trim(), isEncrypted ? 1 : 0, folderPasswordHash]
    );

    return ok(res, { id: result.insertId, name: name.trim(), itemType: 'folder', isEncrypted: !!isEncrypted }, '文件夹创建成功');
  } catch (error) {
    console.error('createFolder error:', error);
    return fail(res, '创建文件夹失败', 500, 500);
  }
};

const createNote = async (req, res) => {
  try {
    const { name, parentId, status = 'normal' } = req.body;
    if (!name?.trim()) return fail(res, '笔记标题不能为空');

    const userId = req.user.userId;
    let resolvedParentId = parentId || null;
    if (!resolvedParentId) {
      resolvedParentId = await ensureRootFolder(db, userId);
    } else {
      const parent = await getItemOrFail(userId, resolvedParentId);
      if (!parent || parent.item_type !== 'folder') return fail(res, '父文件夹不存在');
      const access = await checkItemAccess(db, userId, parent);
      if (!access.ok) return fail(res, '目标文件夹已加密，请先解锁', 403, 403);
    }

    const [result] = await db.query(
      `INSERT INTO nb_item (user_id, parent_id, name, item_type, status, content, word_count)
       VALUES (?, ?, ?, 'note', ?, '', 0)`,
      [userId, resolvedParentId, name.trim(), status]
    );

    return ok(res, { id: result.insertId, name: name.trim(), itemType: 'note', status }, '笔记创建成功');
  } catch (error) {
    console.error('createNote error:', error);
    return fail(res, '创建笔记失败', 500, 500);
  }
};

const updateItem = async (req, res) => {
  try {
    const item = await getItemOrFail(req.user.userId, req.params.id);
    if (!item) return fail(res, '项目不存在', 404, 404);

    const access = await checkItemAccess(db, req.user.userId, item);
    if (!access.ok) return fail(res, '请先解锁加密文件夹', 403, 403);

    const { name, content, status } = req.body;
    const encFolderId = await getEncryptedAncestor(db, req.user.userId, item.id);
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name.trim());
    }

    if (content !== undefined && item.item_type === 'note') {
      const normalized = await storeNoteContent(content, req.user.userId, item.id);
      const encrypted = encryptContentIfNeeded(normalized, !!encFolderId);
      updates.push('content = ?', 'word_count = ?');
      params.push(encrypted, countWords(normalized));
    }

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    if (!updates.length) return fail(res, '没有可更新的内容');

    updates.push('updated_at = NOW()');
    params.push(item.id, req.user.userId);

    await db.query(`UPDATE nb_item SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, params);

    return ok(res, null, '更新成功');
  } catch (error) {
    console.error('updateItem error:', error);
    return fail(res, '更新失败', 500, 500);
  }
};

const saveNote = async (req, res) => {
  try {
    const item = await getItemOrFail(req.user.userId, req.params.id);
    if (!item || item.item_type !== 'note') return fail(res, '笔记不存在', 404, 404);

    const access = await checkItemAccess(db, req.user.userId, item);
    if (!access.ok) return fail(res, '请先解锁加密文件夹', 403, 403);

    const { name, content, status } = req.body;
    const encFolderId = await getEncryptedAncestor(db, req.user.userId, item.id);
    let finalContent = content !== undefined
      ? await storeNoteContent(content, req.user.userId, item.id)
      : decryptContentIfNeeded(item.content, !!encFolderId);
    const finalName = name !== undefined ? name.trim() : item.name;
    const encrypted = encryptContentIfNeeded(finalContent, !!encFolderId);
    const wordCount = countWords(finalContent);
    const finalStatus = status || (item.status === 'draft' ? 'normal' : item.status);

    await db.query(
      `UPDATE nb_item SET name = ?, content = ?, word_count = ?, status = ?,
       is_saved = 1, last_saved_at = NOW(), updated_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [finalName, encrypted, wordCount, finalStatus, item.id, req.user.userId]
    );

    return ok(res, { wordCount, lastSavedAt: new Date(), isSaved: true }, '保存成功');
  } catch (error) {
    console.error('saveNote error:', error);
    return fail(res, '保存失败', 500, 500);
  }
};

const toggleFavorite = async (req, res) => {
  try {
    const item = await getItemOrFail(req.user.userId, req.params.id);
    if (!item) return fail(res, '项目不存在', 404, 404);

    if (!(await requireItemAccess(res, db, req.user.userId, item, '该内容位于加密文件夹中，请先解锁后再收藏'))) return;

    const newVal = item.is_favorite ? 0 : 1;
    await db.query('UPDATE nb_item SET is_favorite = ? WHERE id = ?', [newVal, item.id]);
    return ok(res, { isFavorite: !!newVal });
  } catch (error) {
    return fail(res, '操作失败', 500, 500);
  }
};

const moveToTrash = async (req, res) => {
  try {
    const userId = req.user.userId;
    const item = await getItemOrFail(userId, req.params.id);
    if (!item) return fail(res, '项目不存在', 404, 404);

    if (!(await requireItemAccess(res, db, userId, item, '该内容位于加密文件夹中，请先解锁后再删除'))) return;

    const ids = await collectDescendantIds(db, userId, item.id);
    const encryptedFolders = await getEncryptedFoldersInIds(userId, ids);
    if (encryptedFolders.length) {
      const verified = await verifyEncryptedFolderPasswords(res, encryptedFolders, req.body?.passwords);
      if (!verified) return;
    }

    const placeholders = ids.map(() => '?').join(',');
    await db.query(
      `UPDATE nb_item SET status = 'trash', deleted_at = NOW()
       WHERE user_id = ? AND id IN (${placeholders})`,
      [userId, ...ids]
    );
    return ok(res, { count: ids.length }, '已移入垃圾箱');
  } catch (error) {
    console.error('moveToTrash error:', error);
    return fail(res, '删除失败', 500, 500);
  }
};

const restoreItem = async (req, res) => {
  try {
    const userId = req.user.userId;
    const [rows] = await db.query(
      'SELECT * FROM nb_item WHERE id = ? AND user_id = ? AND status = ?',
      [req.params.id, userId, 'trash']
    );
    if (!rows.length) return fail(res, '项目不存在', 404, 404);

    const item = rows[0];
    if (item.parent_id) {
      const [parentRows] = await db.query(
        'SELECT status FROM nb_item WHERE id = ? AND user_id = ?',
        [item.parent_id, userId]
      );
      if (parentRows.length && parentRows[0].status === 'trash') {
        return fail(res, '请先恢复其所在的父文件夹', 400, 400);
      }
    }

    const ids = await collectDescendantIds(db, userId, req.params.id);
    const trashIds = [];
    for (const id of ids) {
      const [r] = await db.query(
        'SELECT id FROM nb_item WHERE id = ? AND user_id = ? AND status = ?',
        [id, userId, 'trash']
      );
      if (r.length) trashIds.push(id);
    }

    if (trashIds.length) {
      const placeholders = trashIds.map(() => '?').join(',');
      await db.query(
        `UPDATE nb_item SET status = 'normal', deleted_at = NULL
         WHERE user_id = ? AND id IN (${placeholders})`,
        [userId, ...trashIds]
      );
    }
    return ok(res, null, '已恢复');
  } catch (error) {
    return fail(res, '恢复失败', 500, 500);
  }
};

const permanentDelete = async (req, res) => {
  try {
    const userId = req.user.userId;
    const [rows] = await db.query(
      'SELECT id FROM nb_item WHERE id = ? AND user_id = ? AND status = ?',
      [req.params.id, userId, 'trash']
    );
    if (!rows.length) return fail(res, '项目不存在', 404, 404);

    const ids = await collectDescendantIds(db, userId, req.params.id);
    const encryptedFolders = await getEncryptedFoldersInIds(userId, ids);
    if (encryptedFolders.length) {
      const verified = await verifyEncryptedFolderPasswords(res, encryptedFolders, req.body?.passwords);
      if (!verified) return;
    }

    const placeholders = ids.map(() => '?').join(',');
    await db.query(
      `DELETE FROM nb_item WHERE user_id = ? AND id IN (${placeholders}) AND status = 'trash'`,
      [userId, ...ids]
    );
    return ok(res, null, '已永久删除');
  } catch (error) {
    return fail(res, '删除失败', 500, 500);
  }
};

const unlockFolder = async (req, res) => {
  try {
    const folder = await getItemOrFail(req.user.userId, req.params.id);
    if (!folder || folder.item_type !== 'folder' || !folder.is_encrypted) {
      return fail(res, '文件夹不存在或未加密');
    }

    const { password } = req.body;
    if (!password) return fail(res, '请输入密码');

    const valid = await cryptoUtil.verifyPassword(password, folder.folder_password_hash);
    if (!valid) return fail(res, '密码错误', 403, 403);

    const unlockToken = cryptoUtil.randomBytes(16);
    const unlockMinutes = parseInt(process.env.FOLDER_UNLOCK_MINUTES, 10) || 5;
    const expiresAt = new Date(Date.now() + unlockMinutes * 60 * 1000);

    await db.query(
      `INSERT INTO nb_folder_unlock (user_id, folder_id, unlock_token, expires_at)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE unlock_token = VALUES(unlock_token), expires_at = VALUES(expires_at)`,
      [req.user.userId, folder.id, unlockToken, expiresAt]
    );

    return ok(res, { folderId: folder.id, expiresAt, unlockMinutes }, '解锁成功');
  } catch (error) {
    console.error('unlockFolder error:', error);
    return fail(res, '解锁失败', 500, 500);
  }
};

const shareNote = async (req, res) => {
  try {
    const item = await getItemOrFail(req.user.userId, req.params.id);
    if (!item || item.item_type !== 'note') return fail(res, '笔记不存在', 404, 404);
    if (!item.is_saved) return fail(res, '请先保存笔记后再分享');

    const access = await checkItemAccess(db, req.user.userId, item);
    if (!access.ok) return fail(res, '请先解锁加密文件夹后再分享', 403, 403);

    const inEncryptedFolder = await isItemInEncryptedFolder(db, req.user.userId, item.id);
    if (inEncryptedFolder) {
      return fail(res, '加密文件夹内的笔记不支持分享', 403, 403);
    }

    let token = item.share_token;
    if (!token) {
      token = cryptoUtil.randomBytes(16);
      await db.query('UPDATE nb_item SET share_token = ? WHERE id = ?', [token, item.id]);
    }

    return ok(res, { shareToken: token, shareUrl: `/share/${token}` });
  } catch (error) {
    return fail(res, '分享失败', 500, 500);
  }
};

const getSharedNote = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT i.id, i.user_id, i.name, i.content, i.word_count, i.last_saved_at, u.nickname
       FROM nb_item i JOIN core_user u ON i.user_id = u.id
       WHERE i.share_token = ? AND i.item_type = 'note' AND i.is_saved = 1`,
      [req.params.token]
    );
    if (!rows.length) return fail(res, '分享不存在或已失效', 404, 404);

    const note = rows[0];
    const inEncryptedFolder = await isItemInEncryptedFolder(db, note.user_id, note.id);
    if (inEncryptedFolder) return fail(res, '分享不存在或已失效', 404, 404);

    const content = await prepareNoteContent(note.content || '', note.user_id, note.id, {
      shareToken: req.params.token,
    });

    return ok(res, {
      name: note.name,
      content,
      wordCount: note.word_count,
      lastSavedAt: note.last_saved_at,
      author: note.nickname,
    });
  } catch (error) {
    return fail(res, '获取分享失败', 500, 500);
  }
};

const searchNotes = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q?.trim()) return ok(res, []);

    const keyword = `%${q.trim()}%`;
    const [rows] = await db.query(
      `SELECT id, name, status, word_count, updated_at
       FROM nb_item
       WHERE user_id = ? AND item_type = 'note' AND status != 'trash' AND deleted_at IS NULL
         AND (name LIKE ? OR content LIKE ?)
       ORDER BY updated_at DESC LIMIT 50`,
      [req.user.userId, keyword, keyword]
    );

    const results = [];
    for (const row of rows) {
      const encryption = await getItemEncryptionStatus(db, req.user.userId, row.id);
      if (encryption.isLocked) continue;
      results.push({
        id: row.id,
        name: row.name,
        status: row.status,
        wordCount: row.word_count,
        updatedAt: row.updated_at,
      });
      if (results.length >= 20) break;
    }
    return ok(res, results);
  } catch (error) {
    return fail(res, '搜索失败', 500, 500);
  }
};

const getEncryptedFoldersInSubtree = async (req, res) => {
  try {
    const userId = req.user.userId;
    const [rows] = await db.query(
      'SELECT id FROM nb_item WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );
    if (!rows.length) return fail(res, '项目不存在', 404, 404);

    const ids = await collectDescendantIds(db, userId, req.params.id);
    const folders = await getEncryptedFoldersInIds(userId, ids);
    return ok(res, folders.map((f) => ({ id: f.id, name: f.name })));
  } catch (error) {
    return fail(res, '获取加密文件夹信息失败', 500, 500);
  }
};

async function verifyLoginPassword(userId, loginPassword) {
  const [rows] = await db.query('SELECT password FROM core_user WHERE id = ?', [userId]);
  if (!rows.length) return false;
  return cryptoUtil.verifyPassword(loginPassword, rows[0].password);
}

const listMyEncryptedFolders = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, parent_id, updated_at
       FROM nb_item
       WHERE user_id = ? AND item_type = 'folder' AND is_encrypted = 1
         AND status != 'trash' AND deleted_at IS NULL
       ORDER BY name ASC`,
      [req.user.userId]
    );
    return ok(res, rows.map((r) => ({
      id: r.id,
      name: r.name,
      parentId: r.parent_id,
      updatedAt: r.updated_at,
    })));
  } catch (error) {
    console.error('listMyEncryptedFolders error:', error);
    return fail(res, '获取加密文件夹失败', 500, 500);
  }
};

const changeFolderPassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return fail(res, '请填写完整密码信息');
    if (newPassword.length < 6) return fail(res, '新密码至少6位');

    const folder = await getItemOrFail(req.user.userId, req.params.id);
    if (!folder || folder.item_type !== 'folder' || !folder.is_encrypted) {
      return fail(res, '加密文件夹不存在', 404, 404);
    }

    const valid = await cryptoUtil.verifyPassword(oldPassword, folder.folder_password_hash);
    if (!valid) return fail(res, '当前文件夹密码错误', 401, 401);

    const hashed = await cryptoUtil.hashPassword(newPassword);
    await db.query('UPDATE nb_item SET folder_password_hash = ? WHERE id = ?', [hashed, folder.id]);
    await db.query('DELETE FROM nb_folder_unlock WHERE user_id = ? AND folder_id = ?', [req.user.userId, folder.id]);

    return ok(res, null, '文件夹密码已修改');
  } catch (error) {
    console.error('changeFolderPassword error:', error);
    return fail(res, '修改密码失败', 500, 500);
  }
};

const resetFolderPasswordForgotten = async (req, res) => {
  try {
    const { loginPassword, newPassword } = req.body;
    if (!loginPassword || !newPassword) return fail(res, '请填写完整密码信息');
    if (newPassword.length < 6) return fail(res, '新密码至少6位');

    const loginValid = await verifyLoginPassword(req.user.userId, loginPassword);
    if (!loginValid) return fail(res, '登录密码错误', 401, 401);

    const folder = await getItemOrFail(req.user.userId, req.params.id);
    if (!folder || folder.item_type !== 'folder' || !folder.is_encrypted) {
      return fail(res, '加密文件夹不存在', 404, 404);
    }

    const hashed = await cryptoUtil.hashPassword(newPassword);
    await db.query('UPDATE nb_item SET folder_password_hash = ? WHERE id = ?', [hashed, folder.id]);
    await db.query('DELETE FROM nb_folder_unlock WHERE user_id = ? AND folder_id = ?', [req.user.userId, folder.id]);

    return ok(res, null, '文件夹密码已重置');
  } catch (error) {
    console.error('resetFolderPasswordForgotten error:', error);
    return fail(res, '重置密码失败', 500, 500);
  }
};

module.exports = {
  getItem,
  createFolder,
  createNote,
  updateItem,
  saveNote,
  toggleFavorite,
  moveToTrash,
  restoreItem,
  permanentDelete,
  unlockFolder,
  shareNote,
  getSharedNote,
  searchNotes,
  getEncryptedFoldersInSubtree,
  listMyEncryptedFolders,
  changeFolderPassword,
  resetFolderPasswordForgotten,
};
