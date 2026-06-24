const crypto = require('crypto');
const vaultConfig = require('../config/vault');

function getAdminRecoveryKey() {
  const key = vaultConfig.adminRecoveryKey;
  if (!key || key.length < 32) {
    throw new Error('VAULT_ADMIN_RECOVERY_KEY 未配置或长度不足');
  }
  return crypto.createHash('sha256').update(String(key)).digest();
}

function deriveUserAdminKey(userId) {
  return crypto.createHmac('sha256', getAdminRecoveryKey()).update(String(userId)).digest();
}

function wrapVmkForAdmin(vmkBuffer, userId) {
  const key = deriveUserAdminKey(userId);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(vmkBuffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

function unwrapVmkFromAdmin(blobBuffer, userId) {
  const key = deriveUserAdminKey(userId);
  const iv = blobBuffer.subarray(0, 12);
  const tag = blobBuffer.subarray(12, 28);
  const encrypted = blobBuffer.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

function hashRecoveryToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function wrapVmkForRecoveryToken(vmkBuffer, token) {
  const key = crypto.createHash('sha256').update(String(token)).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(vmkBuffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

function unwrapVmkFromRecoveryToken(blobBuffer, token) {
  const key = crypto.createHash('sha256').update(String(token)).digest();
  const iv = blobBuffer.subarray(0, 12);
  const tag = blobBuffer.subarray(12, 28);
  const encrypted = blobBuffer.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

function generateRecoveryToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  wrapVmkForAdmin,
  unwrapVmkFromAdmin,
  hashRecoveryToken,
  wrapVmkForRecoveryToken,
  unwrapVmkFromRecoveryToken,
  generateRecoveryToken,
};
