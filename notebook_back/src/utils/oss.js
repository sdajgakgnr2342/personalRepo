const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const attachmentTypes = require('../config/attachmentTypes');

const MULTIPART_THRESHOLD_BYTES = 50 * 1024 * 1024;
const DEFAULT_OSS_TIMEOUT_MS = 600000;

let client = null;

function getOssConfig() {
  return {
    region: process.env.OSS_REGION,
    accessKeyId: process.env.OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
    bucket: process.env.OSS_BUCKET,
    endpoint: process.env.OSS_ENDPOINT || undefined,
    secure: process.env.OSS_SECURE !== 'false',
  };
}

function isOssEnabled() {
  const cfg = getOssConfig();
  return !!(cfg.region && cfg.accessKeyId && cfg.accessKeySecret && cfg.bucket);
}

function getPrefix() {
  return (process.env.OSS_PREFIX || '').replace(/^\/+|\/+$/g, '');
}

function buildObjectKey(relativePath) {
  const key = String(relativePath || '').replace(/^\/+/, '');
  const prefix = getPrefix();
  return prefix ? `${prefix}/${key}` : key;
}

function getPublicUrl(objectKey) {
  const key = String(objectKey || '').replace(/^\/+/, '');
  const customDomain = (process.env.OSS_CUSTOM_DOMAIN || '').replace(/\/+$/, '');
  if (customDomain) {
    return `${customDomain}/${key}`;
  }

  const cfg = getOssConfig();
  if (cfg.endpoint) {
    const host = cfg.endpoint.replace(/^https?:\/\//, '');
    const protocol = cfg.secure ? 'https' : 'http';
    return `${protocol}://${cfg.bucket}.${host}/${key}`;
  }

  return `https://${cfg.bucket}.${cfg.region}.aliyuncs.com/${key}`;
}

function getClient() {
  if (!isOssEnabled()) {
    throw new Error(
      'OSS 未配置，请在 .env 中设置 OSS_REGION、OSS_ACCESS_KEY_ID、OSS_ACCESS_KEY_SECRET、OSS_BUCKET'
    );
  }
  if (!client) {
    const OSS = require('ali-oss');
    const cfg = getOssConfig();
    const timeoutMs = Number(process.env.OSS_REQUEST_TIMEOUT_MS) || DEFAULT_OSS_TIMEOUT_MS;
    client = new OSS({
      region: cfg.region,
      accessKeyId: cfg.accessKeyId,
      accessKeySecret: cfg.accessKeySecret,
      bucket: cfg.bucket,
      endpoint: cfg.endpoint,
      secure: cfg.secure,
      timeout: timeoutMs,
    });
  }
  return client;
}

function guessContentType(filename) {
  return attachmentTypes.getMimeByExtension(filename) || 'application/octet-stream';
}

/**
 * 上传本地文件到 OSS
 * @param {string} localPath 本地文件路径
 * @param {string} [objectKey] OSS 对象键，不传则自动生成
 * @param {{ contentType?: string, headers?: object, folder?: string }} [options]
 */
async function uploadFile(localPath, objectKey, options = {}) {
  const absPath = path.resolve(localPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`文件不存在: ${absPath}`);
  }

  const filename = path.basename(absPath);
  const key = buildObjectKey(
    objectKey || generateObjectKey(options.folder || 'uploads', filename)
  );

  const stat = fs.statSync(absPath);
  const contentType = options.contentType || guessContentType(filename);
  const client = getClient();
  let result;
  if (stat.size >= MULTIPART_THRESHOLD_BYTES) {
    result = await client.multipartUpload(key, absPath, {
      partSize: 5 * 1024 * 1024,
      mime: contentType,
    });
  } else {
    const headers = { ...(options.headers || {}), 'Content-Type': contentType };
    result = await client.put(key, absPath, { headers });
  }

  return {
    objectKey: key,
    url: getPublicUrl(key),
    etag: result.etag,
    size: stat.size,
  };
}

function formatOssError(error) {
  if (!error) return '未知错误';
  const parts = [];
  if (error.code) parts.push(String(error.code));
  if (error.status) parts.push(`HTTP ${error.status}`);
  if (error.requestId) parts.push(`requestId=${error.requestId}`);
  const msg = String(error.message || '').trim();
  if (msg && !parts.some((p) => msg.includes(p))) {
    parts.push(msg.length > 120 ? `${msg.slice(0, 120)}…` : msg);
  }
  return parts.join(' · ') || '未知错误';
}

/**
 * 上传 Buffer 到 OSS（适合 multer memoryStorage 等场景）
 */
