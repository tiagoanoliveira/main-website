// app/routes/uploads.$key.ts
import { data } from "react-router";
import type { Route } from "./+types/uploads.$key";
import { getSessionUser } from "~/lib/auth.server";

export const unstable_path = "/uploads/*";

// Prefixos de ficheiros públicos (sem autenticação necessária)
const PUBLIC_PREFIXES = [
    "projects/",
    "clients/",
];

export async function loader({ request, params, context }: Route.LoaderArgs) {
    const env = context.cloudflare.env;
    const key = (params as Record<string, string>)["*"] ?? "";

    if (!key) throw data("Ficheiro não encontrado", { status: 404 });

    // Verifica se o ficheiro é público
    const isPublic = PUBLIC_PREFIXES.some((prefix) => key.startsWith(prefix));

    // Se não for público, exige autenticação
    if (!isPublic) {
        const user = await getSessionUser(env.DB, request);
        if (!user) throw data("Não autorizado", { status: 401 });
    }

    const obj = await env.UPLOADS.get(key);
    if (!obj) throw data("Ficheiro não encontrado", { status: 404 });

    const fileName    = key.split("/").pop() ?? "ficheiro";
    const contentType = obj.httpMetadata?.contentType ?? "application/octet-stream";

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Disposition", `inline; filename="${fileName}"`);
    headers.set(
        "Cache-Control",
        isPublic
            ? "public, max-age=31536000, immutable"
            : "private, max-age=3600"
    );

    return new Response(obj.body as ReadableStream, { headers });
}
