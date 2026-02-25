import { redirect } from "react-router";
import type { Route } from "./+types/admin.logout";
import { destroySession, clearSessionCookie } from "~/lib/auth.server";

export async function action({ request, context }: Route.ActionArgs) {
    const db = context.cloudflare.env.DB;
    await destroySession(db, request);
    throw redirect("/admin", {
        headers: { "Set-Cookie": clearSessionCookie() },
    });
}
