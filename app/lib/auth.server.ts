const SESSION_COOKIE = "sid";
const DAYS_30 = 60 * 60 * 24 * 30;

// ── Password hashing via PBKDF2 (Web Crypto nativo nos Workers) ──

export async function hashPassword(password: string): Promise<string> {
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
        key, 256
    );
    return JSON.stringify({ salt: Array.from(salt), hash: Array.from(new Uint8Array(bits)) });
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
    try {
        const { salt, hash } = JSON.parse(stored);
        const enc = new TextEncoder();
        const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
        const bits = await crypto.subtle.deriveBits(
            { name: "PBKDF2", salt: new Uint8Array(salt), iterations: 100000, hash: "SHA-256" },
            key, 256
        );
        const newHash = Array.from(new Uint8Array(bits));
        return hash.length === newHash.length && (hash as number[]).every((b, i) => b === newHash[i]);
    } catch { return false; }
}

// ── Sessões ──

export async function createSession(db: D1Database, userId: number): Promise<string> {
    const id = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
    const expires = new Date(Date.now() + DAYS_30 * 1000).toISOString();
    await db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
        .bind(id, userId, expires).run();
    return id;
}

export async function getSessionUser(db: D1Database, request: Request) {
    const cookies = parseCookies(request.headers.get("Cookie") || "");
    const sid = cookies[SESSION_COOKIE];
    if (!sid) return null;
    return db.prepare(`
    SELECT u.id, u.name, u.email, u.role FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND s.expires_at > datetime('now')
  `).bind(sid).first<{ id: number; name: string; email: string; role: string }>();
}

export async function destroySession(db: D1Database, request: Request): Promise<void> {
    const sid = parseCookies(request.headers.get("Cookie") || "")[SESSION_COOKIE];
    if (sid) await db.prepare("DELETE FROM sessions WHERE id = ?").bind(sid).run();
}

export const setSessionCookie = (id: string) =>
    `${SESSION_COOKIE}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DAYS_30}`;

export const clearSessionCookie = () =>
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

function parseCookies(header: string) {
    return Object.fromEntries(
        header.split(";").map((c) => {
            const [k, ...v] = c.trim().split("=");
            return [k.trim(), v.join("=")];
        })
    );
}
