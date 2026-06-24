-- 为已有数据库添加计算器暗号字段
-- 在 notebook 库中执行

USE notebook;

ALTER TABLE core_user
  ADD COLUMN secret_code_hash VARCHAR(255) DEFAULT NULL COMMENT '计算器暗号 bcrypt 哈希' AFTER avatar,
  ADD COLUMN secret_code_set TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已设置暗号' AFTER secret_code_hash;
