// app/routes/admin.clients.tsx
import { data, redirect, useActionData, useLoaderData, Form } from "react-router";
import type { Route } from "./+types/admin.clients";
import { useState } from "react";
import {
    UserPlus, Trash2, Eye, EyeOff,
    Copy, Check, KeyRound, MailCheck, Pencil, X, Code2,
    Settings2, PlusCircle, MinusCircle, ChevronDown, ChevronUp,
} from "lucide-react";

import {
    getSites,
    deleteSite,
    getUserByEmail,
    createClientUser,
    createSiteWithOwner,
    updateSite,
    setResetToken,
} from "~/lib/db";
import type { ExtraField, CategoryExtraFields, Site } from "~/lib/db";
import { hashPassword } from "~/lib/auth.server";
import { sendWelcome, sendPasswordReset } from "~/lib/email";
import { uploadFile, buildR2Key } from "~/lib/storage";

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
        const brandColor  = String(form.get("brandColor")  || "").trim() || null;

        let logoR2Key: string | null = null;
        const logoFile = form.get("logoFile") as File | null;

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

        const { siteId } = await createSiteWithOwner(db, { name: siteName, domain, ownerId, brandColor: brandColor ?? undefined });

        if (logoFile instanceof File && logoFile.size > 0) {
            try {
                const key = buildR2Key("site_logo", siteId, logoFile.name);
                await uploadFile(env.UPLOADS, key, logoFile);
                logoR2Key = key;
                await updateSite(db, siteId, { name: siteName, domain, brandColor, logoR2Key });
            } catch (err) { console.error("Erro ao fazer upload do logo:", err); }
        }

        if (isNewUser && sendEmail && env.RESEND_API_KEY) {
            try {
                await sendWelcome({
                    apiKey: env.RESEND_API_KEY, from: env.FROM_EMAIL,
                    to: clientEmail, clientName, password, baseUrl: env.BASE_URL,
                });
            } catch (err) { console.error("Erro ao enviar email de boas-vindas:", err); }
        }

        return redirect("/admin/clients");
    }

    if (intent === "update") {
        const id         = Number(form.get("id"));
        const siteName   = String(form.get("siteName")   || "").trim();
        const domain     = String(form.get("domain")     || "").trim();
        const brandColor = String(form.get("brandColor") || "").trim() || null;

        if (!id || !siteName || !domain)
            return data({ intent: "update" as const, error: "Dados inválidos." }, { status: 400 });

        let logoR2Key: string | undefined = undefined;
        const logoFile = form.get("logoFile") as File | null;
        if (logoFile instanceof File && logoFile.size > 0) {
            try {
                const key = buildR2Key("site_logo", id, logoFile.name);
                await uploadFile(env.UPLOADS, key, logoFile);
                logoR2Key = key;
            } catch (err) { console.error("Erro ao fazer upload do logo:", err); }
        }

        await updateSite(db, id, { name: siteName, domain, brandColor, logoR2Key });
        return redirect("/admin/clients");
    }

    // ── Guardar categorias e campos extra ──────────────────────
    if (intent === "updateFormConfig") {
        const id             = Number(form.get("id"));
        const categoriesRaw  = String(form.get("categoriesJson")   || "").trim();
        const extraFieldsRaw = String(form.get("extraFieldsJson")  || "").trim();

        if (!id) return data({ intent: "formConfig" as const, error: "ID inválido." }, { status: 400 });

        // Validar JSON antes de guardar
        let categoriesJson: string | null = null;
        let extraFieldsJson: string | null = null;
        try {
            if (categoriesRaw) { JSON.parse(categoriesRaw); categoriesJson = categoriesRaw; }
        } catch {
            return data({ intent: "formConfig" as const, error: "JSON de categorias inválido." }, { status: 400 });
        }
        try {
            if (extraFieldsRaw) { JSON.parse(extraFieldsRaw); extraFieldsJson = extraFieldsRaw; }
        } catch {
            return data({ intent: "formConfig" as const, error: "JSON de campos extra inválido." }, { status: 400 });
        }

        // Buscar nome e domínio actuais para não os perder no updateSite
        const { getSiteById } = await import("~/lib/db");
        const existing = await getSiteById(db, id);
        if (!existing) return data({ intent: "formConfig" as const, error: "Site não encontrado." }, { status: 404 });

        await updateSite(db, id, {
            name: existing.name,
            domain: existing.domain,
            categoriesJson,
            extraFieldsJson,
        });
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
                    apiKey: env.RESEND_API_KEY, from: env.FROM_EMAIL,
                    to: email, clientName: name, resetToken: token, baseUrl: env.BASE_URL,
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
        <button type="button" onClick={copy}
            className="ml-1.5 inline-flex items-center gap-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors text-xs"
            title={label || "Copiar"}>
            {copied
                ? <><Check size={13} className="text-green-500" />{label && <span className="text-green-500">Copiado!</span>}</>
                : <><Copy size={13} />{label && <span>{label}</span>}</>}
        </button>
    );
}

