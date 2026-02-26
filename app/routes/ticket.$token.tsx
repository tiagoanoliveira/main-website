import { data, redirect, useLoaderData, useActionData, Form, useNavigation } from "react-router";
import type { Route } from "./+types/ticket.$token";
import {
    getTicketByPublicToken, getTicketMessages,
    createTicketMessage, getSiteById, createAttachment, getAttachments,
} from "~/lib/db";
import { sendAdminNotification } from "~/lib/email";
import { uploadFile, buildR2Key } from "~/lib/storage";
import { getSessionUser } from "~/lib/auth.server";
import StatusBadge from "~/components/ui/StatusBadge";
import { motion } from "motion/react";
import { Loader2, Send, Paperclip, FileText, Image } from "lucide-react";
import { useRef } from "react";

export async function loader({ params, context }: Route.LoaderArgs) {
    const db      = context.cloudflare.env.DB;
    const ticket  = await getTicketByPublicToken(db, params.token);
    if (!ticket) throw data("Ticket não encontrado", { status: 404 });
    const messages    = await getTicketMessages(db, ticket.id);
    const attachments = await getAttachments(db, "ticket", ticket.id);

    // Attachments por mensagem
    const messageIds = messages.map(m => m.id);
    const msgAttachments = messageIds.length > 0
        ? await getAttachments(db, "ticket_message", messageIds[0])
            .then(() => Promise.all(messageIds.map(id => getAttachments(db, "ticket_message", id))))
        : [];

    return { ticket, messages, attachments, msgAttachments };
}

export async function action({ params, request, context }: Route.ActionArgs) {
    const db     = context.cloudflare.env.DB;
    const env    = context.cloudflare.env;
    const ticket = await getTicketByPublicToken(db, params.token);
    if (!ticket) throw data("Ticket não encontrado", { status: 404 });
    if (ticket.status === "closed")
        return data({ error: "Este ticket está fechado." }, { status: 400 });

    const form    = await request.formData();
    const message = String(form.get("message") || "").trim();
    if (message.length < 2)
        return data({ error: "A mensagem é demasiado curta." }, { status: 400 });

    // Detectar se é o dono do site autenticado via portal
    const sessionUser = await getSessionUser(db, request);
    const site        = await getSiteById(db, ticket.site_id);
    const isOwner     = sessionUser !== null && site?.owner_id === sessionUser.id;
    const sender      = isOwner ? "owner" : "client";

    const msgId = await createTicketMessage(db, { ticketId: ticket.id, sender, message });

    // Upload de anexos da resposta
    const files = form.getAll("files") as File[];
    for (const file of files) {
        if (!(file instanceof File) || file.size === 0) continue;
        try {
            const key = buildR2Key("ticket_message", msgId, file.name);
            await uploadFile(env.UPLOADS, key, file);
            await createAttachment(db, {
                entityType: "ticket_message",
                entityId:   msgId,
                fileName:   file.name,
                fileType:   file.type,
                fileSize:   file.size,
                r2Key:      key,
            });
        } catch (err) {
            console.error("Erro ao fazer upload de anexo:", err);
        }
    }

    // Notificar admin por email (só quando é cliente a responder)
    if (env.RESEND_API_KEY && !isOwner) {
        await sendAdminNotification({
            apiKey:     env.RESEND_API_KEY,
            from:       env.FROM_EMAIL,
            adminEmail: env.ADMIN_EMAIL,
            clientName: ticket.client_name,
            ticketId:   ticket.id,
            message,
            baseUrl:    env.BASE_URL,
        }).catch(console.error);
    }

    // Redireciona para limpar o formulário
    return redirect(`/ticket/${params.token}#latest`);
}

