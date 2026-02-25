import { data, redirect, useLoaderData, Form } from "react-router";
import type { Route } from "./+types/admin.tickets.$id";
import { getTicketById, getTicketMessages, createTicketMessage, updateTicketStatus } from "~/lib/db";
import StatusBadge from "~/components/ui/StatusBadge";
import { sendAdminReply } from "~/lib/email";

export async function loader({ params, context }: Route.LoaderArgs) {
    const db     = context.cloudflare.env.DB;
    const id     = Number(params.id);
    const [ticket, messages] = await Promise.all([
        getTicketById(db, id),
        getTicketMessages(db, id),
    ]);
    if (!ticket) throw data("Ticket não encontrado", { status: 404 });
    return { ticket, messages };
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

        await createTicketMessage(db, { ticketId: id, sender: "admin", message });
        await updateTicketStatus(db, id, "in_progress");

        // Buscar ticket para obter dados do cliente
        const ticket = await getTicketById(db, id);
        if (ticket && env.RESEND_API_KEY) {
            await sendAdminReply({
                apiKey:      env.RESEND_API_KEY,
                from:        env.FROM_EMAIL,
                replyTo:     `ticket-${id}@suporte.tiagoanoliveira.pt`,
                to:          ticket.client_email,
                clientName:  ticket.client_name,
                ticketId:    id,
                category:    ticket.category,
                message,
                publicToken: ticket.public_token,
                baseUrl:     env.BASE_URL,
            });
        }

        return redirect(`/admin/tickets/${id}`);
    }

    if (intent === "status") {
        await updateTicketStatus(db, id, String(form.get("status")));
        return redirect(`/admin/tickets/${id}`);
    }

    return null;
}

export default function AdminTicketDetail() {
    const { ticket, messages } = useLoaderData<typeof loader>();

    const statusOptions = [
        { value: "open",        label: "Marcar Aberto" },
        { value: "in_progress", label: "Em Progresso" },
        { value: "closed",      label: "Fechar Ticket" },
    ].filter((o) => o.value !== ticket.status);

    return (
        <div className="max-w-3xl">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-xl font-bold">Ticket #{ticket.id}</h1>
                        <StatusBadge status={ticket.status} />
                    </div>
                    <p className="text-sm text-gray-500">{ticket.site_name} · {ticket.category}</p>
                </div>
                {/* Alterar estado */}
                <div className="flex gap-2">
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

            {/* Info do cliente */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 mb-6 grid grid-cols-2 gap-4 text-sm">
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
                    <p className="text-gray-700 dark:text-gray-300">{ticket.description}</p>
                </div>
            </div>

            {/* Thread de mensagens */}
            {messages.length > 0 && (
                <div className="space-y-4 mb-6">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Histórico</h2>
                    {messages.map((msg) => (
                        <div key={msg.id}
                             className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[80%] rounded-2xl px-5 py-3.5 text-sm ${
                                msg.sender === "admin"
                                    ? "bg-blue-600 text-white rounded-tr-sm"
                                    : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-tl-sm"
                            }`}>
                                <p className="leading-relaxed">{msg.message}</p>
                                <p className={`text-xs mt-1.5 ${msg.sender === "admin" ? "text-blue-200" : "text-gray-400"}`}>
                                    {msg.sender === "admin" ? "Tu" : ticket.client_name} ·{" "}
                                    {new Date(msg.created_at).toLocaleString("pt-PT")}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Formulário de resposta */}
            {ticket.status !== "closed" && (
                <Form method="post"
                      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                    <input type="hidden" name="intent" value="reply" />
                    <h2 className="font-semibold mb-3">Responder</h2>
                    <textarea name="message" rows={4} placeholder="Escreve a tua resposta…" required
                              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3" />
                    <div className="flex justify-end">
                        <button type="submit"
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                            Enviar resposta
                        </button>
                    </div>
                </Form>
            )}
            {ticket.status === "closed" && (
                <p className="text-sm text-center text-gray-400 py-4">Este ticket está fechado.</p>
            )}
        </div>
    );
}
