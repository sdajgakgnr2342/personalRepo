const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const vaultConfig = require('../config/vault');

function signVaultSession(userId) {
  return jwt.sign(
    { userId, type: 'vault_unlock' },
    JWT_SECRET,
    { expiresIn: `${vaultConfig.unlockSessionMinutes}m` }
  );
}

function verifyVaultSession(token) {
  const payload = jwt.verify(token, JWT_SECRET);
  if (payload.type !== 'vault_unlock' || !payload.userId) {
    throw new Error('invalid vault session');
  }
  return payload;
}

module.exports = { signVaultSession, verifyVaultSession };
