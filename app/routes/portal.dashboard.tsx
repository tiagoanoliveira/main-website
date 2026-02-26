import { useLoaderData, Link } from "react-router";
import type { Route } from "./+types/portal.dashboard";
import { getSessionUser } from "~/lib/auth.server";
import { getSitesByOwner, getInvoicesBySiteIds, getTicketsBySiteIds } from "~/lib/db";
import StatusBadge from "~/components/ui/StatusBadge";
import { redirect } from "react-router";

export async function loader({ request, context }: Route.LoaderArgs) {
    const db   = context.cloudflare.env.DB;
    const user = await getSessionUser(db, request);
    if (!user) throw redirect("/portal");

    const sites    = await getSitesByOwner(db, user.id);
    const siteIds  = sites.map((s) => s.id);
    const [invoices, tickets] = await Promise.all([
        getInvoicesBySiteIds(db, siteIds),
        getTicketsBySiteIds(db, siteIds),
    ]);

    const pendingInvoices = invoices.filter((i) => i.status === "pending");
    const openTickets     = tickets.filter((t) => t.status !== "closed");
    const totalDue        = pendingInvoices.reduce((s, i) => s + i.amount, 0);

    return { user, sites, pendingInvoices, openTickets, totalDue, recentTickets: tickets.slice(0, 5) };
}

export default function PortalDashboard() {
    const { user, sites, pendingInvoices, openTickets, totalDue, recentTickets } = useLoaderData<typeof loader>();

    return (
        <div>
            <h1 className="text-2xl font-bold mb-1">Olá, {user.name.split(" ")[0]} 👋</h1>
            <p className="text-gray-500 text-sm mb-8">Aqui tens um resumo da tua conta.</p>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                    <p className="text-xs text-gray-400 mb-1">Sites ativos</p>
                    <p className="text-3xl font-bold text-blue-600">{sites.length}</p>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                    <p className="text-xs text-gray-400 mb-1">Faturas em aberto</p>
                    <p className={`text-3xl font-bold ${pendingInvoices.length > 0 ? "text-orange-500" : "text-green-500"}`}>
                        {totalDue.toFixed(2)} €
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                    <p className="text-xs text-gray-400 mb-1">Tickets abertos</p>
                    <p className={`text-3xl font-bold ${openTickets.length > 0 ? "text-orange-500" : "text-green-500"}`}>
                        {openTickets.length}
                    </p>
                </div>
            </div>

            {/* Sites */}
            {sites.length > 0 && (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 mb-6">
                    <h2 className="font-semibold mb-4">Os teus sites</h2>
                    <div className="space-y-3">
                        {sites.map((site) => (
                            <div key={site.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                                <div>
                                    <p className="font-medium text-sm">{site.name}</p>
                                    <p className="text-xs text-gray-400">{site.domain}</p>
                                </div>
                                <a href={`/support/${site.token}`} target="_blank" rel="noopener noreferrer"
                                   className="text-xs text-blue-600 hover:underline">
                                    Suporte →
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tickets recentes */}
            {recentTickets.length > 0 && (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold">Tickets recentes</h2>
                        <Link to="/portal/tickets" className="text-xs text-blue-600 hover:underline">Ver todos</Link>
                    </div>
                    <div className="space-y-3">
                        {recentTickets.map((t) => (
                            <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                                <div>
                                    <p className="text-sm font-medium">#{t.id} · {t.category}</p>
                                    <p className="text-xs text-gray-400">{t.site_name}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <StatusBadge status={t.status} />
                                    <a href={`/ticket/${t.public_token}`}
                                       className="text-xs text-blue-600 hover:underline">Ver →</a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
