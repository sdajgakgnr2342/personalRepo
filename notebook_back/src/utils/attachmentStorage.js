const path = require('path');
const fs = require('fs');
const uploadConfig = require('../config/upload');
const oss = require('./oss');

const uploadRoot = path.join(__dirname, '../../uploads');

function useOssForAttachments() {
  return uploadConfig.getAttachmentStorageMode() === 'oss' && oss.isOssEnabled();
}

function isLocalAttachmentPath(storedPath) {
  const value = String(storedPath || '');
  return value.startsWith('/uploads/') || value.startsWith('attachments/');
}

function toRelativePath(storedPath) {
  const value = String(storedPath || '');
  if (value.startsWith('/uploads/')) return value.slice('/uploads/'.length);
  return value;
}

function resolveAbsolutePath(storedPath) {
  const rel = toRelativePath(storedPath);
  if (!rel || rel.includes('..')) return null;
  const abs = path.resolve(uploadRoot, rel);
  if (!abs.startsWith(path.resolve(uploadRoot))) return null;
  return abs;
}

function resolvePublicUrl(storedPath) {
  if (!storedPath) return '';
  if (/^https?:\/\//i.test(storedPath)) return storedPath;
  if (isLocalAttachmentPath(storedPath) && !useOssForAttachments()) {
    return storedPath.startsWith('/uploads/') ? storedPath : `/uploads/${storedPath}`;
  }
  return oss.resolvePublicUrl(storedPath);
}

function ensureAttachmentDir(userId, itemId) {
  const dir = path.join(uploadRoot, 'attachments', String(userId), String(itemId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function deleteStoredAttachment(storedPath) {
  if (!storedPath) return;
  if (isLocalAttachmentPath(storedPath) && !useOssForAttachments()) {
    const abs = resolveAbsolutePath(storedPath);
    if (abs && fs.existsSync(abs)) {
      try {
        fs.unlinkSync(abs);
      } catch {
        /* ignore */
      }
    }
    return;
  }
  await oss.deleteStoredFile(storedPath);
}

module.exports = {
  uploadRoot,
  useOssForAttachments,
  isLocalAttachmentPath,
  resolveAbsolutePath,
  resolvePublicUrl,
  ensureAttachmentDir,
  deleteStoredAttachment,
};
