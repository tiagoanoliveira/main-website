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

// ── Sites ──────────────────────────────────────────────────────

export async function getSites(db: D1Database): Promise<Site[]> {
    const r = await db
        .prepare(`
      SELECT s.*, u.name as owner_name
      FROM sites s
      LEFT JOIN users u ON s.owner_id = u.id
      ORDER BY s.created_at DESC
    `)
        .all<Site>();

    return r.results;
}

export async function getSiteById(
    db: D1Database,
    id: number
): Promise<Site | null> {
    return db
        .prepare(
            `
      SELECT s.*, u.name as owner_name
      FROM sites s
      LEFT JOIN users u ON s.owner_id = u.id
      WHERE s.id = ?
    `
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
            `
      SELECT s.*, u.name as owner_name
      FROM sites s
      LEFT JOIN users u ON s.owner_id = u.id
      WHERE s.token = ?
    `
        )
        .bind(token)
        .first<Site>();
}

// Mantém para compatibilidade (caso ainda uses nalgum lado)
export async function createSite(
    db: D1Database,
    data: { name: string; domain: string; ownerId: number | null }
): Promise<{ siteId: number; token: string }> {
    const token = crypto.randomUUID().replace(/-/g, "");
    const r = await db
        .prepare("INSERT INTO sites (name, domain, token, owner_id) VALUES (?, ?, ?, ?)")
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
        .prepare("INSERT INTO sites (name, domain, token, owner_id) VALUES (?, ?, ?, ?)")
        .bind(data.name, data.domain, token, data.ownerId)
        .run();

    return { siteId: Number(r.meta.last_row_id), token };
}

export async function getSitesByOwner(
    db: D1Database,
    userId: number
): Promise<Site[]> {
    const r = await db
        .prepare(
            `
      SELECT s.*, u.name as owner_name
      FROM sites s
      LEFT JOIN users u ON s.owner_id = u.id
      WHERE s.owner_id = ?
      ORDER BY s.created_at DESC
    `
        )
        .bind(userId)
        .all<Site>();

    return r.results;
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
    SELECT t.*, s.name as site_name
    FROM tickets t
    JOIN sites s ON t.site_id = s.id
    WHERE 1=1
  `;
    const p: (string | number)[] = [];

    if (filters?.siteId) {
        q += " AND t.site_id = ?";
        p.push(filters.siteId);
    }
    if (filters?.status) {
        q += " AND t.status = ?";
        p.push(filters.status);
    }

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
            `
      SELECT t.*, s.name as site_name
      FROM tickets t
      JOIN sites s ON t.site_id = s.id
      WHERE t.id = ?
    `
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
            `
      SELECT t.*, s.name as site_name
      FROM tickets t
      JOIN sites s ON t.site_id = s.id
      WHERE t.public_token = ?
    `
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
): Promise<void> {
    await db
        .prepare(
            "INSERT INTO ticket_messages (ticket_id, sender, message) VALUES (?, ?, ?)"
        )
        .bind(data.ticketId, data.sender, data.message)
        .run();
}

export async function updateTicketStatus(
    db: D1Database,
    ticketId: number,
    status: "open" | "in_progress" | "closed" | string
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
        .prepare(`
      INSERT INTO tickets (site_id, client_name, client_email, category, description, public_token)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
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

function inClausePlaceholders(n: number) {
    return Array.from({ length: n }, () => "?").join(",");
}

export async function getTicketsBySiteIds(
    db: D1Database,
    siteIds: number[]
): Promise<Ticket[]> {
    if (siteIds.length === 0) return [];
    const placeholders = inClausePlaceholders(siteIds.length);

    const r = await db
        .prepare(
            `
      SELECT t.*, s.name as site_name
      FROM tickets t
      JOIN sites s ON t.site_id = s.id
      WHERE t.site_id IN (${placeholders})
      ORDER BY t.created_at DESC
    `
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
    SELECT i.*, s.name as site_name, u.name as owner_name
    FROM invoices i
    JOIN sites s ON i.site_id = s.id
    LEFT JOIN users u ON s.owner_id = u.id
    WHERE 1=1
  `;
    const p: (string | number)[] = [];

    if (filters?.siteId) {
        q += " AND i.site_id = ?";
        p.push(filters.siteId);
    }
    if (filters?.status) {
        q += " AND i.status = ?";
        p.push(filters.status);
    }

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
            `
      SELECT i.*, s.name as site_name, u.name as owner_name
      FROM invoices i
      JOIN sites s ON i.site_id = s.id
      LEFT JOIN users u ON s.owner_id = u.id
      WHERE i.id = ?
    `
        )
        .bind(id)
        .first<Invoice>();
}

export async function createInvoice(
    db: D1Database,
    data: { siteId: number; description: string; amount: number; dueDate: string | null }
): Promise<number> {
    const r = await db
        .prepare(
            "INSERT INTO invoices (site_id, description, amount, due_date) VALUES (?, ?, ?, ?)"
        )
        .bind(data.siteId, data.description, data.amount, data.dueDate)
        .run();

    return Number(r.meta.last_row_id);
}

export async function markInvoicePaid(db: D1Database, id: number): Promise<void> {
    await db
        .prepare(
            "UPDATE invoices SET status = 'paid', paid_at = datetime('now') WHERE id = ?"
        )
        .bind(id)
        .run();
}

export async function deleteInvoice(db: D1Database, id: number): Promise<void> {
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
            `
      SELECT i.*, s.name as site_name, u.name as owner_name
      FROM invoices i
      JOIN sites s ON i.site_id = s.id
      LEFT JOIN users u ON s.owner_id = u.id
      WHERE i.site_id IN (${placeholders})
      ORDER BY i.created_at DESC
    `
        )
        .bind(...siteIds)
        .all<Invoice>();

    return r.results;
}
