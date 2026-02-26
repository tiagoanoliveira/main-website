// app/routes/admin.clients.tsx
import { data, redirect, useActionData, useLoaderData, Form } from "react-router";
import type { Route } from "./+types/admin.clients";
import { useState } from "react";
import {
    UserPlus, Trash2, Eye, EyeOff,
    Copy, Check, KeyRound, MailCheck,
} from "lucide-react";

import {
    getSites,
    deleteSite,
    getUserByEmail,
    createClientUser,
    createSiteWithOwner,
    setResetToken,
} from "~/lib/db";
import { hashPassword } from "~/lib/auth.server";
import { sendWelcome, sendPasswordReset } from "~/lib/email";

// ── Loader ─────────────────────────────────────────────────────

export async function loader({ context }: Route.LoaderArgs) {
    const db    = context.cloudflare.env.DB;
    const sites = await getSites(db);
    return { sites };
}

// ── Action ─────────────────────────────────────────────────────

export async function action({ request, context }: Route.ActionArgs) {
    const db     = context.cloudflare.env.DB;
    const env    = context.cloudflare.env;
    const form   = await request.formData();
    const intent = String(form.get("intent") || "");

    if (intent === "create") {
        const siteName    = String(form.get("siteName")    || "").trim();
        const domain      = String(form.get("domain")      || "").trim();
        const clientName  = String(form.get("clientName")  || "").trim();
        const clientEmail = String(form.get("clientEmail") || "").trim().toLowerCase();
        const password    = String(form.get("password")    || "").trim();
        const sendEmail   = form.get("sendWelcome") === "on";

        if (!siteName || !domain || !clientName || !clientEmail || !password)
            return data({ intent: "create" as const, error: "Todos os campos são obrigatórios." }, { status: 400 });
        if (!clientEmail.includes("@"))
            return data({ intent: "create" as const, error: "Email inválido." }, { status: 400 });
        if (password.length < 8)
            return data({ intent: "create" as const, error: "A password deve ter pelo menos 8 caracteres." }, { status: 400 });

        const existing = await getUserByEmail(db, clientEmail);
        let ownerId: number;
        let isNewUser = false;

        if (existing) {
            if (existing.role !== "client")
                return data(
                    { intent: "create" as const, error: "Este email já existe mas não é um utilizador cliente." },
                    { status: 400 }
                );
            ownerId = existing.id;
        } else {
            const passwordHash = await hashPassword(password);
            ownerId   = await createClientUser(db, { name: clientName, email: clientEmail, passwordHash });
            isNewUser = true;
        }

        await createSiteWithOwner(db, { name: siteName, domain, ownerId });

        if (isNewUser && sendEmail && env.RESEND_API_KEY) {
            try {
                await sendWelcome({
                    apiKey:     env.RESEND_API_KEY,
                    from:       env.FROM_EMAIL,
                    to:         clientEmail,
                    clientName,
                    password,
                    baseUrl:    env.BASE_URL,
                });
            } catch (err) {
                console.error("Erro ao enviar email de boas-vindas:", err);
            }
        }

        return redirect("/admin/clients");
    }

    if (intent === "resetPassword") {
        const userId = Number(form.get("userId"));
        const email  = String(form.get("userEmail") || "");
        const name   = String(form.get("userName")  || "");

        if (!userId || !email)
            return data({ intent: "reset" as const, resetError: "Dados inválidos." }, { status: 400 });

        const token = crypto.randomUUID().replace(/-/g, "");
        await setResetToken(db, userId, token);

        if (env.RESEND_API_KEY) {
            try {
                await sendPasswordReset({
                    apiKey:     env.RESEND_API_KEY,
                    from:       env.FROM_EMAIL,
                    to:         email,
                    clientName: name,
                    resetToken: token,
                    baseUrl:    env.BASE_URL,
                });
                return data({ intent: "reset" as const, resetSuccess: `Email enviado para ${email}.`, resetLink: null });
            } catch (err) {
                console.error("Erro ao enviar email de reset:", err);
                return data(
                    { intent: "reset" as const, resetError: "Erro ao enviar email. Verifica o RESEND_API_KEY." },
                    { status: 500 }
                );
            }
        }

        return data({
            intent: "reset" as const,
            resetSuccess: null,
            resetLink: `${env.BASE_URL}/portal/reset-password?token=${token}`,
        });
    }

    if (intent === "delete") {
        const id = Number(form.get("id"));
        if (!id) return data({ intent: "delete" as const, error: "ID inválido." }, { status: 400 });
        await deleteSite(db, id);
        return redirect("/admin/clients");
    }

    return null;
}

