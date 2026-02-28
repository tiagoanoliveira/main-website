-- Adiciona email de envio por site.
-- Aplicar com: wrangler d1 migrations apply tiago-website

ALTER TABLE sites ADD COLUMN from_email TEXT;
