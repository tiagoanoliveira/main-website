import { data, redirect, useLoaderData, useActionData, Form } from "react-router";
import type { Route } from "./+types/admin.tickets.$id";
import {
    getTicketById, getTicketByPublicToken, getTicketMessages, createTicketMessage,
    updateTicketStatus, getAttachments, createAttachment, deleteAttachment, getSiteById,
} from "~/lib/db";
import StatusBadge from "~/components/ui/StatusBadge";
import Attachments from "~/components/ui/Attachments";
import { sendAdminReply } from "~/lib/email";
import { uploadFile, buildR2Key } from "~/lib/storage";
import { getSessionUser } from "~/lib/auth.server";
import { Paperclip, Mail, Phone, User, ExternalLink } from "lucide-react";

export async function loader({ params, context, request }: Route.LoaderArgs) {
    const db          = context.cloudflare.env.DB;
    const sessionUser = await getSessionUser(db, request);

    // Aceita tanto /admin/tickets/:id (número) como redirect do ticket público
    const id = Number(params.id);
    if (isNaN(id)) throw data("ID inválido", { status: 400 });

    const [ticket, messages] = await Promise.all([
        getTicketById(db, id),
        getTicketMessages(db, id),
    ]);
    if (!ticket) throw data("Ticket não encontrado", { status: 404 });

    // Verificar acesso: admin vê tudo; owner só vê os seus sites
    const site = await getSiteById(db, ticket.site_id);
    const isAdmin = sessionUser?.role === "admin";
    const isOwner = sessionUser !== null && site?.owner_id === sessionUser.id;
    if (!isAdmin && !isOwner) {
        throw data("Sem permissão", { status: 403 });
    }

    const ticketAttachments = await getAttachments(db, "ticket", id);
    const msgAttachments    = await Promise.all(
        messages.map((m) => getAttachments(db, "ticket_message", m.id))
    );

    // viewerRole usado para determinar o sender ao responder e o label
    const viewerRole: "admin" | "owner" = isAdmin ? "admin" : "owner";

    return { ticket, messages, ticketAttachments, msgAttachments, viewerRole, site };
}

export async function action({ request, params, context }: Route.ActionArgs) {
    const env    = context.cloudflare.env as unknown as Env;
    const db     = env.DB;
    const id     = Number(params.id);
    const form   = await request.formData();
    const intent = String(form.get("intent"));

    // Determinar o sender da resposta com base na sessão
    const sessionUser = await getSessionUser(db, request);
    const ticket      = await getTicketById(db, id);
    const site        = ticket ? await getSiteById(db, ticket.site_id) : null;
    const isAdminUser = sessionUser?.role === "admin";
    const isOwnerUser = sessionUser !== null && site?.owner_id === sessionUser.id;

    if (intent === "reply") {
        const message = String(form.get("message") || "").trim();
        if (!message) return data({ error: "A resposta não pode estar vazia." }, { status: 400 });

        const sender: "admin" | "owner" = isAdminUser ? "admin" : "owner";
        const msgId = await createTicketMessage(db, { ticketId: id, sender, message });
        await updateTicketStatus(db, id, "in_progress");

        const files = form.getAll("files") as File[];
        for (const file of files) {
            if (!(file instanceof File) || file.size === 0) continue;
            try {
                const key = buildR2Key("ticket_message", msgId, file.name);
                await uploadFile(env.UPLOADS, key, file);
                await createAttachment(db, {
                    entityType: "ticket_message", entityId: msgId,
                    fileName: file.name, fileType: file.type, fileSize: file.size, r2Key: key,
                });
            } catch (err) { console.error("[upload] erro:", err); }
        }

        if (env.RESEND_API_KEY && ticket) {
            const from = ticket.site_from_name
                ? `${ticket.site_from_name} <${env.FROM_EMAIL}>`
                : env.FROM_EMAIL;
            try {
                await sendAdminReply({
                    apiKey: env.RESEND_API_KEY, from,
                    to: ticket.client_email, clientName: ticket.client_name,
                    ticketId: id, category: ticket.category, message,
                    publicToken: ticket.public_token, baseUrl: env.BASE_URL,
                });
            } catch (err) { console.error("[email] erro ao enviar resposta ao cliente:", err); }
        }

        return redirect(`/admin/tickets/${id}`);
    }

    if (intent === "status") {
        await updateTicketStatus(db, id, String(form.get("status")));
        return redirect(`/admin/tickets/${id}`);
    }

    if (intent === "deleteAttachment") {
        const attachmentId = Number(form.get("attachmentId"));
        const r2Key = await deleteAttachment(db, attachmentId);
        if (r2Key) {
            try { await env.UPLOADS.delete(r2Key); } catch (e) { console.error(e); }
        }
        return redirect(`/admin/tickets/${id}`);
    }

    return null;
}

