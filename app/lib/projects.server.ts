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
