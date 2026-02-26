import { data, redirect, Form, useActionData, useSearchParams } from "react-router";
import type { Route } from "./+types/portal.reset-password";
import { getUserByResetToken, clearResetToken } from "~/lib/db";
import { hashPassword } from "~/lib/auth.server";

export async function action({ request, context }: Route.ActionArgs) {
    const db   = context.cloudflare.env.DB;
    const form = await request.formData();
    const token    = String(form.get("token")    || "");
    const password = String(form.get("password") || "").trim();
    const confirm  = String(form.get("confirm")  || "").trim();

    if (password.length < 8)
        return data({ error: "A password deve ter pelo menos 8 caracteres." }, { status: 400 });
    if (password !== confirm)
        return data({ error: "As passwords não coincidem." }, { status: 400 });

    const user = await getUserByResetToken(db, token);
    if (!user)
        return data({ error: "Link inválido ou expirado. Pede um novo reset ao administrador." }, { status: 400 });

    const hash = await hashPassword(password);
    await clearResetToken(db, user.id, hash);

    throw redirect("/portal?reset=1");
}

export default function ResetPassword() {
    const [params] = useSearchParams();
    const result   = useActionData<typeof action>();
    const token    = params.get("token") ?? "";

    return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 dark:bg-gray-950">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-4">
                        <span className="text-white text-xl">🔑</span>
                    </div>
                    <h1 className="text-2xl font-bold">Nova Password</h1>
                    <p className="text-gray-500 text-sm mt-1">Define a tua nova password de acesso</p>
                </div>

                <Form method="post"
                      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 space-y-5">
                    <input type="hidden" name="token" value={token} />

                    {result?.error && (
                        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 px-4 py-2.5 rounded-lg">
                            {result.error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-1.5">Nova password</label>
                        <input name="password" type="password" required
                               className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Confirmar password</label>
                        <input name="confirm" type="password" required
                               className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <button type="submit"
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors">
                        Definir nova password
                    </button>
                </Form>
            </div>
        </div>
    );
}
