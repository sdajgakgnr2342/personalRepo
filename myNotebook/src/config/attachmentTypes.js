/** 允许上传的附件扩展名（与后端 attachmentTypes 保持一致） */
export const ALLOWED_ATTACHMENT_EXTENSIONS = [
  '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.tgz', '.tbz2',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.rtf',
  '.odt', '.ods', '.odp', '.csv', '.txt', '.md', '.epub',
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.tif', '.tiff', '.ico', '.heic', '.heif',
  '.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma',
  '.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v',
  '.json', '.xml', '.html', '.htm', '.css', '.js', '.ts', '.yaml', '.yml', '.ini', '.log',
  '.psd', '.ai', '.ttf', '.otf', '.woff', '.woff2', '.eml',
];

const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.com', '.scr', '.ps1', '.vbs', '.msi', '.dll', '.sh', '.app', '.reg', '.jar', '.apk',
]);

const ALLOWED_SET = new Set(ALLOWED_ATTACHMENT_EXTENSIONS);

/** 图片扩展名（附件选择器排除，避免手机弹出相册；插图片请用「插入图片」） */
const IMAGE_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.tif', '.tiff', '.ico', '.heic', '.heif', '.psd',
]);

export const ATTACHMENT_NON_IMAGE_EXTENSIONS = ALLOWED_ATTACHMENT_EXTENSIONS.filter(
  (ext) => !IMAGE_EXTENSIONS.has(ext),
);

/** 桌面端附件按钮：文档/压缩包/音视频等（不含图片） */
export const ATTACHMENT_FILE_ACCEPT = ATTACHMENT_NON_IMAGE_EXTENSIONS.join(',');

/** @deprecated 含图片扩展名，移动端会误开相册；请用 getAttachmentInputAccept() */
export const ATTACHMENT_ACCEPT = ALLOWED_ATTACHMENT_EXTENSIONS.join(',');

function isMobileFilePicker() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/**
 * 附件 <input accept>：移动端若含 .jpg/.png 等会只弹相册，故用 */* 再靠 JS 校验类型
 */
export function getAttachmentInputAccept() {
  return isMobileFilePicker() ? '*/*' : ATTACHMENT_FILE_ACCEPT;
}

export function getFileExtension(name) {
  const match = String(name || '').toLowerCase().match(/(\.[a-z0-9]+)$/);
  return match ? match[1] : '';
}

export function isAllowedAttachmentFile(file) {
  if (!file?.name) return false;
  const ext = getFileExtension(file.name);
  if (BLOCKED_EXTENSIONS.has(ext)) return false;
  return ALLOWED_SET.has(ext);
}

export function getAttachmentTypeError(fileName) {
  return `「${fileName}」不是支持的附件类型`;
}