// ── Componentes auxiliares ──────────────────────────────────────

function CopyButton({ value, label = "" }: { value: string; label?: string }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
    };
    return (
        <button
            type="button"
            onClick={copy}
            className="ml-1.5 inline-flex items-center gap-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors text-xs"
            title={label || "Copiar"}
        >
            {copied ? (
                <><Check size={13} className="text-green-500" />{label && <span className="text-green-500">Copiado!</span>}</>
            ) : (
                <><Copy size={13} />{label && <span>{label}</span>}</>
            )}
        </button>
    );
}

function SiteRow({
                     site,
                 }: {
    site: ReturnType<typeof useLoaderData<typeof loader>>["sites"][number];
}) {
    return (
        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <td className="px-6 py-4 font-medium">{site.name}</td>
            <td className="px-6 py-4">
                {site.owner_name
                    ? <span className="text-gray-700 dark:text-gray-300">{site.owner_name}</span>
                    : <span className="italic text-gray-300 dark:text-gray-600">sem dono</span>}
            </td>
            <td className="px-6 py-4 text-gray-500 text-xs">{site.domain}</td>
            <td className="px-6 py-4">
                <div className="flex items-center">
                    <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">
                        {site.token.slice(0, 16)}…
                    </code>
                    <CopyButton value={site.token} />
                </div>
            </td>
            <td className="px-6 py-4">
                <a
                    href={`/support/${site.token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                    Abrir →
                </a>
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-3">
                    {site.owner_id && (
                        <Form method="post">
                            <input type="hidden" name="intent"    value="resetPassword" />
                            <input type="hidden" name="userId"    value={site.owner_id} />
                            <input type="hidden" name="userEmail" value={site.owner_email ?? ""} />
                            <input type="hidden" name="userName"  value={site.owner_name ?? ""} />
                            <button
                                type="submit"
                                title="Enviar email de recuperação de password"
                                className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors"
                            >
                                <KeyRound size={14} />
                                <span className="hidden sm:inline">Reset pw</span>
                            </button>
                        </Form>
                    )}

                    <Form
                        method="post"
                        onSubmit={(e) => !confirm("Remover este site?") && e.preventDefault()}
                    >
                        <input type="hidden" name="intent" value="delete" />
                        <input type="hidden" name="id"     value={site.id} />
                        <button
                            type="submit"
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            title="Remover site"
                        >
                            <Trash2 size={15} />
                        </button>
                    </Form>
                </div>
            </td>
        </tr>
    );
}

// ── Página principal ────────────────────────────────────────────

export default function AdminClients() {
    const { sites } = useLoaderData<typeof loader>();
    const result    = useActionData<typeof action>();
    const [showPass, setShowPass] = useState(false);
    const [showForm, setShowForm] = useState(sites.length === 0);

    // Extrair valores do result de forma type-safe
    const createError  = result?.intent === "create" && "error"        in result ? result.error        : null;
    const resetSuccess = result?.intent === "reset"  && "resetSuccess" in result ? result.resetSuccess : null;
    const resetError   = result?.intent === "reset"  && "resetError"   in result ? result.resetError   : null;
    const resetLink    = result?.intent === "reset"  && "resetLink"    in result ? result.resetLink    : null;

    return (
        <div>
            {/* Cabeçalho */}
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold">Clientes & Sites</h1>
                <button
                    type="button"
                    onClick={() => setShowForm((v) => !v)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
                >
                    <UserPlus size={16} />
                    Novo Cliente
                </button>
            </div>

            {/* Feedback reset de password */}
            {resetSuccess && (
                <div className="flex items-center gap-2 mb-6 px-4 py-3 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-sm rounded-xl border border-green-200 dark:border-green-900">
                    <MailCheck size={16} />
                    {resetSuccess}
                </div>
            )}
            {resetError && (
                <div className="mb-6 px-4 py-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-200 dark:border-red-900">
                    {resetError}
                </div>
            )}
            {resetLink && (
                <div className="mb-6 px-4 py-3 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-sm rounded-xl border border-amber-200 dark:border-amber-800">
                    <p className="font-medium mb-1">RESEND_API_KEY não configurado — copia o link manualmente:</p>
                    <div className="flex items-center gap-2 font-mono text-xs bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 break-all">
                        {resetLink}
                        <CopyButton value={resetLink} label="Copiar" />
                    </div>
                </div>
            )}

            {/* Formulário de criação */}
            {showForm && (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 mb-8">
                    <h2 className="font-semibold mb-1">Adicionar cliente e site</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                        Cria o utilizador do cliente e associa logo o site via{" "}
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">owner_id</code>.
                    </p>

                    <Form method="post" className="space-y-5">
                        <input type="hidden" name="intent" value="create" />

                        {createError && (
                            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 px-4 py-2.5 rounded-lg">
                                {createError}
                            </div>
                        )}

                        {/* Dados do site */}
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                Dados do site
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium mb-1.5 text-gray-600 dark:text-gray-400">
                                        Nome do site
                                    </label>
                                    <input
                                        name="siteName"
                                        placeholder="Barbearia Brooklyn"
                                        required
                                        className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1.5 text-gray-600 dark:text-gray-400">
                                        Domínio
                                    </label>
                                    <input
                                        name="domain"
                                        placeholder="barbearia-brooklyn.pt"
                                        required
                                        className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Credenciais do cliente */}
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                Credenciais do cliente
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium mb-1.5 text-gray-600 dark:text-gray-400">
                                        Nome
                                    </label>
                                    <input
                                        name="clientName"
                                        placeholder="João Silva"
                                        required
                                        className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1.5 text-gray-600 dark:text-gray-400">
                                        Email
                                    </label>
                                    <input
                                        name="clientEmail"
                                        type="email"
                                        placeholder="joao@email.com"
                                        required
                                        className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1.5 text-gray-600 dark:text-gray-400">
                                        Password inicial
                                    </label>
                                    <div className="relative">
                                        <input
                                            name="password"
                                            type={showPass ? "text" : "password"}
                                            placeholder="mín. 8 caracteres"
                                            required
                                            className="w-full px-3 py-2.5 pr-10 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPass((v) => !v)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                            title={showPass ? "Ocultar" : "Mostrar"}
                                        >
                                            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    name="sendWelcome"
                                    defaultChecked
                                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Enviar email de boas-vindas com credenciais de acesso ao portal
                </span>
                            </label>
                            <p className="text-xs text-gray-400 mt-1.5">
                                Se o email já existir (role client), o site é associado ao utilizador existente.
                            </p>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
                            >
                                Criar
                            </button>
                        </div>
                    </Form>
                </div>
            )}

            {/* Tabela de sites */}
            {sites.length === 0 ? (
                <p className="text-center text-gray-400 py-12">Ainda não tens sites registados.</p>
            ) : (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="text-left px-6 py-3 font-medium text-gray-500">Site</th>
                            <th className="text-left px-6 py-3 font-medium text-gray-500">Cliente</th>
                            <th className="text-left px-6 py-3 font-medium text-gray-500">Domínio</th>
                            <th className="text-left px-6 py-3 font-medium text-gray-500">Token do Widget</th>
                            <th className="text-left px-6 py-3 font-medium text-gray-500">Form suporte</th>
                            <th className="px-6 py-3" />
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {sites.map((site) => (
                            <SiteRow key={site.id} site={site} />
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
