import { data, redirect, useLoaderData, useActionData, Form } from "react-router";
import type { Route } from "./+types/admin.tickets.$id";
import {
    getTicketById, getTicketMessages, createTicketMessage,
    updateTicketStatus, getAttachments, createAttachment, deleteAttachment,
    getSiteById, updateTicketMessage, deleteTicketMessage, getTicketMessageById,
} from "~/lib/db";
import StatusBadge from "~/components/ui/StatusBadge";
import Attachments from "~/components/ui/Attachments";
import { sendAdminReply } from "~/lib/email";
import { uploadFile, buildR2Key } from "~/lib/storage";
import { getSessionUser } from "~/lib/auth.server";
import { Paperclip, Mail, Phone, User, ExternalLink, Pencil, Trash2, Check, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export async function loader({ params, context, request }: Route.LoaderArgs) {
    const db          = context.cloudflare.env.DB;
    const sessionUser = await getSessionUser(db, request);

    const id = Number(params.id);
    if (isNaN(id)) throw data("ID inválido", { status: 400 });

    const [ticket, messages] = await Promise.all([
        getTicketById(db, id),
        getTicketMessages(db, id),
    ]);
    if (!ticket) throw data("Ticket não encontrado", { status: 404 });

    const site    = await getSiteById(db, ticket.site_id);
    const isAdmin = sessionUser?.role === "admin";
    const isOwner = sessionUser !== null && site?.owner_id === sessionUser.id;
    if (!isAdmin && !isOwner) throw data("Sem permissão", { status: 403 });

    const ticketAttachments = await getAttachments(db, "ticket", id);
    const msgAttachments    = await Promise.all(
        messages.map((m) => getAttachments(db, "ticket_message", m.id))
    );

    const viewerRole: "admin" | "owner" = isAdmin ? "admin" : "owner";
    return { ticket, messages, ticketAttachments, msgAttachments, viewerRole, site };
}

export async function action({ request, params, context }: Route.ActionArgs) {
    const env    = context.cloudflare.env as unknown as Env;
    const db     = env.DB;
    const id     = Number(params.id);
    const form   = await request.formData();
    const intent = String(form.get("intent"));

    const sessionUser = await getSessionUser(db, request);
    const ticket      = await getTicketById(db, id);
    const site        = ticket ? await getSiteById(db, ticket.site_id) : null;
    const isAdminUser = sessionUser?.role === "admin";
    const isOwnerUser = sessionUser !== null && site?.owner_id === sessionUser.id;

    if (!isAdminUser && !isOwnerUser) {
        throw data("Sem permissão", { status: 403 });
    }

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
            } catch (err) { console.error("[email] erro:", err); }
        }

        return redirect(`/admin/tickets/${id}`);
    }

    if (intent === "editMessage") {
        const msgId      = Number(form.get("messageId"));
        const newMessage = String(form.get("newMessage") || "").trim();
        if (!newMessage) return data({ error: "A mensagem não pode estar vazia." }, { status: 400 });

        const msg = await getTicketMessageById(db, msgId);
        if (!msg) return data({ error: "Mensagem não encontrada." }, { status: 404 });
        const expectedSender = isAdminUser ? "admin" : "owner";
        if (msg.sender !== expectedSender) {
            return data({ error: "Não podes editar mensagens de outros." }, { status: 403 });
        }

        await updateTicketMessage(db, msgId, newMessage);
        return redirect(`/admin/tickets/${id}`);
    }

    if (intent === "deleteMessage") {
        const msgId = Number(form.get("messageId"));
        const msg   = await getTicketMessageById(db, msgId);
        if (!msg) return data({ error: "Mensagem não encontrada." }, { status: 404 });
        const expectedSender = isAdminUser ? "admin" : "owner";
        if (msg.sender !== expectedSender) {
            return data({ error: "Não podes apagar mensagens de outros." }, { status: 403 });
        }

        const attachments = await getAttachments(db, "ticket_message", msgId);
        for (const att of attachments) {
            try { await env.UPLOADS.delete(att.r2_key); } catch { /* ignore */ }
        }
        await db.prepare("DELETE FROM attachments WHERE entity_type = 'ticket_message' AND entity_id = ?")
            .bind(msgId).run();
        await deleteTicketMessage(db, msgId);
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

// ── Auto-growing textarea ─────────────────────────────────────────────────
function AutoTextarea({
    value, onChange, className, textareaRef,
}: {
    value: string;
    onChange: (v: string) => void;
    className: string;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
    // Ajusta a altura automaticamente ao conteúdo
    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
    }, [value, textareaRef]);

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            style={{ minHeight: "100px" }}
            className={className}
        />
    );
}

