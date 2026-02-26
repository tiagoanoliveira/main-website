-- migrations/001_add_branding_and_reset.sql

-- 1) Reset de password na tabela users
ALTER TABLE users ADD COLUMN reset_token         TEXT    DEFAULT NULL;
ALTER TABLE users ADD COLUMN reset_token_expires DATETIME DEFAULT NULL;

-- 2) Branding por site
ALTER TABLE sites ADD COLUMN brand_color TEXT    DEFAULT '#2563eb';
ALTER TABLE sites ADD COLUMN logo_r2_key TEXT    DEFAULT NULL;

-- 3) Índice para reset token (performance)
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);
