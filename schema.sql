-- schema.sql (versão completa e actualizada)

CREATE TABLE IF NOT EXISTS users (
    id                   INTEGER  PRIMARY KEY AUTOINCREMENT,
    name                 TEXT     NOT NULL,
    email                TEXT     NOT NULL UNIQUE,
    password_hash        TEXT     NOT NULL,
    role                 TEXT     NOT NULL DEFAULT 'client',
    reset_token          TEXT     DEFAULT NULL,
    reset_token_expires  DATETIME DEFAULT NULL,
    created_at           DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sites (
    id           INTEGER  PRIMARY KEY AUTOINCREMENT,
    name         TEXT     NOT NULL,
    domain       TEXT     NOT NULL,
    token        TEXT     NOT NULL UNIQUE,
    owner_id     INTEGER  REFERENCES users(id),
    brand_color  TEXT     DEFAULT '#2563eb',
    logo_r2_key  TEXT     DEFAULT NULL,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tickets (
    id           INTEGER  PRIMARY KEY AUTOINCREMENT,
    site_id      INTEGER  REFERENCES sites(id),
    client_name  TEXT     NOT NULL,
    client_email TEXT     NOT NULL,
    client_phone TEXT     DEFAULT NULL,   -- adicionado em migration 0004
    category     TEXT     NOT NULL,
    description  TEXT     NOT NULL,
    status       TEXT     NOT NULL DEFAULT 'open',
    public_token TEXT     UNIQUE,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ticket_messages (
    id         INTEGER  PRIMARY KEY AUTOINCREMENT,
    ticket_id  INTEGER  REFERENCES tickets(id),
    sender     TEXT     NOT NULL,   -- 'admin' | 'client' | 'owner'
    message    TEXT     NOT NULL,
    is_read    INTEGER  DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
    id          INTEGER  PRIMARY KEY AUTOINCREMENT,
    site_id     INTEGER  REFERENCES sites(id),
    description TEXT     NOT NULL,
    amount      REAL     NOT NULL,
    status      TEXT     NOT NULL DEFAULT 'pending',
    due_date    DATE,
    paid_at     DATETIME,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    id         TEXT     PRIMARY KEY,
    user_id    INTEGER  REFERENCES users(id),
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attachments (
    id          INTEGER  PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT     NOT NULL,   -- 'ticket' | 'ticket_message' | 'invoice'
    entity_id   INTEGER  NOT NULL,
    file_name   TEXT     NOT NULL,
    file_type   TEXT     NOT NULL,
    file_size   INTEGER  NOT NULL,
    r2_key      TEXT     NOT NULL UNIQUE,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── Índices ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_attachments_entity    ON attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_invoices_site         ON invoices(site_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status       ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_users_reset_token     ON users(reset_token);
CREATE INDEX IF NOT EXISTS idx_tickets_public_token  ON tickets(public_token);
CREATE INDEX IF NOT EXISTS idx_tickets_client_email  ON tickets(client_email);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);