function AttachmentChip({ r2Key, fileName, fileType }: { r2Key: string; fileName: string; fileType: string }) {
    const isImage = fileType.startsWith("image/");
    return (
        <a
            href={`/uploads/${r2Key}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-300 transition-colors"
        >
            {isImage ? <Image size={12} /> : <FileText size={12} />}
            {fileName}
        </a>
    );
}

export default function TicketPublic() {
    const { ticket, messages, attachments, msgAttachments } = useLoaderData<typeof loader>();
    const result    = useActionData<typeof action>();
    const nav       = useNavigation();
    const isLoading = nav.state === "submitting";
    const formRef   = useRef<HTMLFormElement>(null);

    // Limpa o formulário após redirect (o redirect já limpa, mas o ref serve de fallback)
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-12">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <motion.div className="mb-8" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-xl font-bold">Ticket #{ticket.id}</h1>
                        <StatusBadge status={ticket.status} />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {ticket.site_name} · {ticket.category}
                    </p>
                </motion.div>

                {/* Descrição inicial */}
                <motion.div
                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 mb-6"
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                >
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-medium">Pedido inicial</p>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{ticket.description}</p>
                    {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            {attachments.map(a => (
                                <AttachmentChip key={a.id} r2Key={a.r2_key} fileName={a.file_name} fileType={a.file_type} />
                            ))}
                        </div>
                    )}
                    <p className="text-xs text-gray-400 mt-3">
                        {new Date(ticket.created_at).toLocaleString("pt-PT")}
                    </p>
                </motion.div>

                {/* Thread de mensagens */}
                {messages.length > 0 && (
                    <div className="space-y-4 mb-6">
                        {messages.map((msg, i) => {
                            const isAdmin  = msg.sender === "admin";
                            const isOwner  = msg.sender === "owner";
                            const msgAtts  = msgAttachments[i] ?? [];

                            const bubbleClass = isAdmin
                                ? "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-tl-sm"
                                : isOwner
                                ? "bg-purple-600 text-white rounded-tr-sm"
                                : "bg-blue-600 text-white rounded-tr-sm";

                            const metaClass = isAdmin ? "text-gray-400" : "text-white/70";
                            const senderLabel = isAdmin ? "Suporte Técnico" : isOwner ? ticket.site_name : ticket.client_name;

                            return (
                                <motion.div
                                    key={msg.id}
                                    id={i === messages.length - 1 ? "latest" : undefined}
                                    className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}
                                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.05 + i * 0.04 }}
                                >
                                    <div className={`max-w-[85%] rounded-2xl px-5 py-4 text-sm ${bubbleClass}`}>
                                        <p className={`text-xs font-semibold mb-1.5 ${metaClass}`}>{senderLabel}</p>
                                        <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                                        {msgAtts.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {msgAtts.map(a => (
                                                    <AttachmentChip key={a.id} r2Key={a.r2_key} fileName={a.file_name} fileType={a.file_type} />
                                                ))}
                                            </div>
                                        )}
                                        <p className={`text-xs mt-2 ${metaClass}`}>
                                            {new Date(msg.created_at).toLocaleString("pt-PT")}
                                        </p>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* Formulário de resposta */}
                {ticket.status !== "closed" ? (
                    <motion.div
                        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6"
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    >
                        <h2 className="font-semibold mb-4 text-sm">Adicionar informação ou resposta</h2>
                        <Form method="post" encType="multipart/form-data" className="space-y-3" ref={formRef}>
                            {result?.error && (
                                <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 px-4 py-2.5 rounded-lg">
                                    {result.error}
                                </p>
                            )}
                            <textarea
                                name="message"
                                rows={4}
                                placeholder="Escreve aqui a tua resposta ou informação adicional…"
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {/* Anexos */}
                            <div>
                                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5">
                                    <Paperclip size={12} />
                                    Anexos <span className="text-gray-400 font-normal">(opcional)</span>
                                </label>
                                <input
                                    type="file"
                                    name="files"
                                    multiple
                                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                                    className="text-sm text-gray-500
                                        file:mr-3 file:py-1 file:px-2.5
                                        file:rounded-lg file:border-0
                                        file:text-xs file:font-medium
                                        file:bg-gray-100 file:text-gray-700
                                        hover:file:bg-gray-200
                                        dark:file:bg-gray-800 dark:file:text-gray-300"
                                />
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-xl transition-colors"
                                >
                                    {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                    Enviar resposta
                                </button>
                            </div>
                        </Form>
                    </motion.div>
                ) : (
                    <div className="text-center py-8 text-gray-400">
                        <p className="text-sm">Este ticket foi resolvido e está fechado.</p>
                        <p className="text-xs mt-1">Se tiveres um novo problema, por favor abre um novo pedido de suporte.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
