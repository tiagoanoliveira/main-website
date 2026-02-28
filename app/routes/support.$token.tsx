// app/routes/support.$token.tsx
import { data, redirect, useLoaderData, useActionData, Form, useNavigation } from "react-router";
import type { Route } from "./+types/support.$token";
import { getSiteByToken, createTicket, createAttachment } from "~/lib/db";
import { sendTicketConfirmation, sendAdminNotification } from "~/lib/email";
import { uploadFile, buildR2Key } from "~/lib/storage";
import { Loader2, Paperclip } from "lucide-react";
import { useEffect } from "react";

const CATEGORIES = [
    "Problema com reserva",
    "Dúvida geral",
    "Acesso / Login",
    "Problema técnico",
    "Pagamento",
    "Retificação / Eliminação de dados",
    "Outro",
];

export async function loader({ params, context }: Route.LoaderArgs) {
    const db   = context.cloudflare.env.DB;
    const site = await getSiteByToken(db, params.token);
    if (!site) throw data("Site não encontrado", { status: 404 });
    return { site };
}

export async function action({ params, request, context }: Route.ActionArgs) {
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
    if (Object.keys(errors).length > 0) return data({ errors }, { status: 400 });

    const { id, publicToken } = await createTicket(db, {
        siteId: site.id, clientName, clientEmail, clientPhone, category, description,
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

    const fromEmail = site.from_email || env.FROM_EMAIL;

    // ── Diagnóstico (pode ser removido após confirmar que os emails estão a ser enviados)
    console.log("[email] RESEND_API_KEY configurado:", !!env.RESEND_API_KEY);
    console.log("[email] FROM_EMAIL:", fromEmail || "NÃO DEFINIDO");
    console.log("[email] ADMIN_EMAIL:", env.ADMIN_EMAIL || "NÃO DEFINIDO");

    if (!env.RESEND_API_KEY) {
        console.error("[email] RESEND_API_KEY não configurado — emails não enviados.");
    } else {
        try {
            await sendTicketConfirmation({
                apiKey: env.RESEND_API_KEY,
                from:   fromEmail,
                to: clientEmail, clientName, ticketId: id, category, description, publicToken,
                baseUrl: env.BASE_URL,
            });
            console.log("[email] confirmação ao cliente enviada.");
        } catch (err) {
            console.error("[email] erro ao enviar confirmação ao cliente:", err);
        }

        if (env.ADMIN_EMAIL) {
            try {
                await sendAdminNotification({
                    apiKey:      env.RESEND_API_KEY,
                    from:        fromEmail,
                    adminEmail:  env.ADMIN_EMAIL,
                    clientName, ticketId: id, message: description,
                    baseUrl:     env.BASE_URL,
                    isNewTicket: true, category,
                });
                console.log("[email] notificação ao admin enviada.");
            } catch (err) {
                console.error("[email] erro ao notificar admin:", err);
            }
        }
    }

    return redirect(`/support/${params.token}/success?ticket=${id}`);
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

export default function SupportForm() {
    const { site }   = useLoaderData<typeof loader>();
    const result     = useActionData<typeof action>();
    const navigation = useNavigation();
    const isLoading  = navigation.state === "submitting";
    const errors     = result?.errors ?? {};

    useIframeResizer();

    return (
        <div className="bg-gray-50 dark:bg-gray-950 px-4 py-8">
            <div className="w-full max-w-lg mx-auto">
                <div className="text-center mb-6">
                    <div
                        className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3"
                        style={{ backgroundColor: site.brand_color ?? "#2563eb" }}
                    >
                        {site.logo_r2_key ? (
                            <img src={`/uploads/${site.logo_r2_key}`} alt={site.name} className="h-8 w-8 object-contain rounded-lg" />
                        ) : (
                            <span className="text-white text-xl">💬</span>
                        )}
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Suporte — {site.name}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Preenche o formulário e entraremos em contacto brevemente.</p>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 py-6 px-4 shadow-sm">
                    <Form method="post" encType="multipart/form-data" className="space-y-4">

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Nome <span className="text-red-500">*</span></label>
                                <input name="clientName" autoComplete="name" placeholder="O teu nome"
                                    className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                                        errors.clientName ? "border-red-400 dark:border-red-600" : "border-gray-300 dark:border-gray-700"}`} />
                                {errors.clientName && <p className="text-xs text-red-500 mt-1">{errors.clientName}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Telefone</label>
                                <input name="clientPhone" type="tel" autoComplete="tel" placeholder="+351 9xx xxx xxx"
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1.5">Email <span className="text-red-500">*</span></label>
                            <input name="clientEmail" type="email" autoComplete="email" placeholder="teu@email.com"
                                className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                                    errors.clientEmail ? "border-red-400 dark:border-red-600" : "border-gray-300 dark:border-gray-700"}`} />
                            {errors.clientEmail && <p className="text-xs text-red-500 mt-1">{errors.clientEmail}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1.5">Categoria <span className="text-red-500">*</span></label>
                            <select name="category"
                                className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                                    errors.category ? "border-red-400 dark:border-red-600" : "border-gray-300 dark:border-gray-700"}`}>
                                <option value="">Seleciona uma categoria…</option>
                                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                            {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1.5">Descrição do problema <span className="text-red-500">*</span></label>
                            <textarea name="description" rows={4}
                                placeholder="Descreve o problema com o máximo de detalhe possível…"
                                className={`w-full px-3 py-3 rounded-xl border text-sm bg-white dark:bg-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                                    errors.description ? "border-red-400 dark:border-red-600" : "border-gray-300 dark:border-gray-700"}`} />
                            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
                        </div>

                        <div>
                            <label className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
                                <Paperclip size={13} /> Anexos <span className="text-gray-400 font-normal">(opcional)</span>
                            </label>
                            <input type="file" name="files" multiple accept=".pdf,.jpg,.jpeg,.png,.webp"
                                className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 dark:file:bg-gray-800 dark:file:text-gray-300" />
                            <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, WebP — máx. 10 MB por ficheiro</p>
                        </div>

                        <button type="submit" disabled={isLoading}
                            style={{ backgroundColor: isLoading ? undefined : (site.brand_color ?? "#2563eb") }}
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
