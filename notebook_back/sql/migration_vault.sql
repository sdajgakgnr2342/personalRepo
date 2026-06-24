-- ============================================================
-- 隐私空间 · 文件保险库 - 数据库迁移
-- 可重复执行（会自动跳过已存在的列/表）
-- ============================================================

USE notebook;

-- ------------------------------------------------------------
-- 0. 计算器暗号字段（若尚未执行 migration_secret_code.sql）
-- ------------------------------------------------------------
SET @has_secret_code_set = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'core_user' AND COLUMN_NAME = 'secret_code_set'
);

SET @sql_secret = IF(
  @has_secret_code_set = 0,
  'ALTER TABLE core_user
     ADD COLUMN secret_code_hash VARCHAR(255) DEFAULT NULL COMMENT ''计算器暗号 bcrypt 哈希'' AFTER avatar,
     ADD COLUMN secret_code_set TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''是否已设置暗号'' AFTER secret_code_hash',
  'SELECT ''secret_code columns already exist'' AS info'
);
PREPARE stmt_secret FROM @sql_secret;
EXECUTE stmt_secret;
DEALLOCATE PREPARE stmt_secret;

-- ------------------------------------------------------------
-- 1. 用户表：超级管理员标记
-- ------------------------------------------------------------
SET @has_is_admin = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'core_user' AND COLUMN_NAME = 'is_admin'
);

SET @sql_admin = IF(
  @has_is_admin = 0,
  'ALTER TABLE core_user
     ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''是否超级管理员（全站唯一）'' AFTER secret_code_set',
  'SELECT ''is_admin column already exists'' AS info'
);
PREPARE stmt_admin FROM @sql_admin;
EXECUTE stmt_admin;
DEALLOCATE PREPARE stmt_admin;

-- 若 secret_code_set 不存在且 is_admin 也未加上，则追加到表末尾
SET @has_is_admin = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'core_user' AND COLUMN_NAME = 'is_admin'
);

