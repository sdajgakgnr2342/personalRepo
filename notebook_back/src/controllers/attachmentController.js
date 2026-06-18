const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../config/db');
const uploadConfig = require('../config/upload');
const oss = require('../utils/oss');
const { ok, fail, checkItemAccess, decodeUploadFilename } = require('../utils/helpers');
const {
  mapAttachmentRow,
  verifySignedAttachmentAccess,
} = require('../utils/attachmentAccess');

const uploadDir = path.join(__dirname, '../../uploads');

const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-rar-compressed',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: uploadConfig.maxAttachmentBytes },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  },
});

async function getAttachmentById(id) {
  const [rows] = await db.query('SELECT * FROM nb_attachment WHERE id = ?', [id]);
  return rows[0] || null;
}

async function getNoteItemForAttachment(attachment) {
  const [rows] = await db.query(
    'SELECT * FROM nb_item WHERE id = ? AND deleted_at IS NULL',
    [attachment.item_id]
  );
  return rows[0] || null;
}

async function canAccessNoteItem(userId, item) {
  if (!item || item.item_type !== 'note' || item.user_id !== userId) return false;
  const access = await checkItemAccess(db, userId, item);
  return access.ok;
}

async function requireNoteAccess(res, userId, item) {
  if (!item || item.item_type !== 'note') {
    fail(res, '笔记不存在', 404, 404);
    return false;
  }
  if (item.user_id !== userId) {
    fail(res, '无权访问', 403, 403);
    return false;
  }
  const access = await checkItemAccess(db, userId, item);
  if (!access.ok) {
    fail(res, '请先解锁加密文件夹', 403, 403, { folderId: access.folderId });
    return false;
  }
  return true;
}

function sendLocalFile(res, attachment) {
  const filePath = path.join(uploadDir, path.basename(attachment.file_path));
  if (!fs.existsSync(filePath)) return fail(res, '文件不存在', 404, 404);

  res.setHeader('Content-Type', attachment.file_type || 'application/octet-stream');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${encodeURIComponent(decodeUploadFilename(attachment.file_name))}"`
  );
  return res.sendFile(filePath);
}

const downloadAttachment = async (req, res) => {
  try {
    const attachment = await getAttachmentById(req.params.id);
    if (!attachment) return fail(res, '附件不存在', 404, 404);

    const item = await getNoteItemForAttachment(attachment);
    if (!item) return fail(res, '附件不存在', 404, 404);

    const { exp, sig, shareToken } = req.query;
    let authorized = false;

    if (exp && sig) {
      if (shareToken) {
        authorized = verifySignedAttachmentAccess(attachment.id, {
          userId: attachment.user_id,
          shareToken,
          exp,
          sig,
        });
        if (authorized) {
          const [shareRows] = await db.query(
            `SELECT id FROM nb_item
             WHERE id = ? AND share_token = ? AND item_type = 'note' AND is_saved = 1`,
            [item.id, shareToken]
          );
          authorized = shareRows.length > 0;
        }
      } else {
        authorized = verifySignedAttachmentAccess(attachment.id, {
          userId: attachment.user_id,
          exp,
          sig,
        });
        if (authorized) {
          authorized = await canAccessNoteItem(attachment.user_id, item);
        }
      }
    } else if (req.user?.userId) {
      authorized =
        attachment.user_id === req.user.userId &&
        await canAccessNoteItem(req.user.userId, item);
    }

    if (!authorized) return fail(res, '无权访问附件', 403, 403);

    const publicUrl = oss.resolvePublicUrl(attachment.file_path);
    if (publicUrl.startsWith('http://') || publicUrl.startsWith('https://')) {
      return res.redirect(publicUrl);
    }

    return sendLocalFile(res, attachment);
  } catch (error) {
    console.error('downloadAttachment error:', error);
    return fail(res, '下载失败', 500, 500);
  }
};

const uploadAttachment = [
  upload.single('file'),
  (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return fail(res, `文件大小超出限制（最大 ${uploadConfig.maxAttachmentLabel}）`, 400, 400);
      }
      return fail(res, err.message || '上传失败', 400, 400);
    }
    if (err) return next(err);
    return next();
  },
  async (req, res) => {
    try {
      if (!req.file) return fail(res, '请选择文件');
      if (!oss.isOssEnabled()) return fail(res, 'OSS 未配置，无法上传文件', 500, 500);

      const itemId = req.params.id;
      const [items] = await db.query(
        'SELECT * FROM nb_item WHERE id = ? AND user_id = ? AND item_type = ?',
        [itemId, req.user.userId, 'note']
      );
      if (!items.length) return fail(res, '笔记不存在', 404, 404);
      if (!(await requireNoteAccess(res, req.user.userId, items[0]))) return;

      const fileName = decodeUploadFilename(req.file.originalname);

      const objectKey = oss.generateObjectKey(
        `attachments/${req.user.userId}/${itemId}`,
        fileName
      );
      const uploaded = await oss.uploadBuffer(req.file.buffer, objectKey, {
        contentType: req.file.mimetype,
      });

      const [result] = await db.query(
        `INSERT INTO nb_attachment (item_id, user_id, file_name, file_path, file_type, file_size)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          itemId,
          req.user.userId,
          fileName,
          uploaded.objectKey,
          req.file.mimetype,
          req.file.size,
        ]
      );

      const row = {
        id: result.insertId,
        file_name: fileName,
        file_type: req.file.mimetype,
        file_size: req.file.size,
        file_path: uploaded.objectKey,
        created_at: new Date(),
      };

      const mapped = mapAttachmentRow(row, { userId: req.user.userId });
      return ok(res, mapped, '上传成功');
    } catch (error) {
      console.error('uploadAttachment error:', error);
      if (error.message === '不支持的文件类型') {
        return fail(res, error.message, 400, 400);
      }
      return fail(res, '上传失败', 500, 500);
    }
  },
];

const listAttachments = async (req, res) => {
  try {
    const itemId = req.params.id;
    const [items] = await db.query(
      'SELECT * FROM nb_item WHERE id = ? AND user_id = ? AND item_type = ?',
      [itemId, req.user.userId, 'note']
    );
    if (!items.length) return fail(res, '笔记不存在', 404, 404);
    if (!(await requireNoteAccess(res, req.user.userId, items[0]))) return;

    const [rows] = await db.query(
      `SELECT id, file_name, file_type, file_size, file_path, created_at
       FROM nb_attachment WHERE item_id = ? AND user_id = ?`,
      [itemId, req.user.userId]
    );
    return ok(res, rows.map((row) => mapAttachmentRow(row, { userId: req.user.userId })));
  } catch (error) {
    return fail(res, '获取附件失败', 500, 500);
  }
};

const deleteAttachment = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM nb_attachment WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );
    if (!rows.length) return fail(res, '附件不存在', 404, 404);

    const item = await getNoteItemForAttachment(rows[0]);
    if (!item || !(await requireNoteAccess(res, req.user.userId, item))) return;

    await oss.deleteStoredFile(rows[0].file_path);
    await db.query('DELETE FROM nb_attachment WHERE id = ?', [req.params.id]);
    return ok(res, null, '已删除');
  } catch (error) {
    return fail(res, '删除失败', 500, 500);
  }
};

module.exports = { uploadAttachment, listAttachments, deleteAttachment, downloadAttachment };
