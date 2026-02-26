// app/lib/db.ts

// ── Types ──────────────────────────────────────────────────────

export interface ClientUser {
    id: number;
    name: string;
    email: string;
    role: "admin" | "client" | string;
    password_hash: string;
    created_at: string;
}

export interface Site {
    id: number;
    name: string;
    domain: string;
    token: string;
    owner_id: number | null;
    owner_name: string | null;
    owner_email: string | null; // ← obrigatório para reset pw
    created_at: string;
}

export interface Ticket {
    id: number;
    site_id: number;
    site_name: string;
    client_name: string;
    client_email: string;
    category: string;
    description: string;
    status: "open" | "in_progress" | "closed";
    public_token: string;
    created_at: string;
}

export interface TicketMessage {
    id: number;
    ticket_id: number;
    sender: "admin" | "client";
    message: string;
    is_read: number;
    created_at: string;
}

export interface Invoice {
    id: number;
    site_id: number;
    site_name: string;
    owner_name: string | null;
    description: string;
    amount: number;
    status: "pending" | "paid" | string;
    due_date: string | null;
    paid_at: string | null;
    created_at: string;
}

export interface Attachment {
    id: number;
    entity_type: "ticket" | "ticket_message" | "invoice";
    entity_id: number;
    file_name: string;
    file_type: string;
    file_size: number;
    r2_key: string;
    created_at: string;
}

// ── Utilitários internos ───────────────────────────────────────

function inClausePlaceholders(n: number): string {
    return Array.from({ length: n }, () => "?").join(",");
}

// ── Users (clientes) ───────────────────────────────────────────

export async function getUserByEmail(
    db: D1Database,
    email: string
): Promise<ClientUser | null> {
    return db
        .prepare("SELECT * FROM users WHERE email = ? LIMIT 1")
        .bind(email)
        .first<ClientUser>();
}

export async function createClientUser(
    db: D1Database,
    data: { name: string; email: string; passwordHash: string }
): Promise<number> {
    const r = await db
        .prepare(
            "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'client')"
        )
        .bind(data.name, data.email, data.passwordHash)
        .run();
    return Number(r.meta.last_row_id);
}

// ── Password reset ─────────────────────────────────────────────

export async function setResetToken(
    db: D1Database,
    userId: number,
    token: string
): Promise<void> {
    const expires = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2h
    await db
        .prepare(
            "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?"
        )
        .bind(token, expires, userId)
        .run();
}

export async function getUserByResetToken(
    db: D1Database,
    token: string
): Promise<{ id: number; email: string; name: string } | null> {
    return db
        .prepare(
            `SELECT id, email, name FROM users
             WHERE reset_token = ? AND reset_token_expires > datetime('now')`
        )
        .bind(token)
        .first<{ id: number; email: string; name: string }>();
}

export async function clearResetToken(
    db: D1Database,
    userId: number,
    newPasswordHash: string
): Promise<void> {
    await db
        .prepare(
            `UPDATE users
       SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL
       WHERE id = ?`
        )
        .bind(newPasswordHash, userId)
        .run();
}

// ── Sites ──────────────────────────────────────────────────────

export async function getSites(db: D1Database): Promise<Site[]> {
    const r = await db
        .prepare(
            `SELECT s.*, u.name AS owner_name, u.email AS owner_email
       FROM sites s
       LEFT JOIN users u ON s.owner_id = u.id
       ORDER BY s.created_at DESC`
        )
        .all<Site>();
    return r.results;
}

export async function getSiteById(
    db: D1Database,
    id: number
): Promise<Site | null> {
    return db
        .prepare(
            `SELECT s.*, u.name AS owner_name, u.email AS owner_email
       FROM sites s
       LEFT JOIN users u ON s.owner_id = u.id
       WHERE s.id = ?`
        )
        .bind(id)
        .first<Site>();
}

export async function getSiteByToken(
    db: D1Database,
    token: string
): Promise<Site | null> {
    return db
        .prepare(
            `SELECT s.*, u.name AS owner_name, u.email AS owner_email
       FROM sites s
       LEFT JOIN users u ON s.owner_id = u.id
       WHERE s.token = ?`
        )
        .bind(token)
        .first<Site>();
}

export async function getSitesByOwner(
    db: D1Database,
    userId: number
): Promise<Site[]> {
    const r = await db
        .prepare(
            `SELECT s.*, u.name AS owner_name, u.email AS owner_email
       FROM sites s
       LEFT JOIN users u ON s.owner_id = u.id
       WHERE s.owner_id = ?
       ORDER BY s.created_at DESC`
        )
        .bind(userId)
        .all<Site>();
    return r.results;
}

