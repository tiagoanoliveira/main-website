// app/routes/uploads.$key.ts
import { data } from "react-router";
import type { Route } from "./+types/uploads.$key";
import { getSessionUser } from "~/lib/auth.server";

// Captura qualquer path como "pasta/subpasta/ficheiro.pdf"
export const unstable_path = "/uploads/*";

export async function loader({ request, params, context }: Route.LoaderArgs) {
    const env  = context.cloudflare.env;
    const user = await getSessionUser(env.DB, request);
    if (!user) throw data("Não autorizado", { status: 401 });

    const key = params["*"] ?? "";
    const obj = await env.UPLOADS.get(key);
    if (!obj) throw data("Ficheiro não encontrado", { status: 404 });

    const headers = new Headers();
    headers.set("Content-Type", obj.httpMetadata?.contentType ?? "application/octet-stream");
    headers.set("Cache-Control", "private, max-age=3600");

    return new Response(obj.body, { headers });
}
