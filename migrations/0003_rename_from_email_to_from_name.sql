-- Renomear coluna: from_email passou a guardar o nome de exibição (ex: "Suporte Barbearia Brooklyn")
-- O email real de envio é sempre o FROM_EMAIL global (secret do Worker)
-- Aplicar com: wrangler d1 migrations apply tiago-website --remote

ALTER TABLE sites RENAME COLUMN from_email TO from_name;