// Mantém para compatibilidade
export async function createSite(
    db: D1Database,
    data: { name: string; domain: string; ownerId: number | null }
): Promise<{ siteId: number; token: string }> {
    const token = crypto.randomUUID().replace(/-/g, "");
    const r = await db
        .prepare(
            "INSERT INTO sites (name, domain, token, owner_id) VALUES (?, ?, ?, ?)"
        )
        .bind(data.name, data.domain, token, data.ownerId)
        .run();
    return { siteId: Number(r.meta.last_row_id), token };
}

export async function createSiteWithOwner(
    db: D1Database,
    data: { name: string; domain: string; ownerId: number }
): Promise<{ siteId: number; token: string }> {
    const token = crypto.randomUUID().replace(/-/g, "");
    const r = await db
        .prepare(
            "INSERT INTO sites (name, domain, token, owner_id) VALUES (?, ?, ?, ?)"
        )
        .bind(data.name, data.domain, token, data.ownerId)
        .run();
    return { siteId: Number(r.meta.last_row_id), token };
}

export async function deleteSite(db: D1Database, id: number): Promise<void> {
    await db.prepare("DELETE FROM sites WHERE id = ?").bind(id).run();
}

// ── Tickets ────────────────────────────────────────────────────

export async function getTickets(
    db: D1Database,
    filters?: { siteId?: number; status?: string }
): Promise<Ticket[]> {
    let q = `
    SELECT t.*, s.name AS site_name
    FROM tickets t
    JOIN sites s ON t.site_id = s.id
    WHERE 1=1
  `;
    const p: (string | number)[] = [];
    if (filters?.siteId) { q += " AND t.site_id = ?"; p.push(filters.siteId); }
    if (filters?.status) { q += " AND t.status = ?";  p.push(filters.status); }
    q += " ORDER BY t.created_at DESC";
    const r = await db.prepare(q).bind(...p).all<Ticket>();
    return r.results;
}

export async function getTicketById(
    db: D1Database,
    id: number
): Promise<Ticket | null> {
    return db
        .prepare(
            `SELECT t.*, s.name AS site_name
       FROM tickets t
       JOIN sites s ON t.site_id = s.id
       WHERE t.id = ?`
        )
        .bind(id)
        .first<Ticket>();
}

export async function getTicketByPublicToken(
    db: D1Database,
    token: string
): Promise<Ticket | null> {
    return db
        .prepare(
            `SELECT t.*, s.name AS site_name
       FROM tickets t
       JOIN sites s ON t.site_id = s.id
       WHERE t.public_token = ?`
        )
        .bind(token)
        .first<Ticket>();
}

export async function getTicketMessages(
    db: D1Database,
    ticketId: number
): Promise<TicketMessage[]> {
    const r = await db
        .prepare(
            "SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC"
        )
        .bind(ticketId)
        .all<TicketMessage>();
    return r.results;
}

export async function createTicketMessage(
    db: D1Database,
    data: { ticketId: number; sender: "admin" | "client"; message: string }
): Promise<number> {
    const r = await db
        .prepare(
            "INSERT INTO ticket_messages (ticket_id, sender, message) VALUES (?, ?, ?)"
        )
        .bind(data.ticketId, data.sender, data.message)
        .run();
    return Number(r.meta.last_row_id);
}

export async function updateTicketStatus(
    db: D1Database,
    ticketId: number,
    status: string
): Promise<void> {
    await db
        .prepare("UPDATE tickets SET status = ? WHERE id = ?")
        .bind(status, ticketId)
        .run();
}