function EmbedSnippet({ token, baseUrl }: { token: string; baseUrl: string }) {
    const [open, setOpen] = useState(false);
    const snippet = `<iframe\n  src="${baseUrl}/support/${token}"\n  width="100%"\n  height="620"\n  frameborder="0"\n  style="border-radius:12px;border:none;"\n></iframe>`;
    return (
        <>
            <button type="button" onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors"
                title="Código para integrar no website">
                <Code2 size={14} />
                <span className="hidden sm:inline">Embed</span>
            </button>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-sm">Código para integrar no website</h3>
                            <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">Cola este código no teu website onde queres mostrar o formulário de suporte:</p>
                        <div className="relative bg-gray-50 dark:bg-gray-800 rounded-xl p-4 font-mono text-xs whitespace-pre-wrap break-all border border-gray-200 dark:border-gray-700">
                            {snippet}
                            <div className="absolute top-2 right-2"><CopyButton value={snippet} label="Copiar" /></div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// ── Editor visual de categorias e campos extra ──────────────────
function FormConfigEditor({ site }: { site: Site }) {
    const [open, setOpen] = useState(false);

    // Estado local para categorias
    const initCategories = (): string[] => {
        if (!site.categories_json) return [];
        try { return JSON.parse(site.categories_json); } catch { return []; }
    };
    const initExtraRules = (): CategoryExtraFields[] => {
        if (!site.extra_fields_json) return [];
        try { return JSON.parse(site.extra_fields_json); } catch { return []; }
    };

    const [categories, setCategories] = useState<string[]>(initCategories);
    const [extraRules, setExtraRules]  = useState<CategoryExtraFields[]>(initExtraRules);
    const [newCat, setNewCat]          = useState("");
    const [openCat, setOpenCat]        = useState<string | null>(null);

    const addCategory = () => {
        const name = newCat.trim();
        if (!name || categories.includes(name)) return;
        setCategories((prev) => [...prev, name]);
        setNewCat("");
    };

    const removeCategory = (cat: string) => {
        setCategories((prev) => prev.filter((c) => c !== cat));
        setExtraRules((prev) => prev.filter((r) => r.category !== cat));
        if (openCat === cat) setOpenCat(null);
    };

    const getFields = (cat: string): ExtraField[] =>
        extraRules.find((r) => r.category === cat)?.fields ?? [];

    const setFields = (cat: string, fields: ExtraField[]) => {
        setExtraRules((prev) => {
            const filtered = prev.filter((r) => r.category !== cat);
            return fields.length > 0 ? [...filtered, { category: cat, fields }] : filtered;
        });
    };

    const addField = (cat: string) => {
        const fields = getFields(cat);
        setFields(cat, [...fields, { name: "", label: "", type: "text", required: false }]);
    };

    const removeField = (cat: string, idx: number) => {
        const fields = getFields(cat).filter((_, i) => i !== idx);
        setFields(cat, fields);
    };

    const updateField = (cat: string, idx: number, patch: Partial<ExtraField>) => {
        const fields = getFields(cat).map((f, i) => i === idx ? { ...f, ...patch } : f);
        setFields(cat, fields);
    };

    const categoriesJson  = categories.length  > 0 ? JSON.stringify(categories)  : "";
    const extraFieldsJson = extraRules.length   > 0 ? JSON.stringify(extraRules)  : "";

    return (
        <>
            <button type="button" onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-purple-600 transition-colors"
                title="Configurar categorias e campos extra do formulário">
                <Settings2 size={14} />
                <span className="hidden sm:inline">Formulário</span>
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8 px-4"
                    onClick={() => setOpen(false)}>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-2xl w-full shadow-2xl"
                        onClick={(e) => e.stopPropagation()}>

                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h3 className="font-semibold">Formulário — {site.name}</h3>
                                <p className="text-xs text-gray-400 mt-0.5">Categorias e campos extras por categoria</p>
                            </div>
                            <button type="button" onClick={() => setOpen(false)}
                                className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                        </div>

                        {/* Lista de categorias */}
                        <div className="mb-5">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Categorias</p>

                            {categories.length === 0 && (
                                <p className="text-xs text-gray-400 italic mb-3">
                                    Nenhuma categoria definida — o formulário usará as categorias genéricas.
                                </p>
                            )}

                            <div className="space-y-1 mb-3">
                                {categories.map((cat) => (
                                    <div key={cat}>
                                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                                            <button type="button"
                                                onClick={() => setOpenCat(openCat === cat ? null : cat)}
                                                className="flex-1 flex items-center gap-2 text-sm text-left font-medium">
                                                {openCat === cat ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                                                {cat}
                                                {getFields(cat).length > 0 && (
                                                    <span className="text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full px-2 py-0.5">
                                                        {getFields(cat).length} campo{getFields(cat).length !== 1 ? "s" : ""} extra
                                                    </span>
                                                )}
                                            </button>
                                            <button type="button" onClick={() => removeCategory(cat)}
                                                className="text-gray-300 hover:text-red-500 transition-colors" title="Remover categoria">
                                                <MinusCircle size={15} />
                                            </button>
                                        </div>

                                        {/* Editor de campos extra desta categoria */}
                                        {openCat === cat && (
                                            <div className="ml-4 mt-2 mb-3 space-y-3 border-l-2 border-purple-100 dark:border-purple-900 pl-4">
                                                <p className="text-[11px] text-gray-400">Campos extra que aparecem quando o utilizador seleciona «{cat}»</p>

                                                {getFields(cat).map((field, idx) => (
                                                    <div key={idx} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 space-y-2">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="block text-[10px] text-gray-400 mb-1">Nome interno (sem espaços)</label>
                                                                <input
                                                                    value={field.name}
                                                                    onChange={(e) => updateField(cat, idx, { name: e.target.value.replace(/\s/g, "") })}
                                                                    placeholder="orderNumber"
                                                                    className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] text-gray-400 mb-1">Label visível</label>
                                                                <input
                                                                    value={field.label}
                                                                    onChange={(e) => updateField(cat, idx, { label: e.target.value })}
                                                                    placeholder="Nº de Encomenda"
                                                                    className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="block text-[10px] text-gray-400 mb-1">Placeholder (opcional)</label>
                                                                <input
                                                                    value={field.placeholder ?? ""}
                                                                    onChange={(e) => updateField(cat, idx, { placeholder: e.target.value })}
                                                                    placeholder="ex: #1234"
                                                                    className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] text-gray-400 mb-1">Tipo</label>
                                                                <select
                                                                    value={field.type}
                                                                    onChange={(e) => updateField(cat, idx, { type: e.target.value as ExtraField["type"] })}
                                                                    className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                                                                >
                                                                    <option value="text">Texto</option>
                                                                    <option value="number">Número</option>
                                                                    <option value="select">Seleção (dropdown)</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                        {field.type === "select" && (
                                                            <div>
                                                                <label className="block text-[10px] text-gray-400 mb-1">Opções (uma por linha)</label>
                                                                <textarea
                                                                    rows={3}
                                                                    value={(field.options ?? []).join("\n")}
                                                                    onChange={(e) => updateField(cat, idx, { options: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                                                                    placeholder="Tamanho errado\nProduto danificado\nArrependi-me"
                                                                    className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
                                                                />
                                                            </div>
                                                        )}
                                                        <div className="flex items-center justify-between">
                                                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={field.required}
                                                                    onChange={(e) => updateField(cat, idx, { required: e.target.checked })}
                                                                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                                                />
                                                                <span className="text-xs text-gray-500">Campo obrigatório</span>
                                                            </label>
                                                            <button type="button" onClick={() => removeField(cat, idx)}
                                                                className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
                                                                <MinusCircle size={13} /> Remover campo
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}

                                                <button type="button" onClick={() => addField(cat)}
                                                    className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400">
                                                    <PlusCircle size={14} /> Adicionar campo extra
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Adicionar nova categoria */}
                            <div className="flex gap-2">
                                <input
                                    value={newCat}
                                    onChange={(e) => setNewCat(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCategory())}
                                    placeholder="Nova categoria…"
                                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                                <button type="button" onClick={addCategory}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors">
                                    <PlusCircle size={14} /> Adicionar
                                </button>
                            </div>
                        </div>

                        {/* Guardar via Form oculto */}
                        <Form method="post" className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-4">
                            <input type="hidden" name="intent"          value="updateFormConfig" />
                            <input type="hidden" name="id"              value={site.id} />
                            <input type="hidden" name="categoriesJson"  value={categoriesJson} />
                            <input type="hidden" name="extraFieldsJson" value={extraFieldsJson} />
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setOpen(false)}
                                    className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit"
                                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors">
                                    Guardar configuração
                                </button>
                            </div>
                        </Form>
                    </div>
                </div>
            )}
        </>
    );
}

// ── SiteRow ─────────────────────────────────────────────────────
function SiteRow({
    site, baseUrl,
}: {
    site: ReturnType<typeof useLoaderData<typeof loader>>["sites"][number];
    baseUrl: string;
}) {
    const [editing, setEditing] = useState(false);

    return (
        <>
            <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        {site.logo_r2_key && (
                            <img src={`/uploads/${site.logo_r2_key}`} alt="logo" className="w-6 h-6 rounded object-contain" />
                        )}
                        <span className="font-medium">{site.name}</span>
                        {site.brand_color && (
                            <span className="inline-block w-3 h-3 rounded-full border border-gray-200"
                                style={{ backgroundColor: site.brand_color }} title={site.brand_color} />
                        )}
                    </div>
                </td>
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
                    <a href={`/support/${site.token}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                        Abrir →
                    </a>
                </td>
                <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-3">
                        <EmbedSnippet token={site.token} baseUrl={baseUrl} />

                        {/* ★ Novo botão de configuração do formulário */}
                        <FormConfigEditor site={site} />

                        <button type="button" onClick={() => setEditing((v) => !v)}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors" title="Editar site">
                            <Pencil size={14} />
                            <span className="hidden sm:inline">Editar</span>
                        </button>

                        {site.owner_id && (
                            <Form method="post">
                                <input type="hidden" name="intent"    value="resetPassword" />
                                <input type="hidden" name="userId"    value={site.owner_id} />
                                <input type="hidden" name="userEmail" value={site.owner_email ?? ""} />
                                <input type="hidden" name="userName"  value={site.owner_name ?? ""} />
                                <button type="submit" title="Enviar email de recuperação de password"
                                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors">
                                    <KeyRound size={14} />
                                    <span className="hidden sm:inline">Reset pw</span>
                                </button>
                            </Form>
                        )}

                        <Form method="post" onSubmit={(e) => !confirm("Remover este site?") && e.preventDefault()}>
                            <input type="hidden" name="intent" value="delete" />
                            <input type="hidden" name="id"     value={site.id} />
                            <button type="submit" className="text-gray-400 hover:text-red-500 transition-colors" title="Remover site">
                                <Trash2 size={15} />
                            </button>
                        </Form>
                    </div>
                </td>
            </tr>

            {editing && (
                <tr className="bg-blue-50/50 dark:bg-blue-950/10">
                    <td colSpan={6} className="px-6 py-4">
                        <Form method="post" encType="multipart/form-data" className="flex flex-wrap gap-3 items-end">
                            <input type="hidden" name="intent" value="update" />
                            <input type="hidden" name="id"     value={site.id} />
                            <div>
                                <label className="block text-xs font-medium mb-1 text-gray-500">Nome do site</label>
                                <input name="siteName" defaultValue={site.name} required
                                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1 text-gray-500">Domínio</label>
                                <input name="domain" defaultValue={site.domain} required
                                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1 text-gray-500">Cor principal</label>
                                <input name="brandColor" type="color" defaultValue={site.brand_color ?? "#2563eb"}
                                    className="h-9 w-16 rounded-lg border border-gray-300 dark:border-gray-700 cursor-pointer p-0.5" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1 text-gray-500">Logo (PNG/JPG)</label>
                                <input name="logoFile" type="file" accept=".png,.jpg,.jpeg,.webp"
                                    className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" />
                            </div>
                            <div className="flex gap-2">
                                <button type="submit"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                                    Guardar
                                </button>
                                <button type="button" onClick={() => setEditing(false)}
                                    className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    Cancelar
                                </button>
                            </div>
                        </Form>
                    </td>
                </tr>
            )}
        </>
    );
}

// ── Página principal ────────────────────────────────────────────
export default function AdminClients() {
    const { sites } = useLoaderData<typeof loader>();
    const result    = useActionData<typeof action>();
    const [showPass, setShowPass] = useState(false);
    const [showForm, setShowForm] = useState(sites.length === 0);

    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

    const createError  = result?.intent === "create"     && "error"        in result ? result.error        : null;
    const resetSuccess = result?.intent === "reset"      && "resetSuccess" in result ? result.resetSuccess : null;
    const resetError   = result?.intent === "reset"      && "resetError"   in result ? result.resetError   : null;
    const resetLink    = result?.intent === "reset"      && "resetLink"    in result ? result.resetLink    : null;
    const updateError  = result?.intent === "update"     && "error"        in result ? result.error        : null;
    const configError  = result?.intent === "formConfig" && "error"        in result ? result.error        : null;

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold">Clientes & Sites</h1>
                <button type="button" onClick={() => setShowForm((v) => !v)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors">
                    <UserPlus size={16} /> Novo Cliente
                </button>
            </div>

            {resetSuccess && (
                <div className="flex items-center gap-2 mb-6 px-4 py-3 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-sm rounded-xl border border-green-200 dark:border-green-900">
                    <MailCheck size={16} /> {resetSuccess}
                </div>
            )}
            {(resetError || updateError || configError) && (
                <div className="mb-6 px-4 py-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-200 dark:border-red-900">
                    {resetError ?? updateError ?? configError}
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

            {showForm && (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 mb-8">
                    <h2 className="font-semibold mb-1">Adicionar cliente e site</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Cria o utilizador do cliente e associa logo o site.</p>

                    <Form method="post" encType="multipart/form-data" className="space-y-5">
                        <input type="hidden" name="intent" value="create" />

                        {createError && (
                            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 px-4 py-2.5 rounded-lg">
                                {createError}
                            </div>
                        )}

                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Dados do site</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium mb-1.5 text-gray-600 dark:text-gray-400">Nome do site</label>
                                    <input name="siteName" placeholder="Barbearia Brooklyn" required
                                        className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1.5 text-gray-600 dark:text-gray-400">Domínio</label>
                                    <input name="domain" placeholder="barbearia-brooklyn.pt" required
                                        className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Branding (iframe / form de suporte)</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium mb-1.5 text-gray-600 dark:text-gray-400">Cor principal</label>
                                    <div className="flex items-center gap-2">
                                        <input name="brandColor" type="color" defaultValue="#2563eb"
                                            className="h-10 w-16 rounded-lg border border-gray-300 dark:border-gray-700 cursor-pointer p-0.5" />
                                        <span className="text-xs text-gray-400">Cor do botão e ícone no form</span>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-medium mb-1.5 text-gray-600 dark:text-gray-400">Logo do cliente (PNG/JPG/WebP)</label>
                                    <input name="logoFile" type="file" accept=".png,.jpg,.jpeg,.webp"
                                        className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 dark:file:bg-gray-800 dark:file:text-gray-300" />
                                    <p className="text-xs text-gray-400 mt-1">Aparece no cabeçalho do form de suporte e no iframe</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Credenciais do cliente</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium mb-1.5 text-gray-600 dark:text-gray-400">Nome</label>
                                    <input name="clientName" placeholder="João Silva" required
                                        className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1.5 text-gray-600 dark:text-gray-400">Email</label>
                                    <input name="clientEmail" type="email" placeholder="joao@email.com" required
                                        className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1.5 text-gray-600 dark:text-gray-400">Password inicial</label>
                                    <div className="relative">
                                        <input name="password" type={showPass ? "text" : "password"} placeholder="mín. 8 caracteres" required
                                            className="w-full px-3 py-2.5 pr-10 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                        <button type="button" onClick={() => setShowPass((v) => !v)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                            title={showPass ? "Ocultar" : "Mostrar"}>
                                            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
                                <input type="checkbox" name="sendWelcome" defaultChecked
                                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500" />
                                <span className="text-sm text-gray-600 dark:text-gray-400">Enviar email de boas-vindas com credenciais de acesso ao portal</span>
                            </label>
                            <p className="text-xs text-gray-400 mt-1.5">Se o email já existir (role client), o site é associado ao utilizador existente.</p>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setShowForm(false)}
                                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl transition-colors">
                                Cancelar
                            </button>
                            <button type="submit"
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors">
                                Criar
                            </button>
                        </div>
                    </Form>
                </div>
            )}

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
                                <SiteRow key={site.id} site={site} baseUrl={baseUrl} />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
