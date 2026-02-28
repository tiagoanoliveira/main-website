import { data, redirect, useLoaderData, useActionData, Form } from "react-router";
import type { Route } from "./+types/admin.tickets.$id";
import {
    getTicketById,
    getTicketMessages,
    createTicketMessage,
    updateTicketStatus,
    getAttachments,
    createAttachment,
    deleteAttachment,
} from "~/lib/db";
import StatusBadge from "~/components/ui/StatusBadge";
import Attachments from "~/components/ui/Attachments";
import { sendAdminReply } from "~/lib/email";
import { uploadFile, buildR2Key } from "~/lib/storage";
import { Paperclip } from "lucide-react";

export async function loader({ params, context }: Route.LoaderArgs) {
    const db = context.cloudflare.env.DB;
    const id = Number(params.id);

    const [ticket, messages] = await Promise.all([
        getTicketById(db, id),
        getTicketMessages(db, id),
    ]);

    if (!ticket) throw data("Ticket não encontrado", { status: 404 });

    const ticketAttachments = await getAttachments(db, "ticket", id);
    const msgAttachments = await Promise.all(
        messages.map((m) => getAttachments(db, "ticket_message", m.id))
    );

    return { ticket, messages, ticketAttachments, msgAttachments };
}

export async function action({ request, params, context }: Route.ActionArgs) {
    const db     = context.cloudflare.env.DB;
    const env    = context.cloudflare.env;
    const id     = Number(params.id);
    const form   = await request.formData();
    const intent = String(form.get("intent"));

    if (intent === "reply") {
        const message = String(form.get("message") || "").trim();
        if (!message) return data({ error: "A resposta não pode estar vazia." }, { status: 400 });

        const msgId = await createTicketMessage(db, { ticketId: id, sender: "admin", message });
        await updateTicketStatus(db, id, "in_progress");

        // Upload de anexos
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

        // Enviar email ao cliente
        const ticket = await getTicketById(db, id);
        if (!env.RESEND_API_KEY) {
            console.warn("⚠️  RESEND_API_KEY não configurado — email não enviado.");
        } else if (ticket) {
            // Usa o email do site se configurado; caso contrário usa o global FROM_EMAIL
            const fromEmail = ticket.site_from_email || env.FROM_EMAIL;
            try {
                await sendAdminReply({
                    apiKey:      env.RESEND_API_KEY,
                    from:        fromEmail,
                    to:          ticket.client_email,
                    clientName:  ticket.client_name,
                    ticketId:    id,
                    category:    ticket.category,
                    message,
                    publicToken: ticket.public_token,
                    baseUrl:     env.BASE_URL,
                });
            } catch (err) {
                console.error("❌ Erro ao enviar email:", err);
            }
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
    const { ticket, messages, ticketAttachments, msgAttachments } =
        useLoaderData<typeof loader>();
    const result = useActionData<typeof action>();

    const statusOptions = [
        { value: "open",        label: "Marcar Aberto" },
        { value: "in_progress", label: "Em Progresso" },
        { value: "closed",      label: "Fechar Ticket" },
    ].filter((o) => o.value !== ticket.status);

    return (
        <div className="max-w-3xl">
            <div className="flex items-start justify-between mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-xl font-bold">Ticket #{ticket.id}</h1>
                        <StatusBadge status={ticket.status} />
                    </div>
                    <p className="text-sm text-gray-500">
                        {ticket.site_name} · {ticket.category}
                    </p>
                </div>
                <div className="flex gap-2">
                    {statusOptions.map((opt) => (
                        <Form method="post" key={opt.value}>
                            <input type="hidden" name="intent" value="status" />
                            <input type="hidden" name="status" value={opt.value} />
                            <button
                                type="submit"
                                className="px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                {opt.label}
                            </button>
                        </Form>
                    ))}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 mb-6 text-sm">
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <p className="text-xs text-gray-400 mb-1">Cliente</p>
                        <p className="font-medium">{ticket.client_name}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 mb-1">Email</p>
                        <p>{ticket.client_email}</p>
                    </div>
                    <div className="col-span-2">
                        <p className="text-xs text-gray-400 mb-1">Descrição inicial</p>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{ticket.description}</p>
                    </div>
                </div>
                <Attachments attachments={ticketAttachments} entityType="ticket" entityId={ticket.id} canDelete />
            </div>

            {messages.length > 0 && (
                <div className="space-y-4 mb-6">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Histórico</h2>
                    {messages.map((msg, i) => (
                        <div key={msg.id} className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[80%] rounded-2xl px-5 py-3.5 text-sm ${
                                msg.sender === "admin"
                                    ? "bg-blue-600 text-white rounded-tr-sm"
                                    : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-tl-sm"
                            }`}>
                                <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                                <p className={`text-xs mt-1.5 ${msg.sender === "admin" ? "text-blue-200" : "text-gray-400"}`}>
                                    {msg.sender === "admin" ? "Tu" : ticket.client_name} ·{" "}
                                    {new Date(msg.created_at).toLocaleString("pt-PT")}
                                </p>
                                {msgAttachments[i]?.length > 0 && (
                                    <div className={msg.sender === "admin" ? "mt-3 opacity-90" : "mt-3"}>
                                        <Attachments
                                            attachments={msgAttachments[i]}
                                            entityType="ticket_message"
                                            entityId={msg.id}
                                            canDelete={msg.sender === "admin"}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {ticket.status !== "closed" ? (
                <Form method="post" encType="multipart/form-data"
                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                    <input type="hidden" name="intent" value="reply" />
                    <h2 className="font-semibold mb-3">Responder</h2>

                    {result?.error && (
                        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 px-4 py-2.5 rounded-lg mb-3">
                            {result.error}
                        </p>
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
