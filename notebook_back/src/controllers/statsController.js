const db = require('../config/db');
const { ok, fail, buildTreeWithEncryption, ensureRootFolder, getItemEncryptionStatus } = require('../utils/helpers');

async function repairOrphanItems(userId) {
  await db.query(
    `UPDATE nb_item c
     INNER JOIN nb_item p ON c.parent_id = p.id AND c.user_id = p.user_id
     SET c.status = 'trash', c.deleted_at = COALESCE(c.deleted_at, NOW())
     WHERE c.user_id = ? AND c.status != 'trash' AND p.status = 'trash'`,
    [userId]
  );
}

const getStats = async (req, res) => {
  try {
    const userId = req.user.userId;
    await repairOrphanItems(userId);

    const [[noteCount]] = await db.query(
      `SELECT COUNT(*) AS cnt FROM nb_item n
       WHERE n.user_id = ? AND n.item_type = 'note' AND n.status = 'normal' AND n.deleted_at IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM nb_item p
           WHERE p.id = n.parent_id AND p.user_id = n.user_id AND p.status = 'trash'
         )`,
      [userId]
    );

    const [[draftCount]] = await db.query(
      `SELECT COUNT(*) AS cnt FROM nb_item n
       WHERE n.user_id = ? AND n.item_type = 'note' AND n.status = 'draft' AND n.deleted_at IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM nb_item p
           WHERE p.id = n.parent_id AND p.user_id = n.user_id AND p.status = 'trash'
         )`,
      [userId]
    );

    const [recentNotesRows] = await db.query(
      `SELECT n.id, n.name, n.word_count, n.last_saved_at, n.updated_at
       FROM nb_item n
       WHERE n.user_id = ? AND n.item_type = 'note' AND n.status = 'normal'
         AND n.deleted_at IS NULL
         AND n.updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
         AND NOT EXISTS (
           SELECT 1 FROM nb_item p
           WHERE p.id = n.parent_id AND p.user_id = n.user_id AND p.status = 'trash'
         )
       ORDER BY n.updated_at DESC
       LIMIT 50`,
      [userId]
    );

    const recentNotes = [];
    for (const n of recentNotesRows) {
      const encryption = await getItemEncryptionStatus(db, userId, n.id);
      if (encryption.isInEncryptedFolder) continue;
      recentNotes.push({
        id: n.id,
        name: n.name,
        wordCount: n.word_count,
        lastSavedAt: n.last_saved_at,
        updatedAt: n.updated_at,
      });
      if (recentNotes.length >= 10) break;
    }

    return ok(res, {
      noteCount: noteCount.cnt,
      draftCount: draftCount.cnt,
      recentNotes,
    });
  } catch (error) {
    console.error('getStats error:', error);
    return fail(res, '获取统计失败', 500, 500);
  }
};

const getTree = async (req, res) => {
  try {
    const userId = req.user.userId;
    await repairOrphanItems(userId);
    await ensureRootFolder(db, userId);
    const [items] = await db.query(
      `SELECT id, parent_id, name, item_type, is_encrypted, is_favorite, status, is_saved, word_count, sort_order, updated_at
       FROM nb_item
       WHERE user_id = ? AND status = 'normal' AND deleted_at IS NULL
       ORDER BY sort_order ASC, id ASC`,
      [userId]
    );
    return ok(res, await buildTreeWithEncryption(db, userId, items));
  } catch (error) {
    console.error('getTree error:', error);
    return fail(res, '获取目录树失败', 500, 500);
  }
};

const getDrafts = async (req, res) => {
  try {
    const userId = req.user.userId;
    const [rows] = await db.query(
      `SELECT id, name, word_count, updated_at FROM nb_item
       WHERE user_id = ? AND item_type = 'note' AND status = 'draft' AND deleted_at IS NULL
       ORDER BY updated_at DESC`,
      [userId]
    );

    const results = [];
    for (const row of rows) {
      const encryption = await getItemEncryptionStatus(db, userId, row.id);
      if (encryption.isLocked) continue;
      results.push({
        id: row.id,
        name: row.name,
        wordCount: row.word_count,
        updatedAt: row.updated_at,
      });
    }
    return ok(res, results);
  } catch (error) {
    return fail(res, '获取草稿失败', 500, 500);
  }
};

const getFavorites = async (req, res) => {
  try {
    const userId = req.user.userId;
    const [rows] = await db.query(
      `SELECT id, name, word_count, updated_at FROM nb_item
       WHERE user_id = ? AND is_favorite = 1 AND status != 'trash' AND deleted_at IS NULL
       ORDER BY updated_at DESC`,
      [userId]
    );

    const results = [];
    for (const row of rows) {
      const encryption = await getItemEncryptionStatus(db, userId, row.id);
      if (encryption.isLocked) continue;
      results.push({
        id: row.id,
        name: row.name,
        wordCount: row.word_count,
        updatedAt: row.updated_at,
      });
    }
    return ok(res, results);
  } catch (error) {
    return fail(res, '获取收藏失败', 500, 500);
  }
};

const getTrash = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, item_type, deleted_at FROM nb_item
       WHERE user_id = ? AND status = 'trash'
       ORDER BY deleted_at DESC`,
      [req.user.userId]
    );
    return ok(res, rows.map((r) => ({
      id: r.id,
      name: r.name,
      itemType: r.item_type,
      deletedAt: r.deleted_at,
    })));
  } catch (error) {
    return fail(res, '获取垃圾箱失败', 500, 500);
  }
};

module.exports = { getStats, getTree, getDrafts, getFavorites, getTrash };
