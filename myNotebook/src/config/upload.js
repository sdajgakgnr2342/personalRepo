function parseSizeMb(envValue, defaultMb) {
  const mb = envValue !== undefined && envValue !== '' ? Number(envValue) : defaultMb;
  if (!Number.isFinite(mb) || mb <= 0) {
    return defaultMb;
  }
  return mb;
}

const attachmentMb = parseSizeMb(import.meta.env.VITE_UPLOAD_MAX_ATTACHMENT_MB, 10);
const avatarMb = parseSizeMb(import.meta.env.VITE_UPLOAD_MAX_AVATAR_MB, 2);

export const MAX_ATTACHMENT_SIZE = attachmentMb * 1024 * 1024;
export const MAX_ATTACHMENT_SIZE_LABEL = `${attachmentMb}MB`;

export const MAX_AVATAR_SIZE = avatarMb * 1024 * 1024;
export const MAX_AVATAR_SIZE_LABEL = `${avatarMb}MB`;