SET @sql_admin_fallback = IF(
  @has_is_admin = 0,
  'ALTER TABLE core_user
     ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''是否超级管理员（全站唯一）''',
  'SELECT ''is_admin column already exists'' AS info'
);
PREPARE stmt_admin_fb FROM @sql_admin_fallback;
EXECUTE stmt_admin_fb;
DEALLOCATE PREPARE stmt_admin_fb;

-- 部署后手动将管理员账号设为 1，例如：
-- UPDATE core_user SET is_admin = 1 WHERE username = 'admin' LIMIT 1;

-- ------------------------------------------------------------
-- 2. 保险库用户配置（每用户一条）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vault_profile (
  user_id                BIGINT UNSIGNED NOT NULL COMMENT '用户 ID',
  vault_salt             VARBINARY(32)   NOT NULL COMMENT '保险柜密码 KDF 盐',
  kdf_params             JSON            NOT NULL COMMENT 'Argon2id 参数',
  wrapped_vmk            VARBINARY(512)  DEFAULT NULL COMMENT '保险柜密码包裹的主密钥 VMK',
  admin_recovery_blob    VARBINARY(512)  NOT NULL COMMENT '管理员人工恢复用 VMK 包裹体',
  key_check              VARBINARY(64)   NOT NULL COMMENT '密码校验密文',
  vault_status           ENUM('uninitialized','active','locked','pending_new_password')
                         NOT NULL DEFAULT 'uninitialized' COMMENT '保险库状态',
  quota_bytes            BIGINT UNSIGNED NOT NULL DEFAULT 21474836480 COMMENT '总配额，默认 20GB',
  used_bytes             BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '已用密文容量',
  last_unlocked_at       DATETIME        DEFAULT NULL COMMENT '上次解锁时间',
  last_admin_recovery_at DATETIME        DEFAULT NULL COMMENT '上次管理员恢复时间',
  created_at             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_vault_profile_user FOREIGN KEY (user_id) REFERENCES core_user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='隐私空间保险库配置';

-- ------------------------------------------------------------
-- 3. 保险库文件元数据（OSS 仅存密文）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vault_file (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         BIGINT UNSIGNED NOT NULL,
  storage_key     VARCHAR(512)    NOT NULL COMMENT 'OSS 对象键',
  wrapped_fek     VARBINARY(256)  NOT NULL COMMENT 'VMK 包裹的文件密钥',
  enc_name        VARBINARY(512)  NOT NULL COMMENT '加密后的文件名',
  enc_mime        VARBINARY(128)  DEFAULT NULL COMMENT '加密后的 MIME',
  size_plain      BIGINT UNSIGNED NOT NULL COMMENT '明文大小（字节）',
  size_cipher     BIGINT UNSIGNED NOT NULL COMMENT '密文大小（字节）',
  chunk_count     INT UNSIGNED    NOT NULL COMMENT '分块数量',
  chunk_size      INT UNSIGNED    NOT NULL DEFAULT 4194304 COMMENT '分块大小，默认 4MB',
  manifest_hmac   VARBINARY(64)   NOT NULL COMMENT '清单 HMAC',
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at      DATETIME        DEFAULT NULL COMMENT '软删除',
  PRIMARY KEY (id),
  KEY idx_vault_file_user (user_id, deleted_at),
  KEY idx_vault_file_created (user_id, created_at),
  CONSTRAINT fk_vault_file_user FOREIGN KEY (user_id) REFERENCES core_user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='隐私空间文件';

-- ------------------------------------------------------------
-- 4. 分块上传会话（上传完成前登记元数据）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vault_upload_session (
  id              CHAR(36)        NOT NULL COMMENT 'UUID 上传会话 ID',
  user_id         BIGINT UNSIGNED NOT NULL,
  storage_key     VARCHAR(512)    NOT NULL COMMENT '预分配 OSS 路径',
  wrapped_fek     VARBINARY(256)  NOT NULL,
  enc_name        VARBINARY(512)  NOT NULL,
  enc_mime        VARBINARY(128)  DEFAULT NULL,
  size_plain      BIGINT UNSIGNED NOT NULL,
  size_cipher     BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '上传完成后回填',
  chunk_count     INT UNSIGNED    NOT NULL,
  chunk_size      INT UNSIGNED    NOT NULL DEFAULT 4194304,
  manifest_hmac   VARBINARY(64)   NOT NULL,
  uploaded_chunks JSON            NOT NULL COMMENT '已上传分块 index 列表',
  status          ENUM('pending','completed','expired','failed') NOT NULL DEFAULT 'pending',
  expires_at      DATETIME        NOT NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_vault_upload_user (user_id, status),
  CONSTRAINT fk_vault_upload_user FOREIGN KEY (user_id) REFERENCES core_user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='保险库分块上传会话';

-- ------------------------------------------------------------
-- 5. 忘记保险柜密码 · 站内恢复申请
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vault_recovery_request (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  message       VARCHAR(1000)   NOT NULL COMMENT '申请说明',
  contact       VARCHAR(200)    DEFAULT NULL COMMENT '用户留的联系邮箱/手机',
  status        ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  admin_id      BIGINT UNSIGNED DEFAULT NULL COMMENT '处理管理员',
  admin_note    VARCHAR(1000)   DEFAULT NULL COMMENT '管理员内部备注',
  reject_reason VARCHAR(500)    DEFAULT NULL COMMENT '拒绝原因（用户可见摘要）',
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  handled_at    DATETIME        DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_recovery_user_status (user_id, status),
  KEY idx_recovery_pending (status, created_at),
  CONSTRAINT fk_recovery_user  FOREIGN KEY (user_id)  REFERENCES core_user(id) ON DELETE CASCADE,
  CONSTRAINT fk_recovery_admin FOREIGN KEY (admin_id) REFERENCES core_user(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='保险柜密码恢复申请';

-- ------------------------------------------------------------
-- 6. 管理员批准后 · 一次性设新密码令牌
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vault_recovery_token (
  user_id     BIGINT UNSIGNED NOT NULL,
  token_hash  CHAR(64)        NOT NULL COMMENT 'SHA256(随机令牌)',
  vmk_escrow  VARBINARY(512)  NOT NULL COMMENT 'VMK 恢复 escrow 密文',
  expires_at  DATETIME        NOT NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_recovery_token_user FOREIGN KEY (user_id) REFERENCES core_user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员恢复后设新密码令牌';

-- 若表已存在但缺少 vmk_escrow（旧版迁移）
SET @has_vmk_escrow = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vault_recovery_token' AND COLUMN_NAME = 'vmk_escrow'
);

SET @sql_vmk_escrow = IF(
  @has_vmk_escrow = 0,
  'ALTER TABLE vault_recovery_token ADD COLUMN vmk_escrow VARBINARY(512) NOT NULL COMMENT ''VMK 恢复 escrow 密文'' AFTER token_hash',
  'SELECT ''vmk_escrow column already exists'' AS info'
);
PREPARE stmt_vmk FROM @sql_vmk_escrow;
EXECUTE stmt_vmk;
DEALLOCATE PREPARE stmt_vmk;

-- ------------------------------------------------------------
-- 7. 管理员操作审计（不可删）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vault_admin_audit_log (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_id       BIGINT UNSIGNED NOT NULL,
  action         VARCHAR(64)     NOT NULL COMMENT 'approve_recovery / reject_recovery 等',
  target_user_id BIGINT UNSIGNED DEFAULT NULL,
  request_id     BIGINT UNSIGNED DEFAULT NULL,
  ip             VARCHAR(64)     DEFAULT NULL,
  detail         JSON            DEFAULT NULL COMMENT '扩展信息',
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_admin (admin_id, created_at),
  KEY idx_audit_target (target_user_id, created_at),
  CONSTRAINT fk_audit_admin FOREIGN KEY (admin_id) REFERENCES core_user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='隐私空间管理员审计';
