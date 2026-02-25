// ── Types ──────────────────────────────────────────────────────

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

// ── Sites ──────────────────────────────────────────────────────

export async function getSites(db: D1Database): Promise<Site[]> {
    const r = await db.prepare(`
    SELECT s.*, u.name as owner_name
    FROM sites s LEFT JOIN users u ON s.owner_id = u.id
    ORDER BY s.created_at DESC
  `).all<Site>();
    return r.results;
}

export async function getSiteById(db: D1Database, id: number): Promise<Site | null> {
    return db.prepare(`
    SELECT s.*, u.name as owner_name
    FROM sites s LEFT JOIN users u ON s.owner_id = u.id
    WHERE s.id = ?
  `).bind(id).first<Site>();
}

export async function createSite(
    db: D1Database,
    data: { name: string; domain: string; ownerId: number | null }
): Promise<void> {
    const token = crypto.randomUUID().replace(/-/g, "");
    await db.prepare(
        "INSERT INTO sites (name, domain, token, owner_id) VALUES (?, ?, ?, ?)"
    ).bind(data.name, data.domain, token, data.ownerId).run();
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
    FROM tickets t JOIN sites s ON t.site_id = s.id WHERE 1=1
  `;
    const p: (string | number)[] = [];
    if (filters?.siteId) { q += " AND t.site_id = ?"; p.push(filters.siteId); }
    if (filters?.status)  { q += " AND t.status = ?";  p.push(filters.status); }
    q += " ORDER BY t.created_at DESC";
    const r = await db.prepare(q).bind(...p).all<Ticket>();
    return r.results;
}

export async function getTicketById(db: D1Database, id: number): Promise<Ticket | null> {
    return db.prepare(`
    SELECT t.*, s.name as site_name
    FROM tickets t JOIN sites s ON t.site_id = s.id
    WHERE t.id = ?
  `).bind(id).first<Ticket>();
}

export async function getTicketMessages(
    db: D1Database,
    ticketId: number
): Promise<TicketMessage[]> {
    const r = await db.prepare(
        "SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC"
    ).bind(ticketId).all<TicketMessage>();
    return r.results;
}

export async function createTicketMessage(
    db: D1Database,
    data: { ticketId: number; sender: string; message: string }
): Promise<void> {
    await db.prepare(
        "INSERT INTO ticket_messages (ticket_id, sender, message) VALUES (?, ?, ?)"
    ).bind(data.ticketId, data.sender, data.message).run();
}

export async function updateTicketStatus(
    db: D1Database,
    ticketId: number,
    status: string
): Promise<void> {
    await db.prepare("UPDATE tickets SET status = ? WHERE id = ?")
        .bind(status, ticketId).run();
}

export async function getTicketByPublicToken(
    db: D1Database,
    token: string
): Promise<Ticket | null> {
    return db.prepare(`
    SELECT t.*, s.name as site_name
    FROM tickets t JOIN sites s ON t.site_id = s.id
    WHERE t.public_token = ?
  `).bind(token).first<Ticket>();
}