export async function createTicket(
    db: D1Database,
    data: {
        siteId: number;
        clientName: string;
        clientEmail: string;
        category: string;
        description: string;
    }
): Promise<{ id: number; publicToken: string }> {
    const publicToken = crypto.randomUUID().replace(/-/g, "");
    const r = await db
        .prepare(
            `INSERT INTO tickets (site_id, client_name, client_email, category, description, public_token)
       VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(
            data.siteId,
            data.clientName,
            data.clientEmail,
            data.category,
            data.description,
            publicToken
        )
        .run();
    return { id: Number(r.meta.last_row_id), publicToken };
}

export async function getTicketsBySiteIds(
    db: D1Database,
    siteIds: number[]
): Promise<Ticket[]> {
    if (siteIds.length === 0) return [];
    const placeholders = inClausePlaceholders(siteIds.length);
    const r = await db
        .prepare(
            `SELECT t.*, s.name AS site_name
       FROM tickets t
       JOIN sites s ON t.site_id = s.id
       WHERE t.site_id IN (${placeholders})
       ORDER BY t.created_at DESC`
        )
        .bind(...siteIds)
        .all<Ticket>();
    return r.results;
}

// ── Invoices ───────────────────────────────────────────────────

export async function getInvoices(
    db: D1Database,
    filters?: { siteId?: number; status?: string }
): Promise<Invoice[]> {
    let q = `
    SELECT i.*, s.name AS site_name, u.name AS owner_name
    FROM invoices i
    JOIN sites s ON i.site_id = s.id
    LEFT JOIN users u ON s.owner_id = u.id
    WHERE 1=1
  `;
    const p: (string | number)[] = [];
    if (filters?.siteId) { q += " AND i.site_id = ?"; p.push(filters.siteId); }
    if (filters?.status) { q += " AND i.status = ?";  p.push(filters.status); }
    q += " ORDER BY i.created_at DESC";
    const r = await db.prepare(q).bind(...p).all<Invoice>();
    return r.results;
}

export async function getInvoiceById(
    db: D1Database,
    id: number
): Promise<Invoice | null> {
    return db
        .prepare(
            `SELECT i.*, s.name AS site_name, u.name AS owner_name
       FROM invoices i
       JOIN sites s ON i.site_id = s.id
       LEFT JOIN users u ON s.owner_id = u.id
       WHERE i.id = ?`
        )
        .bind(id)
        .first<Invoice>();
}

export async function createInvoice(
    db: D1Database,
    data: {
        siteId: number;
        description: string;
        amount: number;
        dueDate: string | null;
    }
): Promise<number> {
    const r = await db
        .prepare(
            "INSERT INTO invoices (site_id, description, amount, due_date) VALUES (?, ?, ?, ?)"
        )
        .bind(data.siteId, data.description, data.amount, data.dueDate)
        .run();
    return Number(r.meta.last_row_id);
}

export async function markInvoicePaid(
    db: D1Database,
    id: number
): Promise<void> {
    await db
        .prepare(
            "UPDATE invoices SET status = 'paid', paid_at = datetime('now') WHERE id = ?"
        )
        .bind(id)
        .run();
}

export async function deleteInvoice(
    db: D1Database,
    id: number
): Promise<void> {
    await db.prepare("DELETE FROM invoices WHERE id = ?").bind(id).run();
}

export async function getInvoicesBySiteIds(
    db: D1Database,
    siteIds: number[]
): Promise<Invoice[]> {
    if (siteIds.length === 0) return [];
    const placeholders = inClausePlaceholders(siteIds.length);
    const r = await db
        .prepare(
            `SELECT i.*, s.name AS site_name, u.name AS owner_name
       FROM invoices i
       JOIN sites s ON i.site_id = s.id
       LEFT JOIN users u ON s.owner_id = u.id
       WHERE i.site_id IN (${placeholders})
       ORDER BY i.created_at DESC`
        )
        .bind(...siteIds)
        .all<Invoice>();
    return r.results;
}

// ── Attachments ────────────────────────────────────────────────

export async function getAttachments(
    db: D1Database,
    entityType: string,
    entityId: number
): Promise<Attachment[]> {
    const r = await db
        .prepare(
            `SELECT * FROM attachments
       WHERE entity_type = ? AND entity_id = ?
       ORDER BY created_at ASC`
        )
        .bind(entityType, entityId)
        .all<Attachment>();
    return r.results;
}

export async function createAttachment(
    db: D1Database,
    data: {
        entityType: string;
        entityId: number;
        fileName: string;
        fileType: string;
        fileSize: number;
        r2Key: string;
    }
): Promise<number> {
    const r = await db
        .prepare(
            `INSERT INTO attachments (entity_type, entity_id, file_name, file_type, file_size, r2_key)
       VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(
            data.entityType,
            data.entityId,
            data.fileName,
            data.fileType,
            data.fileSize,
            data.r2Key
        )
        .run();
    return Number(r.meta.last_row_id);
}

export async function deleteAttachment(
    db: D1Database,
    id: number
): Promise<string | null> {
    const row = await db
        .prepare("SELECT r2_key FROM attachments WHERE id = ?")
        .bind(id)
        .first<{ r2_key: string }>();
    if (!row) return null;
    await db.prepare("DELETE FROM attachments WHERE id = ?").bind(id).run();
    return row.r2_key;
}

export async function getAttachmentsByEntityIds(
    db: D1Database,
    entityType: string,
    entityIds: number[]
): Promise<Attachment[]> {
    if (entityIds.length === 0) return [];
    const placeholders = inClausePlaceholders(entityIds.length);
    const r = await db
        .prepare(
            `SELECT * FROM attachments
       WHERE entity_type = ? AND entity_id IN (${placeholders})
       ORDER BY created_at ASC`
        )
        .bind(entityType, ...entityIds)
        .all<Attachment>();
    return r.results;
}
