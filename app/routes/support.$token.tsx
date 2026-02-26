// app/routes/support.$token.tsx
import { data, redirect, useLoaderData, useActionData, Form, useNavigation } from "react-router";
import type { Route } from "./+types/support.$token";
import { getSiteByToken, createTicket, createAttachment } from "~/lib/db";
import { sendTicketConfirmation } from "~/lib/email";
import { uploadFile, buildR2Key } from "~/lib/storage";
import { motion } from "motion/react";
import { CheckCircle, Loader2, Paperclip } from "lucide-react";

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
    const db   = context.cloudflare.env.DB;
    const env  = context.cloudflare.env;
    const site = await getSiteByToken(db, params.token);
    if (!site) throw data("Site não encontrado", { status: 404 });

    const form        = await request.formData();
    const clientName  = String(form.get("clientName")  || "").trim();
    const clientEmail = String(form.get("clientEmail") || "").trim();
    const category    = String(form.get("category")    || "").trim();
    const description = String(form.get("description") || "").trim();

    const errors: Record<string, string> = {};
    if (!clientName)                             errors.clientName  = "O nome é obrigatório.";
    if (!clientEmail || !clientEmail.includes("@")) errors.clientEmail = "Email inválido.";
    if (!category)                               errors.category    = "Seleciona uma categoria.";
    if (description.length < 10)                 errors.description = "Descreve o problema com mais detalhe (mínimo 10 caracteres).";
    if (Object.keys(errors).length > 0) return data({ errors }, { status: 400 });

    const { id, publicToken } = await createTicket(db, {
        siteId: site.id, clientName, clientEmail, category, description,
    });

    const files = form.getAll("files") as File[];
    for (const file of files) {
        if (!(file instanceof File) || file.size === 0) continue;
        try {
            const key = buildR2Key("ticket", id, file.name);
            await uploadFile(env.UPLOADS, key, file);
            await createAttachment(db, {
                entityType: "ticket",
                entityId:   id,
                fileName:   file.name,
                fileType:   file.type,
                fileSize:   file.size,
                r2Key:      key,
            });
        } catch (err) {
            console.error("Erro ao fazer upload de anexo:", err);
        }
    }

    if (env.RESEND_API_KEY) {
        await sendTicketConfirmation({
            apiKey:      env.RESEND_API_KEY,
            from:        env.FROM_EMAIL,
            to:          clientEmail,
            clientName,
            ticketId:    id,
            category,
            description,
            publicToken,
            baseUrl:     env.BASE_URL,
        }).catch(console.error);
    }

    return redirect(`/support/${params.token}/success?ticket=${id}`);
}

export default function SupportForm() {
    const { site }   = useLoaderData<typeof loader>();
    const result     = useActionData<typeof action>();
    const navigation = useNavigation();
    const isLoading  = navigation.state === "submitting";
    const errors     = result?.errors ?? {};

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 py-12">
            <motion.div
                className="w-full max-w-lg"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-4">
                        <span className="text-white text-xl">💬</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Suporte — {site.name}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                        Preenche o formulário e entraremos em contacto brevemente.
                    </p>
                </div>

                {/* Formulário */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 shadow-sm">
                    <Form method="post" encType="multipart/form-data" className="space-y-5">

                        <div className="grid grid-cols-2 gap-4">
                            {/* Nome */}
                            <div>
                                <label className="block text-sm font-medium mb-1.5">
                                    Nome <span className="text-red-500">*</span>
                                </label>
                                <input
                                    name="clientName"
                                    placeholder="O teu nome"
                                    className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                                        errors.clientName
                                            ? "border-red-400 dark:border-red-600"
                                            : "border-gray-300 dark:border-gray-700"
                                    }`}
                                />
                                {errors.clientName && (
                                    <p className="text-xs text-red-500 mt-1">{errors.clientName}</p>
                                )}
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium mb-1.5">
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <input
                                    name="clientEmail"
                                    type="email"
                                    placeholder="teu@email.com"
                                    className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                                        errors.clientEmail
                                            ? "border-red-400 dark:border-red-600"
                                            : "border-gray-300 dark:border-gray-700"
                                    }`}
                                />
                                {errors.clientEmail && (
                                    <p className="text-xs text-red-500 mt-1">{errors.clientEmail}</p>
                                )}
                            </div>
                        </div>

                        {/* Categoria */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5">
                                Categoria <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="category"
                                className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                                    errors.category
                                        ? "border-red-400 dark:border-red-600"
                                        : "border-gray-300 dark:border-gray-700"
                                }`}
                            >
                                <option value="">Seleciona uma categoria…</option>
                                {CATEGORIES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                            {errors.category && (
                                <p className="text-xs text-red-500 mt-1">{errors.category}</p>
                            )}
                        </div>

                        {/* Descrição */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5">
                                Descrição do problema <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                name="description"
                                rows={5}
                                placeholder="Descreve o problema com o máximo de detalhe possível…"
                                className={`w-full px-4 py-3 rounded-xl border text-sm bg-white dark:bg-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                                    errors.description
                                        ? "border-red-400 dark:border-red-600"
                                        : "border-gray-300 dark:border-gray-700"
                                }`}
                            />
                            {errors.description && (
                                <p className="text-xs text-red-500 mt-1">{errors.description}</p>
                            )}
                        </div>

                        <div>
                            <label className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
                                <Paperclip size={14} />
                                Anexos <span className="text-gray-400 font-normal">(opcional)</span>
                            </label>
                            <input
                                type="file"
                                name="files"
                                multiple
                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                                className="text-sm text-gray-500
                                    file:mr-3 file:py-1.5 file:px-3
                                    file:rounded-lg file:border-0
                                    file:text-xs file:font-medium
                                    file:bg-gray-100 file:text-gray-700
                                    hover:file:bg-gray-200
                                    dark:file:bg-gray-800 dark:file:text-gray-300"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                PDF, JPG, PNG, WebP — máx. 10 MB por ficheiro
                            </p>
                        </div>

                        {/* Botão */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    A enviar…
                                </>
                            ) : (
                                "Enviar Pedido de Suporte"
                            )}
                        </button>

                        <p className="text-xs text-center text-gray-400">
                            Receberás um email de confirmação com o link para acompanhar o teu pedido.
                        </p>
                    </Form>
                </div>
            </motion.div>
        </div>
    );
}
