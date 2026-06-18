function parseSizeMb(envKey, defaultMb) {
  const raw = process.env[envKey];
  const mb = raw !== undefined && raw !== '' ? Number(raw) : defaultMb;
  if (!Number.isFinite(mb) || mb <= 0) {
    return defaultMb * 1024 * 1024;
  }
  return Math.round(mb * 1024 * 1024);
}

function formatSizeLabel(bytes) {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return Number.isInteger(mb) ? `${mb}MB` : `${mb.toFixed(1)}MB`;
  }
  if (bytes >= 1024) {
    const kb = bytes / 1024;
    return Number.isInteger(kb) ? `${kb}KB` : `${kb.toFixed(1)}KB`;
  }
  return `${bytes}B`;
}

const maxAttachmentBytes = parseSizeMb('UPLOAD_MAX_ATTACHMENT_MB', 10);
const maxAvatarBytes = parseSizeMb('UPLOAD_MAX_AVATAR_MB', 2);

module.exports = {
  maxAttachmentBytes,
  maxAvatarBytes,
  maxAttachmentLabel: formatSizeLabel(maxAttachmentBytes),
  maxAvatarLabel: formatSizeLabel(maxAvatarBytes),
  formatSizeLabel,
};
