// app/routes/support.$token.tsx
import { data, redirect, useLoaderData, useActionData, Form, useNavigation } from "react-router";
import type { Route } from "./+types/support.$token";
import {
    getSiteByToken, createTicket, createAttachment,
    parseSiteCategories, parseSiteGlobalFields, parseSiteExtraFields,
    GLOBAL_CATEGORY,
} from "~/lib/db";
import type { ExtraField, CategoryExtraFields } from "~/lib/db";
import { sendTicketConfirmation, sendAdminNotification } from "~/lib/email";
import { uploadFile, buildR2Key } from "~/lib/storage";
import { Loader2, Paperclip } from "lucide-react";
import { useEffect, useState } from "react";

export async function loader({ params, context }: Route.LoaderArgs) {
    const db   = context.cloudflare.env.DB;
    const site = await getSiteByToken(db, params.token);
    if (!site) throw data("Site não encontrado", { status: 404 });

    const categories   = parseSiteCategories(site);
    const globalFields = parseSiteGlobalFields(site);
    const extraRules: CategoryExtraFields[] = site.extra_fields_json
        ? (() => {
              try {
                  const all = JSON.parse(site.extra_fields_json) as CategoryExtraFields[];
                  return all.filter((r) => r.category !== GLOBAL_CATEGORY);
              } catch { return []; }
          })()
        : [];

    return { site, categories, globalFields, extraRules };
}

export async function action({ params, request, context }: Route.ActionArgs) {
    try {
        const env  = context.cloudflare.env as unknown as Env;
        const db   = env.DB;
        const site = await getSiteByToken(db, params.token);
        if (!site) throw data("Site não encontrado", { status: 404 });

        const form        = await request.formData();
        const clientName  = String(form.get("clientName")  || "").trim();
        const clientEmail = String(form.get("clientEmail") || "").trim();
        const clientPhone = String(form.get("clientPhone") || "").trim() || null;
        const category    = String(form.get("category")    || "").trim();
        const description = String(form.get("description") || "").trim();

        const errors: Record<string, string> = {};
        if (!clientName)                               errors.clientName  = "O nome é obrigatório.";
        if (!clientEmail || !clientEmail.includes("@")) errors.clientEmail = "Email inválido.";
        if (!category)                                 errors.category    = "Seleciona uma categoria.";
        if (description.length < 10)                   errors.description = "Descreve o problema com mais detalhe (mínimo 10 caracteres).";

        const extraData: Record<string, string> = {};

        const globalFields = parseSiteGlobalFields(site);
        for (const field of globalFields) {
            const val = String(form.get(`extra_${field.name}`) || "").trim();
            if (field.required && !val) {
                errors[`extra_${field.name}`] = `${field.label} é obrigatório.`;
            } else if (val) {
                extraData[field.name] = val;
            }
        }

        const categoryFields = parseSiteExtraFields(site, category);
        for (const field of categoryFields) {
            const val = String(form.get(`extra_${field.name}`) || "").trim();
            if (field.required && !val) {
                errors[`extra_${field.name}`] = `${field.label} é obrigatório.`;
            } else if (val) {
                extraData[field.name] = val;
            }
        }

        if (Object.keys(errors).length > 0) return data({ errors }, { status: 400 });

        const { id, publicToken } = await createTicket(db, {
            siteId: site.id, clientName, clientEmail, clientPhone, category, description,
            extraData: Object.keys(extraData).length > 0 ? extraData : null,
        });

        const files = form.getAll("files") as File[];
        for (const file of files) {
            if (!(file instanceof File) || file.size === 0) continue;
            try {
                const key = buildR2Key("ticket", id, file.name);
                await uploadFile(env.UPLOADS, key, file);
                await createAttachment(db, {
                    entityType: "ticket", entityId: id,
                    fileName: file.name, fileType: file.type, fileSize: file.size, r2Key: key,
                });
            } catch (err) { console.error("[upload] erro:", err); }
        }

        const from = site.from_name
            ? `${site.from_name} <${env.FROM_EMAIL}>`
            : env.FROM_EMAIL;

        if (env.RESEND_API_KEY) {
            try {
                await sendTicketConfirmation({
                    apiKey: env.RESEND_API_KEY, from,
                    to: clientEmail, clientName, ticketId: id, category, description, publicToken,
                    baseUrl: env.BASE_URL,
                });
            } catch (err) { console.error("[email] confirmação:", err); }

            if (env.ADMIN_EMAIL) {
                try {
                    await sendAdminNotification({
                        apiKey: env.RESEND_API_KEY, from,
                        adminEmail: env.ADMIN_EMAIL,
                        clientName, ticketId: id, message: description,
                        baseUrl: env.BASE_URL, isNewTicket: true, category,
                    });
                } catch (err) { console.error("[email] notificação admin:", err); }
            }
        }

        // Preserve query params (theme, bg) in redirect so success page matches
        const url    = new URL(request.url);
        const theme  = url.searchParams.get("theme");
        const bg     = url.searchParams.get("bg");
        const qs     = new URLSearchParams();
        qs.set("ticket", String(id));
        if (theme) qs.set("theme", theme);
        if (bg !== null) qs.set("bg", bg);

        return redirect(`/support/${params.token}/success?${qs.toString()}`);
    } catch (err) {
        // Re-throw Response/data errors (404s etc.)
        if (err instanceof Response) throw err;
        console.error("[support action] erro inesperado:", err);
        return data(
            { errors: { _form: "Ocorreu um erro inesperado. Por favor tenta novamente." } },
            { status: 500 }
        );
    }
}

