// app/lib/projects.server.ts
import type { D1Database } from "@cloudflare/workers-types";

export interface Project {
    id: number;
    slug: string;
    title: string;
    category: string;
    order_index: number;
    summary: string;
    description: string;
    link: string | null;
    cover_image_key: string | null;
    image_1_key: string | null;
    image_2_key: string | null;
    image_3_key: string | null;
    tags: string; // JSON string
    completed_at: string | null;
    complexity: number;
    is_published: number;
    created_at: string;
}

export type SortField = "order_index" | "completed_at" | "complexity" | "created_at";
export type SortDir   = "asc" | "desc";

export async function getPublishedProjects(
    db: D1Database,
    opts: {
        search?:   string;
        category?: string;
        tag?:      string;
        sortBy?:   SortField;
        sortDir?:  SortDir;
        limit?:    number;
        offset?:   number;
    } = {}
): Promise<Project[]> {
    const {
        search, category, tag,
        sortBy = "order_index", sortDir = "asc",
        limit, offset = 0,
    } = opts;

    const conditions: string[] = ["is_published = 1"];
    const params: (string | number)[] = [];

    if (search) {
        conditions.push("(title LIKE ? OR summary LIKE ? OR description LIKE ?)");
        const q = `%${search}%`;
        params.push(q, q, q);
    }
    if (category) {
        conditions.push("category = ?");
        params.push(category);
    }
    if (tag) {
        // pesquisa simples dentro do JSON array
        conditions.push(`tags LIKE ?`);
        params.push(`%"${tag}"%`);
    }

    const colMap: Record<string, string> = {
        order_index: "order_index", completed_at: "completed_at",
        complexity:  "complexity",  created_at:   "created_at",
    };
    const col = colMap[sortBy] ?? "order_index";
    const dir = sortDir === "desc" ? "DESC" : "ASC";

    let sql = `SELECT * FROM projects WHERE ${conditions.join(" AND ")} ORDER BY ${col} ${dir}`;
    if (limit) {
        sql += " LIMIT ? OFFSET ?";
        params.push(limit, offset);
    }

    const { results } = await db.prepare(sql).bind(...params).all<Project>();
    return results ?? [];
}

export async function getProjectBySlug(db: D1Database, slug: string): Promise<Project | null> {
    return db
        .prepare("SELECT * FROM projects WHERE slug = ? AND is_published = 1")
        .bind(slug)
        .first<Project>();
}

export async function getDistinctCategories(db: D1Database): Promise<string[]> {
    const { results } = await db
        .prepare("SELECT DISTINCT category FROM projects WHERE is_published = 1 ORDER BY category")
        .all<{ category: string }>();
    return (results ?? []).map((r) => r.category);
}

// Extrai todas as tags únicas (percorre os JSON arrays)
export async function getAllTags(db: D1Database): Promise<string[]> {
    const { results } = await db
        .prepare("SELECT tags FROM projects WHERE is_published = 1")
        .all<{ tags: string }>();
    const set = new Set<string>();
    for (const row of results ?? []) {
        try {
            const arr: string[] = JSON.parse(row.tags);
            arr.forEach((t) => set.add(t));
        } catch {}
    }
    return [...set].sort();
}

// ── Admin CRUD ──────────────────────────────────────────────────

export async function getAllProjectsForAdmin(db: D1Database): Promise<Project[]> {
    const { results } = await db
        .prepare("SELECT * FROM projects ORDER BY order_index ASC, created_at DESC")
        .all<Project>();
    return results ?? [];
}

export async function getProjectById(db: D1Database, id: number): Promise<Project | null> {
    return db.prepare("SELECT * FROM projects WHERE id = ?").bind(id).first<Project>();
}

export async function createProject(
    db: D1Database,
    data: {
        slug: string; title: string; category: string; order_index: number;
        summary: string; description: string; link: string | null;
        cover_image_key: string | null; image_1_key: string | null;
        image_2_key: string | null; image_3_key: string | null;
        tags: string; completed_at: string | null; complexity: number; is_published: number;
    }
): Promise<number> {
    const r = await db.prepare(`
    INSERT INTO projects (
      slug, title, category, order_index, summary, description, link,
      cover_image_key, image_1_key, image_2_key, image_3_key,
      tags, completed_at, complexity, is_published, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).bind(
        data.slug, data.title, data.category, data.order_index,
        data.summary, data.description, data.link,
        data.cover_image_key, data.image_1_key, data.image_2_key, data.image_3_key,
        data.tags, data.completed_at, data.complexity, data.is_published
    ).run();
    return Number(r.meta.last_row_id);
}

export async function updateProject(
    db: D1Database, id: number,
    data: Partial<Omit<Project, "id" | "created_at">>
): Promise<void> {
    const fieldMap: (keyof typeof data)[] = [
        "slug", "title", "category", "order_index", "summary", "description", "link",
        "cover_image_key", "image_1_key", "image_2_key", "image_3_key",
        "tags", "completed_at", "complexity", "is_published",
    ];
    const sets: string[] = [];
    const vals: (string | number | null)[] = [];
    for (const f of fieldMap) {
        if (data[f] !== undefined) {
            sets.push(`${f} = ?`);
            vals.push(data[f] as string | number | null);
        }
    }
    if (sets.length === 0) return;
    sets.push("updated_at = datetime('now')");
    vals.push(id);
    await db.prepare(`UPDATE projects SET ${sets.join(", ")} WHERE id = ?`).bind(...vals).run();
}

export async function deleteProjectById(db: D1Database, id: number): Promise<Project | null> {
    const project = await db.prepare("SELECT * FROM projects WHERE id = ?").bind(id).first<Project>();
    if (!project) return null;
    await db.prepare("DELETE FROM projects WHERE id = ?").bind(id).run();
    return project;
}
