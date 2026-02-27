// app/routes/admin.tickets.tsx
import { useLoaderData, Link, Form, useSearchParams } from "react-router";
import type { Route } from "./+types/admin.tickets";
import { getTickets, getSites } from "~/lib/db";
import StatusBadge from "~/components/ui/StatusBadge";
import { Phone, Mail } from "lucide-react";

export async function loader({ request, context }: Route.LoaderArgs) {
    const db     = context.cloudflare.env.DB;
    const url    = new URL(request.url);
    const siteId = url.searchParams.get("site")   ? Number(url.searchParams.get("site"))  : undefined;
    const status = url.searchParams.get("status") || undefined;
    const [tickets, sites] = await Promise.all([
        getTickets(db, { siteId, status }),
        getSites(db),
    ]);
    return { tickets, sites, filters: { siteId, status } };
}

export default function AdminTickets() {
    const { tickets, sites, filters } = useLoaderData<typeof loader>();
    const [, setSearchParams] = useSearchParams();

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">Tickets de Suporte</h1>

            {/* Filtros */}
            <Form method="get" className="flex flex-wrap gap-3 mb-6">
                <select name="site" defaultValue={filters.siteId ?? ""}
                        onChange={(e) => e.currentTarget.form?.requestSubmit()}
                        className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Todos os sites</option>
                    {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select name="status" defaultValue={filters.status ?? ""}
                        onChange={(e) => e.currentTarget.form?.requestSubmit()}
                        className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Todos os estados</option>
                    <option value="open">Abertos</option>
                    <option value="in_progress">Em progresso</option>
                    <option value="closed">Fechados</option>
                </select>
                {(filters.siteId || filters.status) && (
                    <button type="button" onClick={() => setSearchParams({})}
                            className="text-sm text-gray-500 hover:text-gray-700 underline">Limpar filtros</button>
                )}
            </Form>

            {tickets.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <p className="text-lg mb-2">Nenhum ticket encontrado</p>
                    <p className="text-sm">Os tickets criados pelos clientes aparecem aqui.</p>
                </div>
            ) : (
                <>
                    {/* ── Vista mobile: cards ── */}
                    <div className="md:hidden space-y-3">
                        {tickets.map((ticket) => (
                            <div key={ticket.id}
                                 className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div>
                                        <p className="font-semibold text-sm">{ticket.client_name}</p>
                                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                            <Mail size={10} /> {ticket.client_email}
                                        </p>
                                        {ticket.client_phone && (
                                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                <Phone size={10} /> {ticket.client_phone}
                                            </p>
                                        )}
                                    </div>
                                    <StatusBadge status={ticket.status} />
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                                    <span>#{ticket.id}</span>
                                    <span>{ticket.site_name}</span>
                                    <span>{ticket.category}</span>
                                    <span>{new Date(ticket.created_at).toLocaleDateString("pt-PT")}</span>
                                </div>
                                <Link to={`/admin/tickets/${ticket.id}`}
                                      className="block text-center text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg py-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors">
                                    Ver ticket →
                                </Link>
                            </div>
                        ))}
                    </div>

                    {/* ── Vista desktop: tabela ── */}
                    <div className="hidden md:block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="text-left px-6 py-3 font-medium text-gray-500">#</th>
                                <th className="text-left px-6 py-3 font-medium text-gray-500">Cliente</th>
                                <th className="text-left px-6 py-3 font-medium text-gray-500">Site</th>
                                <th className="text-left px-6 py-3 font-medium text-gray-500">Categoria</th>
                                <th className="text-left px-6 py-3 font-medium text-gray-500">Estado</th>
                                <th className="text-left px-6 py-3 font-medium text-gray-500">Data</th>
                                <th className="px-6 py-3" />
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {tickets.map((ticket) => (
                                <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <td className="px-6 py-4 text-gray-400 font-mono">#{ticket.id}</td>
                                    <td className="px-6 py-4">
                                        <p className="font-medium">{ticket.client_name}</p>
                                        <p className="text-xs text-gray-400">{ticket.client_email}</p>
                                        {ticket.client_phone && (
                                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                <Phone size={10} /> {ticket.client_phone}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">{ticket.site_name}</td>
                                    <td className="px-6 py-4 text-gray-500">{ticket.category}</td>
                                    <td className="px-6 py-4"><StatusBadge status={ticket.status} /></td>
                                    <td className="px-6 py-4 text-gray-400 text-xs">
                                        {new Date(ticket.created_at).toLocaleDateString("pt-PT")}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link to={`/admin/tickets/${ticket.id}`}
                                              className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Ver →</Link>
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
