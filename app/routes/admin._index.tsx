import { data, redirect, Form, useActionData } from "react-router";
import type { Route } from "./+types/admin._index";
import { verifyPassword, createSession, setSessionCookie, getSessionUser } from "~/lib/auth.server";

export async function loader({ request, context }: Route.LoaderArgs) {
    const db = context.cloudflare.env.DB;
    const user = await getSessionUser(db, request);
    if (user?.role === "admin") throw redirect("/admin/dashboard");
    return null;
}

export async function action({ request, context }: Route.ActionArgs) {
    const db = context.cloudflare.env.DB;
    const form = await request.formData();
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");

    const user = await db.prepare(
        "SELECT id, password_hash, role FROM users WHERE email = ?"
    ).bind(email).first<{ id: number; password_hash: string; role: string }>();

    if (!user || user.role !== "admin" || !(await verifyPassword(password, user.password_hash))) {
        return data({ error: "Email ou password incorretos." }, { status: 401 });
    }

    const sessionId = await createSession(db, user.id);
    throw redirect("/admin/dashboard", {
        headers: { "Set-Cookie": setSessionCookie(sessionId) },
    });
}

export default function AdminLogin() {
    const result = useActionData<typeof action>();
    return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 dark:bg-gray-950">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold">Acesso Admin</h1>
                    <p className="text-gray-500 text-sm mt-1">Introduz as tuas credenciais</p>
                </div>
                <Form method="post" className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 space-y-5">
                    {result?.error && (
                        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 p-3 rounded-lg">
                            {result.error}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Email</label>
                        <input name="email" type="email" required
                               className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Password</label>
                        <input name="password" type="password" required
                               className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                    </div>
                    <button type="submit"
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm">
                        Entrar
                    </button>
                </Form>
            </div>
        </div>
    );
}