export default function AdminTicketDetail() {
    const { ticket, messages, ticketAttachments, msgAttachments, viewerRole, site } =
        useLoaderData<typeof loader>();
    const result = useActionData<typeof action>();

    const statusOptions = [
        { value: "open",        label: "Marcar Aberto" },
        { value: "in_progress", label: "Em Progresso" },
        { value: "closed",      label: "Fechar Ticket" },
    ].filter((o) => o.value !== ticket.status);

    return (
        <div className="max-w-3xl">
            {/* Cabeçalho com estado e botões de estado */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-xl font-bold">Ticket #{ticket.id}</h1>
                        <StatusBadge status={ticket.status} />
                    </div>
                    <p className="text-sm text-gray-500">{ticket.site_name} · {ticket.category}</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                    {statusOptions.map((opt) => (
                        <Form method="post" key={opt.value}>
                            <input type="hidden" name="intent" value="status" />
                            <input type="hidden" name="status" value={opt.value} />
                            <button type="submit"
                                className="px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                {opt.label}
                            </button>
                        </Form>
                    ))}
                </div>
            </div>

            {/* Informações do cliente */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 mb-6 text-sm">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Informação do cliente</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-start gap-2">
                        <User size={14} className="text-gray-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs text-gray-400 mb-0.5">Nome</p>
                            <p className="font-medium">{ticket.client_name}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2">
                        <Mail size={14} className="text-gray-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs text-gray-400 mb-0.5">Email</p>
                            <a href={`mailto:${ticket.client_email}`}
                                className="text-blue-600 dark:text-blue-400 hover:underline break-all">
                                {ticket.client_email}
                            </a>
                        </div>
                    </div>
                    {ticket.client_phone && (
                        <div className="flex items-start gap-2">
                            <Phone size={14} className="text-gray-400 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs text-gray-400 mb-0.5">Telefone</p>
                                <a href={`tel:${ticket.client_phone}`}
                                    className="text-blue-600 dark:text-blue-400 hover:underline">
                                    {ticket.client_phone}
                                </a>
                            </div>
                        </div>
                    )}
                    <div className="flex items-start gap-2">
                        <ExternalLink size={14} className="text-gray-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs text-gray-400 mb-0.5">Link público do ticket</p>
                            <a href={`/ticket/${ticket.public_token}`} target="_blank" rel="noopener noreferrer"
                                className="text-blue-600 dark:text-blue-400 hover:underline text-xs">
                                /ticket/{ticket.public_token.slice(0, 12)}…
                            </a>
                        </div>
                    </div>
                </div>
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                    <p className="text-xs text-gray-400 mb-2">Descrição inicial</p>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
                </div>
                {ticketAttachments.length > 0 && (
                    <div className="mt-3">
                        <Attachments attachments={ticketAttachments} entityType="ticket" entityId={ticket.id} canDelete={viewerRole === "admin"} />
                    </div>
                )}
                <p className="text-xs text-gray-400 mt-3">{new Date(ticket.created_at).toLocaleString("pt-PT")}</p>
            </div>

            {/* Thread de mensagens */}
            {messages.length > 0 && (
                <div className="space-y-4 mb-6">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Histórico</h2>
                    {messages.map((msg, i) => {
                        const isFromStaff = msg.sender === "admin" || msg.sender === "owner";

                        // Staff viewer (admin ou owner): as suas próprias mensagens à direita,
                        // mensagens do cliente à esquerda
                        const alignRight = isFromStaff;

                        // Cores: admin=azul, owner=roxo, cliente=cinza
                        const bubbleClass = msg.sender === "admin"
                            ? "bg-blue-600 text-white rounded-tr-sm"
                            : msg.sender === "owner"
                            ? "bg-purple-600 text-white rounded-tr-sm"
                            : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-tl-sm";

                        const metaClass = isFromStaff ? "text-white/70" : "text-gray-400";

                        // Label do remetente
                        const senderLabel = msg.sender === "admin"
                            ? "Suporte Técnico"
                            : msg.sender === "owner"
                            ? (site?.name ?? ticket.site_name)
                            : ticket.client_name;

                        return (
                            <div key={msg.id}
                                className={`flex ${alignRight ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[80%] rounded-2xl px-5 py-3.5 text-sm ${bubbleClass}`}>
                                    <p className={`text-xs font-semibold mb-1.5 ${metaClass}`}>{senderLabel}</p>
                                    <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                                    <p className={`text-xs mt-1.5 ${metaClass}`}>
                                        {new Date(msg.created_at).toLocaleString("pt-PT")}
                                    </p>
                                    {msgAttachments[i]?.length > 0 && (
                                        <div className="mt-3">
                                            <Attachments
                                                attachments={msgAttachments[i]}
                                                entityType="ticket_message"
                                                entityId={msg.id}
                                                canDelete={viewerRole === "admin" && msg.sender === "admin"}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Formulário de resposta */}
            {ticket.status !== "closed" ? (
                <Form method="post" encType="multipart/form-data"
                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                    <input type="hidden" name="intent" value="reply" />
                    <h2 className="font-semibold mb-3">Responder</h2>
                    {result?.error && (
                        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 px-4 py-2.5 rounded-lg mb-3">{result.error}</p>
                    )}
                    <textarea name="message" rows={4} placeholder="Escreve a tua resposta…" required
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3" />
                    <div className="mb-4">
                        <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5">
                            <Paperclip size={12} /> Anexos (opcional)
                        </label>
                        <input type="file" name="files" multiple accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                            className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-950 dark:file:text-blue-300" />
                        <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, WebP — máx. 10 MB por ficheiro</p>
                    </div>
                    <div className="flex justify-end">
                        <button type="submit"
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                            Enviar resposta
                        </button>
                    </div>
                </Form>
            ) : (
                <p className="text-sm text-center text-gray-400 py-4">Este ticket está fechado.</p>
            )}
        </div>
    );
}
