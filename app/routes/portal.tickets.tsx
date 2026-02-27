// app/routes/portal.tickets.tsx
import { useLoaderData } from "react-router";
import type { Route } from "./+types/portal.tickets";
import { getSessionUser } from "~/lib/auth.server";
import { getSitesByOwner, getTicketsBySiteIds } from "~/lib/db";
import StatusBadge from "~/components/ui/StatusBadge";
import { redirect } from "react-router";
import { MessageSquare } from "lucide-react";

export async function loader({ request, context }: Route.LoaderArgs) {
    const db   = context.cloudflare.env.DB;
    const user = await getSessionUser(db, request);
    if (!user) throw redirect("/portal");
    const sites   = await getSitesByOwner(db, user.id);
    const tickets = await getTicketsBySiteIds(db, sites.map((s) => s.id));
    return { tickets };
}

export default function PortalTickets() {
    const { tickets } = useLoaderData<typeof loader>();
    const open        = tickets.filter((t) => t.status === "open").length;
    const inProgress  = tickets.filter((t) => t.status === "in_progress").length;
    const closed      = tickets.filter((t) => t.status === "closed").length;

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">Os meus Tickets</h1>

            {tickets.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                        { label: "Em aberto",    value: open,       color: open > 0       ? "text-orange-500" : "text-gray-400" },
                        { label: "Em progresso", value: inProgress, color: inProgress > 0 ? "text-blue-500"   : "text-gray-400" },
                        { label: "Resolvidos",   value: closed,     color: "text-green-500" },
                    ].map((kpi) => (
                        <div key={kpi.label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
                            <p className="text-xs text-gray-400 mb-1">{kpi.label}</p>
                            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {tickets.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <MessageSquare size={36} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Ainda não tens tickets de suporte.</p>
                    <p className="text-xs mt-1">Se tiveres um problema, entra em contacto connosco.</p>
                </div>
            ) : (
                <>
                    {/* Mobile: cards */}
                    <div className="md:hidden space-y-3">
                        {tickets.map((t) => (
                            <div key={t.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div>
                                        <p className="font-semibold text-sm">{t.category}</p>
                                        <p className="text-xs text-gray-400">{t.site_name}</p>
                                    </div>
                                    <StatusBadge status={t.status} />
                                </div>
                                <p className="text-xs text-gray-400 mb-3">
                                    #{t.id} · {new Date(t.created_at).toLocaleDateString("pt-PT")}
                                </p>
                                <a href={`/ticket/${t.public_token}`}
                                    className="block text-center text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg py-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors">
                                    Ver ticket →
                                </a>
                            </div>
                        ))}
                    </div>

                    {/* Desktop: tabela */}
                    <div className="hidden md:block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="text-left px-6 py-3 font-medium text-gray-500">#</th>
                                <th className="text-left px-6 py-3 font-medium text-gray-500">Categoria</th>
                                <th className="text-left px-6 py-3 font-medium text-gray-500">Site</th>
                                <th className="text-left px-6 py-3 font-medium text-gray-500">Estado</th>
                                <th className="text-left px-6 py-3 font-medium text-gray-500">Data</th>
                                <th className="px-6 py-3" />
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {tickets.map((t) => (
                                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <td className="px-6 py-4 text-gray-400 font-mono">#{t.id}</td>
                                    <td className="px-6 py-4 font-medium">{t.category}</td>
                                    <td className="px-6 py-4 text-gray-500">{t.site_name}</td>
                                    <td className="px-6 py-4"><StatusBadge status={t.status} /></td>
                                    <td className="px-6 py-4 text-gray-400 text-xs">
                                        {new Date(t.created_at).toLocaleDateString("pt-PT")}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <a href={`/ticket/${t.public_token}`}
                                            className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium">Ver →</a>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
