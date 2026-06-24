const MB = 1024 * 1024;

function parseIntEnv(name, fallback) {
  const n = parseInt(process.env[name], 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

module.exports = {
  maxFileBytes: parseIntEnv('VAULT_MAX_FILE_BYTES', 1024 * MB),
  defaultQuotaBytes: parseIntEnv('VAULT_DEFAULT_QUOTA_BYTES', 20 * 1024 * MB),
  chunkSize: parseIntEnv('VAULT_CHUNK_BYTES', 4 * MB),
  unlockSessionMinutes: parseIntEnv('VAULT_UNLOCK_SESSION_MINUTES', 15),
  recoveryTokenHours: parseIntEnv('VAULT_RECOVERY_TOKEN_HOURS', 24),
  recoveryCooldownDays: parseIntEnv('VAULT_RECOVERY_COOLDOWN_DAYS', 30),
  uploadSessionHours: parseIntEnv('VAULT_UPLOAD_SESSION_HOURS', 24),
  adminRecoveryKey: process.env.VAULT_ADMIN_RECOVERY_KEY || process.env.ENCRYPTION_KEY || '',
};
