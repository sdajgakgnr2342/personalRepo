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

const NOT_IN_TRASH = `NOT EXISTS (
  SELECT 1 FROM nb_item p
  WHERE p.id = n.parent_id AND p.user_id = n.user_id AND p.status = 'trash'
)`;

function formatDayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildLast7DaySeries(rows) {
  const map = new Map();
  for (const row of rows) {
    const day = row.day instanceof Date ? formatDayKey(row.day) : String(row.day).slice(0, 10);
    map.set(day, Number(row.cnt) || 0);
  }
  const series = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    series.push(map.get(formatDayKey(d)) || 0);
  }
  return series;
}

async function countNotes(userId, { status, dateField, startDays, endDays } = {}) {
  let sql = `SELECT COUNT(*) AS cnt FROM nb_item n
    WHERE n.user_id = ? AND n.item_type = 'note' AND n.deleted_at IS NULL AND ${NOT_IN_TRASH}`;
  const params = [userId];
  if (status) {
    sql += ' AND n.status = ?';
    params.push(status);
  }
  if (dateField && startDays != null) {
    if (endDays != null) {
      sql += ` AND n.${dateField} >= DATE_SUB(NOW(), INTERVAL ? DAY) AND n.${dateField} < DATE_SUB(NOW(), INTERVAL ? DAY)`;
      params.push(startDays, endDays);
    } else {
      sql += ` AND n.${dateField} >= DATE_SUB(NOW(), INTERVAL ? DAY)`;
      params.push(startDays);
    }
  }
  const [[row]] = await db.query(sql, params);
  return row.cnt;
}

async function queryDailySeries(userId, { status, dateField = 'updated_at' } = {}) {
  let sql = `SELECT DATE(n.${dateField}) AS day, COUNT(*) AS cnt FROM nb_item n
    WHERE n.user_id = ? AND n.item_type = 'note' AND n.deleted_at IS NULL AND ${NOT_IN_TRASH}
      AND n.${dateField} >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)`;
  const params = [userId];
  if (status) {
    sql += ' AND n.status = ?';
    params.push(status);
  }
  sql += ` GROUP BY DATE(n.${dateField}) ORDER BY day ASC`;
  const [rows] = await db.query(sql, params);
  return buildLast7DaySeries(rows);
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
        status: 'normal',
      });
      if (recentNotes.length >= 10) break;
    }

    const [
      updatesThisWeek,
      newNotesThisWeek,
      draftUpdatesThisWeek,
      draftUpdatesLastWeek,
      updatesLastWeek,
      noteDailyTrend,
      draftDailyTrend,
      updateDailyTrend,
    ] = await Promise.all([
      countNotes(userId, { status: 'normal', dateField: 'updated_at', startDays: 7 }),
      countNotes(userId, { status: 'normal', dateField: 'created_at', startDays: 7 }),
      countNotes(userId, { status: 'draft', dateField: 'updated_at', startDays: 7 }),
      countNotes(userId, { status: 'draft', dateField: 'updated_at', startDays: 14, endDays: 7 }),
      countNotes(userId, { status: 'normal', dateField: 'updated_at', startDays: 14, endDays: 7 }),
      queryDailySeries(userId, { status: 'normal', dateField: 'created_at' }),
      queryDailySeries(userId, { status: 'draft', dateField: 'updated_at' }),
      queryDailySeries(userId, { status: 'normal', dateField: 'updated_at' }),
    ]);

    return ok(res, {
      noteCount: noteCount.cnt,
      draftCount: draftCount.cnt,
      weeklyUpdateCount: updatesThisWeek,
      recentNotes,
      trends: {
        notes: noteDailyTrend,
        drafts: draftDailyTrend,
        updates: updateDailyTrend,
      },
      deltas: {
        noteCount: newNotesThisWeek,
        draftCount: draftUpdatesThisWeek - draftUpdatesLastWeek,
        weeklyUpdates: updatesThisWeek - updatesLastWeek,
      },
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
