import { redirect } from "react-router";
import type { Route } from "./+types/portal.logout";
import { destroySession, clearSessionCookie } from "~/lib/auth.server";

export async function action({ request, context }: Route.ActionArgs) {
    await destroySession(context.cloudflare.env.DB, request);
    throw redirect("/portal", {
        headers: { "Set-Cookie": clearSessionCookie() },
    });
}
