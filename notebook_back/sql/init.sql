-- ============================================================
-- myNotebook 在线笔记本 - 数据库初始化脚本
-- 数据库: notebook
-- ============================================================

CREATE DATABASE IF NOT EXISTS notebook DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE notebook;

-- ------------------------------------------------------------
-- 1. 用户表
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core_user (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username      VARCHAR(50)  NOT NULL COMMENT '登录用户名',
  password      VARCHAR(255) NOT NULL COMMENT 'bcrypt 哈希密码',
  nickname      VARCHAR(50)  DEFAULT NULL COMMENT '昵称',
  avatar        VARCHAR(255) DEFAULT NULL COMMENT '头像 URL',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- ------------------------------------------------------------
-- 2. 笔记本树节点（文件夹 + 笔记统一树结构）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nb_item (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id               BIGINT UNSIGNED NOT NULL COMMENT '所属用户',
  parent_id             BIGINT UNSIGNED DEFAULT NULL COMMENT '父节点，NULL=根级',
  name                  VARCHAR(200) NOT NULL COMMENT '文件夹名/笔记标题',
  item_type             ENUM('folder','note') NOT NULL DEFAULT 'folder',
  content               LONGTEXT DEFAULT NULL COMMENT '笔记正文（加密文件夹内 AES 加密存储）',
  is_encrypted          TINYINT(1) NOT NULL DEFAULT 0 COMMENT '文件夹是否加密',
  folder_password_hash  VARCHAR(255) DEFAULT NULL COMMENT '加密文件夹密码 bcrypt 哈希',
  status                ENUM('normal','draft','trash') NOT NULL DEFAULT 'normal',
  is_favorite           TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否收藏',
  sort_order            INT NOT NULL DEFAULT 0 COMMENT '同级排序',
  word_count            INT NOT NULL DEFAULT 0 COMMENT '字数统计',
  share_token           VARCHAR(64) DEFAULT NULL COMMENT '分享令牌',
  is_saved              TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已保存（分享需先保存）',
  last_saved_at         DATETIME DEFAULT NULL COMMENT '最后保存时间',
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at            DATETIME DEFAULT NULL COMMENT '软删除时间',
  PRIMARY KEY (id),
  KEY idx_user_parent   (user_id, parent_id),
  KEY idx_user_status   (user_id, status),
  KEY idx_user_favorite (user_id, is_favorite),
  KEY idx_share_token   (share_token),
  KEY idx_updated_at    (updated_at),
  CONSTRAINT fk_item_user   FOREIGN KEY (user_id)   REFERENCES core_user(id) ON DELETE CASCADE,
  CONSTRAINT fk_item_parent FOREIGN KEY (parent_id) REFERENCES nb_item(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='笔记本树节点';

-- ------------------------------------------------------------
-- 3. 附件表
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nb_attachment (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id     BIGINT UNSIGNED NOT NULL COMMENT '关联笔记 ID',
  user_id     BIGINT UNSIGNED NOT NULL,
  file_name   VARCHAR(255) NOT NULL COMMENT '原始文件名',
  file_path   VARCHAR(500) NOT NULL COMMENT '存储路径',
  file_type   VARCHAR(100) DEFAULT NULL COMMENT 'MIME 类型',
  file_size   INT UNSIGNED DEFAULT 0 COMMENT '字节大小',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_item (item_id),
  CONSTRAINT fk_attach_item FOREIGN KEY (item_id) REFERENCES nb_item(id) ON DELETE CASCADE,
  CONSTRAINT fk_attach_user FOREIGN KEY (user_id) REFERENCES core_user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='笔记附件';

-- ------------------------------------------------------------
-- 4. 加密文件夹解锁记录（默认 5 分钟有效，见 FOLDER_UNLOCK_MINUTES）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nb_folder_unlock (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      BIGINT UNSIGNED NOT NULL,
  folder_id    BIGINT UNSIGNED NOT NULL,
  unlock_token VARCHAR(64) NOT NULL,
  expires_at   DATETIME NOT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_folder (user_id, folder_id),
  KEY idx_token (unlock_token),
  CONSTRAINT fk_unlock_user   FOREIGN KEY (user_id)   REFERENCES core_user(id) ON DELETE CASCADE,
  CONSTRAINT fk_unlock_folder FOREIGN KEY (folder_id) REFERENCES nb_item(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='加密文件夹解锁会话';

-- ------------------------------------------------------------
-- 5. 演示数据（密码均为 123456 的 bcrypt 哈希）
-- ------------------------------------------------------------
INSERT INTO core_user (username, password, nickname) VALUES
('demo', '$2b$10$rQZ8K8YvXqH5xJ5xJ5xJ5uJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5x', '演示用户')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

-- 使用真实 bcrypt 哈希（123456）
UPDATE core_user SET password = '$2b$10$mXGBAmNWzBCeKKndy.wrxO8JP.XDXcnLWzXFLp7Y2zAJt06r//Mb.'
WHERE username = 'demo';

-- 获取 demo 用户 ID 并插入示例树结构
SET @uid = (SELECT id FROM core_user WHERE username = 'demo' LIMIT 1);

-- 根文件夹：我的笔记
INSERT INTO nb_item (user_id, parent_id, name, item_type, sort_order) VALUES
(@uid, NULL, '我的笔记', 'folder', 0);
SET @root_id = LAST_INSERT_ID();

-- 子文件夹
INSERT INTO nb_item (user_id, parent_id, name, item_type, is_encrypted, sort_order) VALUES
(@uid, @root_id, '工作文档', 'folder', 0, 1);
SET @work_id = LAST_INSERT_ID();

INSERT INTO nb_item (user_id, parent_id, name, item_type, sort_order) VALUES
(@uid, @root_id, '生活随笔', 'folder', 2);
SET @life_id = LAST_INSERT_ID();

INSERT INTO nb_item (user_id, parent_id, name, item_type, is_encrypted, folder_password_hash, sort_order) VALUES
(@uid, @root_id, '私密日记（加密）', 'folder', 1, '$2b$10$mXGBAmNWzBCeKKndy.wrxO8JP.XDXcnLWzXFLp7Y2zAJt06r//Mb.', 3);
SET @secret_id = LAST_INSERT_ID();

-- 示例笔记
INSERT INTO nb_item (user_id, parent_id, name, item_type, content, status, is_saved, word_count, last_saved_at, sort_order) VALUES
(@uid, @root_id, '示例笔记', 'note',
'欢迎使用个人笔记本！\n\n- 支持多级文件夹管理\n- 加密文件夹需输入密码验证\n- 可保存、撤销/恢复、分享笔记\n- 点击左侧菜单切换笔记',
'normal', 1, 91, NOW(), 0);

INSERT INTO nb_item (user_id, parent_id, name, item_type, content, status, is_saved, word_count, last_saved_at, sort_order) VALUES
(@uid, @work_id, '季度报告', 'note', '2026 Q1 季度工作总结...', 'normal', 1, 12, NOW(), 0);

INSERT INTO nb_item (user_id, parent_id, name, item_type, content, status, is_saved, word_count, sort_order) VALUES
(@uid, NULL, '草稿：待完善', 'note', '这是一篇草稿...', 'draft', 0, 8, 99);
