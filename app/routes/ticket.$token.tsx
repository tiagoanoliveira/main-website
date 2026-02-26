import { data, redirect, useLoaderData, useActionData, Form, useNavigation } from "react-router";
import type { Route } from "./+types/ticket.$token";
import {
    getTicketByPublicToken, getTicketMessages,
    createTicketMessage
} from "~/lib/db";
import { sendAdminNotification } from "~/lib/email";
import StatusBadge from "~/components/ui/StatusBadge";
import { motion } from "motion/react";
import { Loader2, Send } from "lucide-react";

export async function loader({ params, context }: Route.LoaderArgs) {
    const db     = context.cloudflare.env.DB;
    const ticket = await getTicketByPublicToken(db, params.token);
    if (!ticket) throw data("Ticket não encontrado", { status: 404 });
    const messages = await getTicketMessages(db, ticket.id);
    return { ticket, messages };
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
    if (message.length < 5)
        return data({ error: "A mensagem é demasiado curta." }, { status: 400 });

    await createTicketMessage(db, { ticketId: ticket.id, sender: "client", message });

    // Notificar admin por email
    if (env.RESEND_API_KEY) {
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

    return redirect(`/ticket/${params.token}#latest`);
}

export default function TicketPublic() {
    const { ticket, messages } = useLoaderData<typeof loader>();
    const result               = useActionData<typeof action>();
    const navigation           = useNavigation();
    const isLoading            = navigation.state === "submitting";

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-12">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <motion.div
                    className="mb-8"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                >
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
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                >
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-medium">
                        Pedido inicial
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {ticket.description}
                    </p>
                    <p className="text-xs text-gray-400 mt-3">
                        {new Date(ticket.created_at).toLocaleString("pt-PT")}
                    </p>
                </motion.div>

                {/* Thread de mensagens */}
                {messages.length > 0 && (
                    <div className="space-y-4 mb-6">
                        {messages.map((msg, i) => (
                            <motion.div
                                key={msg.id}
                                id={i === messages.length - 1 ? "latest" : undefined}
                                className={`flex ${msg.sender === "admin" ? "justify-start" : "justify-end"}`}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.05 + i * 0.04 }}
                            >
                                <div className={`max-w-[85%] rounded-2xl px-5 py-4 text-sm ${
                                    msg.sender === "admin"
                                        ? "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-tl-sm"
                                        : "bg-blue-600 text-white rounded-tr-sm"
                                }`}>
                                    <p className={`text-xs font-semibold mb-1.5 ${
                                        msg.sender === "admin" ? "text-gray-400" : "text-blue-200"
                                    }`}>
                                        {msg.sender === "admin" ? "Suporte Técnico" : ticket.client_name}
                                    </p>
                                    <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                                    <p className={`text-xs mt-2 ${
                                        msg.sender === "admin" ? "text-gray-400" : "text-blue-200"
                                    }`}>
                                        {new Date(msg.created_at).toLocaleString("pt-PT")}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Formulário de resposta */}
                {ticket.status !== "closed" ? (
                    <motion.div
                        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                    >
                        <h2 className="font-semibold mb-4 text-sm">Adicionar informação ou resposta</h2>
                        <Form method="post" className="space-y-3">
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
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-xl transition-colors"
                                >
                                    {isLoading ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Send size={14} />
                                    )}
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