async function uploadBuffer(buffer, objectKey, options = {}) {
  if (!buffer || !buffer.length) {
    throw new Error('上传内容为空');
  }

  const key = buildObjectKey(objectKey);
  const client = getClient();
  const contentType = options.contentType || guessContentType(objectKey) || 'application/octet-stream';
  let result;
  if (buffer.length >= MULTIPART_THRESHOLD_BYTES) {
    result = await client.multipartUpload(key, buffer, {
      partSize: 5 * 1024 * 1024,
      mime: contentType,
    });
  } else {
    const headers = { ...(options.headers || {}), 'Content-Type': contentType };
    result = await client.put(key, buffer, { headers });
  }

  return {
    objectKey: key,
    url: getPublicUrl(key),
    etag: result.etag,
    size: buffer.length,
  };
}

/**
 * 删除 OSS 对象
 */
async function deleteObject(objectKey) {
  const key = buildObjectKey(objectKey);
  await getClient().delete(key);
  return { objectKey: key };
}

/**
 * 判断 URL 是否为本项目 OSS 地址
 */
function isOssUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const customDomain = (process.env.OSS_CUSTOM_DOMAIN || '').replace(/\/+$/, '');
  if (customDomain && url.startsWith(`${customDomain}/`)) return true;

  const cfg = getOssConfig();
  if (!cfg.bucket) return false;
  return url.includes(`${cfg.bucket}.`) || url.includes(`/${cfg.bucket}/`);
}

/**
 * 从 URL 或路径解析 OSS 对象键
 */
function extractObjectKey(urlOrKey) {
  const value = String(urlOrKey || '');
  if (!value.includes('://')) {
    return buildObjectKey(value);
  }

  try {
    const pathname = decodeURIComponent(new URL(value).pathname).replace(/^\/+/, '');
    const prefix = getPrefix();
    if (prefix && pathname.startsWith(`${prefix}/`)) {
      return pathname;
    }
    return pathname;
  } catch {
    return buildObjectKey(value);
  }
}

/**
 * 生成唯一对象键，如 avatars/1710000000-a1b2c3d4.jpg
 */
function generateObjectKey(folder, originalName) {
  const ext = path.extname(originalName || '').toLowerCase();
  const base = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
  const folderClean = (folder || 'files').replace(/^\/+|\/+$/g, '');
  return `${folderClean}/${base}`;
}

/**
 * 将数据库中的存储路径解析为可访问 URL（OSS 公网地址或本地 /uploads 路径）
 */
function resolvePublicUrl(storedPath) {
  if (!storedPath) return '';
  if (/^https?:\/\//i.test(storedPath)) return storedPath;
  if (storedPath.startsWith('/uploads/')) return storedPath;

  const attachmentStorage = (process.env.ATTACHMENT_STORAGE || 'local').toLowerCase();
  if (storedPath.startsWith('attachments/') && attachmentStorage !== 'oss') {
    return `/uploads/${storedPath}`;
  }

  if (isOssEnabled()) {
    return getPublicUrl(extractObjectKey(storedPath));
  }

  const basename = path.basename(storedPath);
  return `/uploads/${basename}`;
}

/**
 * 删除已存储文件（OSS 或历史本地文件）
 */
async function deleteStoredFile(storedPath) {
  if (!storedPath) return;

  const attachmentStorage = (process.env.ATTACHMENT_STORAGE || 'local').toLowerCase();
  if (storedPath.startsWith('attachments/') && attachmentStorage !== 'oss') {
    const localPath = path.join(__dirname, '../../uploads', storedPath);
    if (fs.existsSync(localPath)) {
      try {
        fs.unlinkSync(localPath);
      } catch {
        /* ignore */
      }
    }
    return;
  }

  if (/^https?:\/\//i.test(storedPath)) {
    if (isOssEnabled()) {
      try {
        await deleteObject(extractObjectKey(storedPath));
      } catch (err) {
        console.error('OSS delete failed:', err.message);
      }
    }
    return;
  }

  if (isOssEnabled() && storedPath.includes('/')) {
    try {
      await deleteObject(extractObjectKey(storedPath));
    } catch (err) {
      console.error('OSS delete failed:', err.message);
    }
    return;
  }

  const uploadRoot = path.join(__dirname, '../../uploads');
  let localPath = storedPath;
  if (storedPath.startsWith('/uploads/')) {
    localPath = path.join(uploadRoot, storedPath.replace(/^\/uploads\//, ''));
  } else if (!storedPath.includes('/')) {
    localPath = path.join(uploadRoot, storedPath);
  } else {
    localPath = path.join(uploadRoot, 'avatars', path.basename(storedPath));
  }
  if (fs.existsSync(localPath)) {
    try {
      fs.unlinkSync(localPath);
    } catch {
      /* ignore */
    }
  }
}

module.exports = {
  isOssEnabled,
  getOssConfig,
  getClient,
  getPrefix,
  buildObjectKey,
  getPublicUrl,
  uploadFile,
  uploadBuffer,
  deleteObject,
  isOssUrl,
  extractObjectKey,
  generateObjectKey,
  guessContentType,
  formatOssError,
  resolvePublicUrl,
  deleteStoredFile,
};
