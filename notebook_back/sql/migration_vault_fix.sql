-- 补跑：上次 migration_vault.sql 因缺少 secret_code_set 导致 is_admin 未创建
-- 在 notebook 库中执行，可重复运行

USE notebook;

-- 暗号字段
SET @has_secret_code_set = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'core_user' AND COLUMN_NAME = 'secret_code_set'
);
SET @sql = IF(
  @has_secret_code_set = 0,
  'ALTER TABLE core_user
     ADD COLUMN secret_code_hash VARCHAR(255) DEFAULT NULL COMMENT ''计算器暗号 bcrypt 哈希'' AFTER avatar,
     ADD COLUMN secret_code_set TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''是否已设置暗号'' AFTER secret_code_hash',
  'SELECT 1'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- is_admin
SET @has_is_admin = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'core_user' AND COLUMN_NAME = 'is_admin'
);
SET @sql = IF(
  @has_is_admin = 0,
  'ALTER TABLE core_user ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''是否超级管理员'' AFTER secret_code_set',
  'SELECT 1'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- fallback：secret_code_set 仍不存在时追加到表尾
SET @has_is_admin = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'core_user' AND COLUMN_NAME = 'is_admin'
);
SET @sql = IF(
  @has_is_admin = 0,
  'ALTER TABLE core_user ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''是否超级管理员''',
  'SELECT 1'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- vmk_escrow（若 vault_recovery_token 是旧结构）
SET @has_vmk_escrow = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vault_recovery_token' AND COLUMN_NAME = 'vmk_escrow'
);
SET @sql = IF(
  @has_vmk_escrow = 0,
  'ALTER TABLE vault_recovery_token ADD COLUMN vmk_escrow VARBINARY(512) NOT NULL COMMENT ''VMK 恢复 escrow 密文'' AFTER token_hash',
  'SELECT 1'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SELECT 'migration_vault_fix done' AS result;
