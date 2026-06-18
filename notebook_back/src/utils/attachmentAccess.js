const path = require('path');
const cryptoUtil = require('../utils/crypto');
const oss = require('./oss');
const { decodeUploadFilename } = require('./helpers');

const SIGN_TTL_MS = 60 * 60 * 1000;

function buildSignPayload(attachmentId, userId, shareToken, exp) {
  const uid = userId != null && userId !== '' ? String(userId) : '';
  return `${attachmentId}:${uid}:${shareToken || ''}:${exp}`;
}

function buildSignedAttachmentUrl(attachmentId, { userId = null, shareToken = null } = {}) {
  const exp = Date.now() + SIGN_TTL_MS;
  const sig = cryptoUtil.signRequest(buildSignPayload(attachmentId, userId, shareToken, exp));
  const params = new URLSearchParams({
    exp: String(exp),
    sig,
  });
  if (shareToken) params.set('shareToken', shareToken);
  return `/api/items/attachments/${attachmentId}/file?${params.toString()}`;
}

function verifySignedAttachmentAccess(attachmentId, { userId = null, shareToken = null, exp, sig }) {
  if (!exp || !sig) return false;
  if (Date.now() > Number(exp)) return false;
  const payload = buildSignPayload(attachmentId, userId, shareToken, exp);
  try {
    return cryptoUtil.verifySignature(payload, sig);
  } catch {
    return false;
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getStableContentUrl(filePath) {
  return oss.resolvePublicUrl(filePath);
}

async function rewriteContentAttachmentUrls(db, html, { userId, itemId, shareToken = null } = {}) {
  if (!html || !itemId) return html || '';

  const [rows] = await db.query(
    'SELECT id, file_path FROM nb_attachment WHERE item_id = ? AND user_id = ?',
    [itemId, userId]
  );
  if (!rows.length) return html;

  let result = html;
  for (const row of rows) {
    const signedUrl = buildSignedAttachmentUrl(row.id, { userId, shareToken });
    const stable = getStableContentUrl(row.file_path);
    const filename = path.basename(row.file_path);
    const patterns = [
      new RegExp(`/uploads/${escapeRegExp(filename)}(?:\\?[^"'\\s>]*)?`, 'g'),
      new RegExp(`/api/items/attachments/${row.id}/file[^"'\\s>]*`, 'g'),
    ];
    if (stable.startsWith('http://') || stable.startsWith('https://')) {
      patterns.push(new RegExp(escapeRegExp(stable), 'g'));
    }
    for (const pattern of patterns) {
      result = result.replace(pattern, signedUrl);
    }
  }
  return result;
}

function mapAttachmentRow(row, { userId = null, shareToken = null } = {}) {
  const stableUrl = getStableContentUrl(row.file_path);
  return {
    id: row.id,
    fileName: decodeUploadFilename(row.file_name),
    fileType: row.file_type,
    fileSize: row.file_size,
    url: buildSignedAttachmentUrl(row.id, { userId, shareToken }),
    storagePath: stableUrl,
    createdAt: row.created_at,
  };
}

async function normalizeContentAttachmentUrls(db, html, userId, itemId) {
  if (!html || !itemId) return html || '';

  const [rows] = await db.query(
    'SELECT id, file_path FROM nb_attachment WHERE item_id = ? AND user_id = ?',
    [itemId, userId]
  );
  if (!rows.length) return html;

  let result = html;
  for (const row of rows) {
    const stable = getStableContentUrl(row.file_path);
    const patterns = [
      new RegExp(`/api/items/attachments/${row.id}/file[^"'\\s>]*`, 'g'),
    ];
    if (stable.startsWith('http://') || stable.startsWith('https://')) {
      patterns.push(new RegExp(escapeRegExp(stable), 'g'));
    } else {
      patterns.push(new RegExp(`/uploads/${escapeRegExp(path.basename(row.file_path))}(?:\\?[^"'\\s>]*)?`, 'g'));
    }
    for (const pattern of patterns) {
      result = result.replace(pattern, stable);
    }
  }
  return result;
}

module.exports = {
  buildSignedAttachmentUrl,
  verifySignedAttachmentAccess,
  rewriteContentAttachmentUrls,
  normalizeContentAttachmentUrls,
  mapAttachmentRow,
};