function useIframeResizer() {
    useEffect(() => {
        function sendHeight() {
            const height = document.documentElement.scrollHeight;
            window.parent.postMessage({ type: "supportFormHeight", height }, "*");
        }
        sendHeight();
        const ro = new ResizeObserver(sendHeight);
        ro.observe(document.documentElement);
        return () => ro.disconnect();
    }, []);
}

// ── Resolve theme from ?theme= param ─────────────────────────────────────
// Accepted values: "light" | "dark" | "system" (default — follows device)
function useThemeParam() {
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const theme  = params.get("theme");
        if (theme === "light" || theme === "dark") {
            document.documentElement.setAttribute("data-theme", theme);
        } else {
            // "system" or any other value → remove override, let CSS media query decide
            document.documentElement.removeAttribute("data-theme");
        }
    }, []);
}

// ── Campo dinâmico ────────────────────────────────────────────────────────
function DynamicField({
    field, error, brandColor,
}: {
    field: ExtraField;
    error?: string;
    brandColor: string;
}) {
    const base =
        "w-full px-3 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-800 " +
        "focus:outline-none focus:ring-2 transition-colors ";
    const borderClass = error
        ? "border-red-400 dark:border-red-600"
        : "border-gray-300 dark:border-gray-700";

    if (field.type === "select" && field.options?.length) {
        return (
            <div>
                <label className="block text-sm font-medium mb-1.5">
                    {field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <select
                    name={`extra_${field.name}`}
                    className={`${base}${borderClass}`}
                    style={{ "--tw-ring-color": brandColor } as React.CSSProperties}
                >
                    <option value="">Seleciona uma opção…</option>
                    {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>
        );
    }

    return (
        <div>
            <label className="block text-sm font-medium mb-1.5">
                {field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            <input
                name={`extra_${field.name}`}
                type={field.type === "number" ? "number" : "text"}
                placeholder={field.placeholder ?? ""}
                className={`${base}${borderClass}`}
                style={{ "--tw-ring-color": brandColor } as React.CSSProperties}
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
    );
}

// ── Página principal ──────────────────────────────────────────────────────
export default function SupportForm() {
    const { site, categories, globalFields, extraRules } = useLoaderData<typeof loader>();
    const result     = useActionData<typeof action>();
    const navigation = useNavigation();
    const isLoading  = navigation.state === "submitting";
    const errors     = result?.errors ?? {};

    const [selectedCategory, setSelectedCategory] = useState("");
    const brandColor = site.brand_color ?? "#2563eb";

    const activeCategoryFields: ExtraField[] =
        extraRules.find((r) => r.category === selectedCategory)?.fields ?? [];

    useIframeResizer();
    useThemeParam();

    // Read ?bg= param (default: true — show background)
    // Accepted values: "false" | "0" → no background; anything else → show background
    const [showBg, setShowBg] = useState(true);
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const bg = params.get("bg");
        if (bg === "false" || bg === "0") setShowBg(false);
    }, []);

    const wrapperClass = showBg
        ? "bg-gray-50 dark:bg-gray-950 px-4 py-8"
        : "px-4 py-4";

    return (
        <div className={wrapperClass}>
            <div className="w-full max-w-lg mx-auto">

                {/* Erro geral de servidor */}
                {"_form" in errors && errors._form && (
                    <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm">
                        {errors._form}
                    </div>
                )}

                <div className={`${showBg ? "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 py-6 px-4 shadow-sm" : ""}`}>
                    <Form method="post" encType="multipart/form-data" className="space-y-4">

                        {/* Nome + Telefone */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Nome <span className="text-red-500">*</span></label>
                                <input name="clientName" autoComplete="name" placeholder="O teu nome"
                                    className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 transition-colors ${
                                        errors.clientName ? "border-red-400 dark:border-red-600" : "border-gray-300 dark:border-gray-700"}`} />
                                {errors.clientName && <p className="text-xs text-red-500 mt-1">{errors.clientName}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Telefone</label>
                                <input name="clientPhone" type="tel" autoComplete="tel" placeholder="+351 9xx xxx xxx"
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 transition-colors" />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Email <span className="text-red-500">*</span></label>
                            <input name="clientEmail" type="email" autoComplete="email" placeholder="teu@email.com"
                                className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 transition-colors ${
                                    errors.clientEmail ? "border-red-400 dark:border-red-600" : "border-gray-300 dark:border-gray-700"}`} />
                            {errors.clientEmail && <p className="text-xs text-red-500 mt-1">{errors.clientEmail}</p>}
                        </div>

                        {/* Campos globais */}
                        {globalFields.length > 0 && (
                            <div className="space-y-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 p-4">
                                {globalFields.map((field) => (
                                    <DynamicField
                                        key={field.name}
                                        field={field}
                                        error={errors[`extra_${field.name}`]}
                                        brandColor={brandColor}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Categoria */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Categoria <span className="text-red-500">*</span></label>
                            <select
                                name="category"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 transition-colors ${
                                    errors.category ? "border-red-400 dark:border-red-600" : "border-gray-300 dark:border-gray-700"}`}
                            >
                                <option value="">Seleciona uma categoria…</option>
                                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                            {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
                        </div>

                        {/* Campos extra da categoria seleccionada */}
                        {activeCategoryFields.length > 0 && (
                            <div className="space-y-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 p-4">
                                {activeCategoryFields.map((field) => (
                                    <DynamicField
                                        key={field.name}
                                        field={field}
                                        error={errors[`extra_${field.name}`]}
                                        brandColor={brandColor}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Descrição */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Descrição do problema <span className="text-red-500">*</span></label>
                            <textarea name="description" rows={4}
                                placeholder="Descreve o problema com o máximo de detalhe possível…"
                                className={`w-full px-3 py-3 rounded-xl border text-sm bg-white dark:bg-gray-800 resize-none focus:outline-none focus:ring-2 transition-colors ${
                                    errors.description ? "border-red-400 dark:border-red-600" : "border-gray-300 dark:border-gray-700"}`} />
                            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
                        </div>

                        {/* Anexos */}
                        <div>
                            <label className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
                                <Paperclip size={13} /> Anexos <span className="text-gray-400 font-normal">(opcional)</span>
                            </label>
                            <input type="file" name="files" multiple accept=".pdf,.jpg,.jpeg,.png,.webp"
                                className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 dark:file:bg-gray-800 dark:file:text-gray-300" />
                            <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, WebP — máx. 10 MB por ficheiro</p>
                        </div>

                        <button type="submit" disabled={isLoading}
                            style={{ backgroundColor: isLoading ? undefined : brandColor }}
                            className="w-full py-3 disabled:opacity-60 text-white font-medium rounded-xl transition-opacity flex items-center justify-center gap-2 text-sm">
                            {isLoading ? <><Loader2 size={15} className="animate-spin" /> A enviar…</> : "Enviar Pedido de Suporte"}
                        </button>

                        <p className="text-xs text-center text-gray-400">
                            Receberás um email de confirmação com o link para acompanhar e responder ao teu pedido.
                        </p>
                    </Form>
                </div>
            </div>
        </div>
    );
}
