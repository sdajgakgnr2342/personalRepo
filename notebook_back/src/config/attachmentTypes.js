const path = require('path');

/** @type {Record<string, string>} */
const EXTENSION_TO_MIME = {
  // 压缩包
  '.zip': 'application/zip',
  '.rar': 'application/vnd.rar',
  '.7z': 'application/x-7z-compressed',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
  '.bz2': 'application/x-bzip2',
  '.xz': 'application/x-xz',
  '.tgz': 'application/gzip',
  '.tbz2': 'application/x-bzip2',
  // 文档
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.rtf': 'application/rtf',
  '.odt': 'application/vnd.oasis.opendocument.text',
  '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
  '.odp': 'application/vnd.oasis.opendocument.presentation',
  '.csv': 'text/csv',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.epub': 'application/epub+zip',
  // 图片
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.ico': 'image/x-icon',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  // 音频
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.wma': 'audio/x-ms-wma',
  // 视频
  '.mp4': 'video/mp4',
  '.avi': 'video/x-msvideo',
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.wmv': 'video/x-ms-wmv',
  '.flv': 'video/x-flv',
  '.webm': 'video/webm',
  '.m4v': 'video/x-m4v',
  // 代码与数据
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.ts': 'text/typescript',
  '.yaml': 'application/x-yaml',
  '.yml': 'application/x-yaml',
  '.ini': 'text/plain',
  '.log': 'text/plain',
  // 设计与其他
  '.psd': 'image/vnd.adobe.photoshop',
  '.ai': 'application/postscript',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.eml': 'message/rfc822',
};

/** 各扩展名可能对应的 MIME（浏览器/客户端上报不一致） */
const MIME_ALIASES = {
  'application/zip': true,
  'application/x-zip-compressed': true,
  'multipart/x-zip': true,
  'application/x-rar-compressed': true,
  'application/vnd.rar': true,
  'application/x-rar': true,
  'application/x-7z-compressed': true,
  'application/x-tar': true,
  'application/gzip': true,
  'application/x-gzip': true,
  'application/x-bzip2': true,
  'application/x-xz': true,
  'application/pdf': true,
  'application/msword': true,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
  'application/vnd.ms-excel': true,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true,
  'application/vnd.ms-powerpoint': true,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': true,
  'application/rtf': true,
  'text/rtf': true,
  'application/vnd.oasis.opendocument.text': true,
  'application/vnd.oasis.opendocument.spreadsheet': true,
  'application/vnd.oasis.opendocument.presentation': true,
  'text/csv': true,
  'application/csv': true,
  'text/plain': true,
  'text/markdown': true,
  'application/epub+zip': true,
  'image/jpeg': true,
  'image/png': true,
  'image/gif': true,
  'image/webp': true,
  'image/bmp': true,
  'image/svg+xml': true,
  'image/tiff': true,
  'image/x-icon': true,
  'image/vnd.microsoft.icon': true,
  'image/heic': true,
  'image/heif': true,
  'audio/mpeg': true,
  'audio/mp3': true,
  'audio/wav': true,
  'audio/x-wav': true,
  'audio/flac': true,
  'audio/aac': true,
  'audio/ogg': true,
  'audio/mp4': true,
  'audio/x-ms-wma': true,
  'video/mp4': true,
  'video/x-msvideo': true,
  'video/x-matroska': true,
  'video/quicktime': true,
  'video/x-ms-wmv': true,
  'video/x-flv': true,
  'video/webm': true,
  'video/x-m4v': true,
  'application/json': true,
  'application/xml': true,
  'text/xml': true,
  'text/html': true,
  'text/css': true,
  'text/javascript': true,
  'application/javascript': true,
  'text/typescript': true,
  'application/x-yaml': true,
  'text/yaml': true,
  'image/vnd.adobe.photoshop': true,
  'application/postscript': true,
  'font/ttf': true,
  'font/otf': true,
  'font/woff': true,
  'font/woff2': true,
  'application/font-woff': true,
  'application/font-woff2': true,
  'message/rfc822': true,
  'application/octet-stream': true,
};

const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.com', '.scr', '.ps1', '.vbs', '.msi', '.dll', '.sh', '.app', '.reg', '.jar', '.apk',
]);

const ALLOWED_EXTENSIONS = new Set(Object.keys(EXTENSION_TO_MIME));

function getExtension(filename) {
  const ext = path.extname(String(filename || '')).toLowerCase();
  return ext || '';
}

function getMimeByExtension(filename) {
  return EXTENSION_TO_MIME[getExtension(filename)] || null;
}

function normalizeContentType(filename, mimetype) {
  const fromExt = getMimeByExtension(filename);
  if (fromExt) return fromExt;
  const mime = String(mimetype || '').toLowerCase().split(';')[0].trim();
  if (mime && MIME_ALIASES[mime] && mime !== 'application/octet-stream') return mime;
  return mime || 'application/octet-stream';
}

function isAllowedAttachment({ originalname, mimetype }) {
  const ext = getExtension(originalname);
  if (BLOCKED_EXTENSIONS.has(ext)) return false;
  if (ALLOWED_EXTENSIONS.has(ext)) return true;

  const mime = String(mimetype || '').toLowerCase().split(';')[0].trim();
  if (mime && MIME_ALIASES[mime] && mime !== 'application/octet-stream') {
    return true;
  }
  return false;
}

function getAcceptAttribute() {
  return Array.from(ALLOWED_EXTENSIONS).join(',');
}

module.exports = {
  ALLOWED_EXTENSIONS,
  BLOCKED_EXTENSIONS,
  getExtension,
  getMimeByExtension,
  normalizeContentType,
  isAllowedAttachment,
  getAcceptAttribute,
};
