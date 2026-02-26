// app/routes/uploads.$key.ts
import { data } from "react-router";
import type { Route } from "./+types/uploads.$key";
import { getSessionUser } from "~/lib/auth.server";

// Captura qualquer path após /uploads/ incluindo barras (ex: invoice/2/uuid.png)
export const unstable_path = "/uploads/*";

export async function loader({ request, params, context }: Route.LoaderArgs) {
    const env  = context.cloudflare.env;
    const user = await getSessionUser(env.DB, request);
    if (!user) throw data("Não autorizado", { status: 401 });

    // params["*"] captura tudo após /uploads/ incluindo barras
    const key = (params as Record<string, string>)["*"] ?? "";
    if (!key) throw data("Ficheiro não encontrado", { status: 404 });

    const obj = await env.UPLOADS.get(key);
    if (!obj) throw data("Ficheiro não encontrado", { status: 404 });

    const fileName    = key.split("/").pop() ?? "ficheiro";
    const contentType = obj.httpMetadata?.contentType ?? "application/octet-stream";

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    // inline = browser mostra imagem/PDF directamente em vez de forçar download
    headers.set("Content-Disposition", `inline; filename="${fileName}"`);
    headers.set("Cache-Control", "private, max-age=3600");

    return new Response(obj.body as ReadableStream, { headers });
}