// ── Componente de bolha de mensagem com edição inline ─────────────────────
function MessageBubble({
    msg, atts, viewerRole, senderLabel,
}: {
    msg: { id: number; sender: string; message: string; created_at: string; edited_at?: string | null };
    atts: { id: number; r2_key: string; file_name: string; file_type: string }[];
    viewerRole: "admin" | "owner";
    senderLabel: string;
}) {
    const [editing, setEditing] = useState(false);
    const [draft,   setDraft]   = useState(msg.message);
    const [confirm, setConfirm] = useState(false);
    const textareaRef           = useRef<HTMLTextAreaElement>(null);

    const isFromStaff  = msg.sender === "admin" || msg.sender === "owner";
    const isOwnMessage = msg.sender === viewerRole;
    const alignRight   = isFromStaff;

    const bubbleColor = msg.sender === "admin"
        ? "bg-blue-600 text-white rounded-tr-sm"
        : msg.sender === "owner"
        ? "bg-purple-600 text-white rounded-tr-sm"
        : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-tl-sm";

    const metaClass = isFromStaff ? "text-white/70" : "text-gray-400";

    // Quando entra em modo de edição, a bolha ocupa a largura total do contentor
    // para que o textarea tenha espaço confortável.
    const wrapperWidth = editing ? "w-full" : "max-w-[80%]";

    return (
        <div className={`flex ${alignRight ? "justify-end" : "justify-start"} group`}>
            <div className={`relative ${wrapperWidth} rounded-2xl px-5 py-3.5 text-sm transition-all duration-200 ${editing ? "" : bubbleColor}`}
                style={editing ? {} : {}}>

                {/* Modo de edição — card neutro separado visualmente */}
                {editing ? (
                    <div className="bg-white dark:bg-gray-900 border-2 border-blue-400 dark:border-blue-500 rounded-2xl p-5 shadow-lg">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                            Editar mensagem
                        </p>
                        <AutoTextarea
                            textareaRef={textareaRef}
                            value={draft}
                            onChange={setDraft}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                        />
                        <div className="flex justify-end gap-2 mt-3">
                            <button
                                type="button"
                                onClick={() => setEditing(false)}
                                className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                <X size={13} /> Cancelar
                            </button>
                            <Form method="post">
                                <input type="hidden" name="intent"     value="editMessage" />
                                <input type="hidden" name="messageId"  value={msg.id} />
                                <input type="hidden" name="newMessage" value={draft} />
                                <button
                                    type="submit"
                                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                >
                                    <Check size={13} /> Guardar alterações
                                </button>
                            </Form>
                        </div>
                    </div>
                ) : (
                    /* Vista normal da bolha */
                    <div className={`rounded-2xl px-5 py-3.5 ${bubbleColor}`}>

                        {/* Botões de ação no hover */}
                        {isOwnMessage && (
                            <div className={`absolute top-2 ${alignRight ? "-left-16" : "-right-16"} flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
                                <button
                                    type="button"
                                    title="Editar"
                                    onClick={() => {
                                        setDraft(msg.message);
                                        setEditing(true);
                                        setTimeout(() => {
                                            textareaRef.current?.focus();
                                            textareaRef.current?.setSelectionRange(
                                                textareaRef.current.value.length,
                                                textareaRef.current.value.length
                                            );
                                        }, 60);
                                    }}
                                    className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-blue-600 hover:border-blue-300 shadow-sm transition-colors"
                                >
                                    <Pencil size={13} />
                                </button>
                                <button
                                    type="button"
                                    title="Apagar"
                                    onClick={() => setConfirm(true)}
                                    className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-red-600 hover:border-red-300 shadow-sm transition-colors"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        )}

                        {/* Confirmação de apagar */}
                        {confirm && (
                            <div className="absolute inset-0 rounded-2xl bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10 px-4">
                                <p className="text-white text-xs font-medium text-center">Apagar esta mensagem?</p>
                                <div className="flex gap-2">
                                    <Form method="post">
                                        <input type="hidden" name="intent"    value="deleteMessage" />
                                        <input type="hidden" name="messageId" value={msg.id} />
                                        <button type="submit"
                                            className="flex items-center gap-1 px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg transition-colors">
                                            <Trash2 size={11} /> Apagar
                                        </button>
                                    </Form>
                                    <button type="button" onClick={() => setConfirm(false)}
                                        className="flex items-center gap-1 px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-xs rounded-lg transition-colors">
                                        <X size={11} /> Cancelar
                                    </button>
                                </div>
                            </div>
                        )}

                        <p className={`text-xs font-semibold mb-1.5 ${metaClass}`}>{senderLabel}</p>
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>

                        {atts.length > 0 && (
                            <div className="mt-3">
                                <Attachments
                                    attachments={atts}
                                    entityType="ticket_message"
                                    entityId={msg.id}
                                    canDelete={viewerRole === "admin" && msg.sender === "admin"}
                                />
                            </div>
                        )}

                        <p className={`text-xs mt-1.5 ${metaClass}`}>
                            {new Date(msg.created_at).toLocaleString("pt-PT")}
                            {msg.edited_at && <span className="ml-1 opacity-60">(editado)</span>}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Página principal ──────────────────────────────────────────────────────
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
            {/* Cabeçalho */}
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

            {/* Thread */}
            {messages.length > 0 && (
                <div className="space-y-4 mb-6">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Histórico</h2>
                    {messages.map((msg, i) => {
                        const senderLabel = msg.sender === "admin"
                            ? "Suporte Técnico"
                            : msg.sender === "owner"
                            ? (site?.name ?? ticket.site_name)
                            : ticket.client_name;
                        return (
                            <MessageBubble
                                key={msg.id}
                                msg={msg}
                                atts={msgAttachments[i] ?? []}
                                viewerRole={viewerRole}
                                senderLabel={senderLabel}
                            />
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
