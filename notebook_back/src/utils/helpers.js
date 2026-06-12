const cryptoUtil = require('../utils/crypto');

function ok(res, data = null, message = 'success') {
  return res.json({ success: true, code: 0, message, data });
}

function fail(res, message = '操作失败', code = 400, status = 400, data = null) {
  const body = { success: false, code, message };
  if (data != null) body.data = data;
  return res.status(status).json(body);
}

function countWords(text) {
  if (!text) return 0;
  const stripped = text.replace(/\s/g, '');
  return stripped.length;
}

function buildTree(items, parentId = null) {
  return items
    .filter((item) => {
      if (parentId === null) return item.parent_id === null;
      return item.parent_id === parentId;
    })
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
    .map((item) => ({
      id: item.id,
      name: item.name,
      itemType: item.item_type,
      parentId: item.parent_id,
      isEncrypted: !!item.is_encrypted,
      isFavorite: !!item.is_favorite,
      status: item.status,
      isSaved: !!item.is_saved,
      wordCount: item.word_count,
      sortOrder: item.sort_order,
      updatedAt: item.updated_at,
      children: item.item_type === 'folder' ? buildTree(items, item.id) : undefined,
    }));
}

async function buildTreeWithEncryption(db, userId, items, parentId = null) {
  const filtered = items
    .filter((item) => {
      if (parentId === null) return item.parent_id === null;
      return item.parent_id === parentId;
    })
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);

  const nodes = [];
  for (const item of filtered) {
    let isLocked = false;
    if (item.item_type === 'folder' && item.is_encrypted) {
      isLocked = !(await isFolderUnlocked(db, userId, item.id));
    }

    let children;
    if (item.item_type === 'folder') {
      children = item.is_encrypted && isLocked
        ? []
        : await buildTreeWithEncryption(db, userId, items, item.id);
    }

    nodes.push({
      id: item.id,
      name: item.name,
      itemType: item.item_type,
      parentId: item.parent_id,
      isEncrypted: !!item.is_encrypted,
      isLocked,
      isFavorite: !!item.is_favorite,
      status: item.status,
      isSaved: !!item.is_saved,
      wordCount: item.word_count,
      sortOrder: item.sort_order,
      updatedAt: item.updated_at,
      children,
    });
  }
  return nodes;
}

function getBreadcrumb(items, itemId) {
  const map = new Map(items.map((i) => [i.id, i]));
  const parts = [];
  let current = map.get(itemId);
  while (current) {
    parts.unshift(current.name);
    current = current.parent_id ? map.get(current.parent_id) : null;
  }
  return parts.join(' / ');
}

async function isFolderUnlocked(db, userId, folderId) {
  const [rows] = await db.query(
    'SELECT id FROM nb_folder_unlock WHERE user_id = ? AND folder_id = ? AND expires_at > NOW()',
    [userId, folderId]
  );
  return rows.length > 0;
}

async function getEncryptedAncestor(db, userId, itemId) {
  let currentId = itemId;
  const visited = new Set();
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const [rows] = await db.query(
      'SELECT id, parent_id, is_encrypted FROM nb_item WHERE id = ? AND user_id = ?',
      [currentId, userId]
    );
    if (!rows.length) break;
    const item = rows[0];
    if (item.is_encrypted) return item.id;
    currentId = item.parent_id;
  }
  return null;
}

async function getItemEncryptionStatus(db, userId, itemId) {
  const folderId = await getEncryptedAncestor(db, userId, itemId);
  if (!folderId) {
    return { isInEncryptedFolder: false, isLocked: false, folderId: null };
  }
  const unlocked = await isFolderUnlocked(db, userId, folderId);
  return { isInEncryptedFolder: true, isLocked: !unlocked, folderId };
}

async function checkItemAccess(db, userId, item) {
  const encFolderId = await getEncryptedAncestor(db, userId, item.id);
  if (!encFolderId) return { ok: true };
  const unlocked = await isFolderUnlocked(db, userId, encFolderId);
  if (!unlocked) return { ok: false, folderId: encFolderId };
  return { ok: true };
}

async function requireItemAccess(res, db, userId, item, message = '请先解锁加密文件夹') {
  const access = await checkItemAccess(db, userId, item);
  if (!access.ok) {
    fail(res, message, 403, 403, { folderId: access.folderId });
    return false;
  }
  return true;
}

async function isItemInEncryptedFolder(db, userId, itemId) {
  const folderId = await getEncryptedAncestor(db, userId, itemId);
  return !!folderId;
}

function decryptContentIfNeeded(content, encrypted) {
  if (!content) return '';
  if (!encrypted) return content;
  try {
    return cryptoUtil.decrypt(content);
  } catch {
    return content;
  }
}

function encryptContentIfNeeded(content, needEncrypt) {
  if (!content) return null;
  if (!needEncrypt) return content;
  return cryptoUtil.encrypt(content);
}

async function ensureRootFolder(db, userId) {
  const [roots] = await db.query(
    `SELECT id FROM nb_item
     WHERE user_id = ? AND parent_id IS NULL AND name = '我的笔记'
       AND item_type = 'folder' AND status = 'normal' AND deleted_at IS NULL
     LIMIT 1`,
    [userId]
  );

  let rootId;
  if (roots.length) {
    rootId = roots[0].id;
  } else {
    const [result] = await db.query(
      `INSERT INTO nb_item (user_id, parent_id, name, item_type, sort_order)
       VALUES (?, NULL, '我的笔记', 'folder', 0)`,
      [userId]
    );
    rootId = result.insertId;
  }

  await db.query(
    `UPDATE nb_item SET parent_id = ?
     WHERE user_id = ? AND parent_id IS NULL AND id != ?
       AND status != 'trash' AND deleted_at IS NULL`,
    [rootId, userId, rootId]
  );

  return rootId;
}

async function collectDescendantIds(db, userId, rootId) {
  const ids = new Set([rootId]);
  let queue = [rootId];
  while (queue.length) {
    const placeholders = queue.map(() => '?').join(',');
    const [rows] = await db.query(
      `SELECT id FROM nb_item WHERE user_id = ? AND parent_id IN (${placeholders})`,
      [userId, ...queue]
    );
    queue = [];
    for (const row of rows) {
      if (!ids.has(row.id)) {
        ids.add(row.id);
        queue.push(row.id);
      }
    }
  }
  return [...ids];
}

module.exports = {
  ok,
  fail,
  countWords,
  buildTree,
  buildTreeWithEncryption,
  getBreadcrumb,
  isFolderUnlocked,
  getEncryptedAncestor,
  getItemEncryptionStatus,
  checkItemAccess,
  requireItemAccess,
  isItemInEncryptedFolder,
  decryptContentIfNeeded,
  encryptContentIfNeeded,
  collectDescendantIds,
  ensureRootFolder,
};
