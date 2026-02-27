// app/routes/portal.dashboard.tsx
import { useLoaderData, Link } from "react-router";
import type { Route } from "./+types/portal.dashboard";
import { getSessionUser } from "~/lib/auth.server";
import { getSitesByOwner, getInvoicesBySiteIds, getTicketsBySiteIds } from "~/lib/db";
import StatusBadge from "~/components/ui/StatusBadge";
import { redirect } from "react-router";
import { Globe, FileText, Headphones, ExternalLink } from "lucide-react";

export async function loader({ request, context }: Route.LoaderArgs) {
    const db   = context.cloudflare.env.DB;
    const user = await getSessionUser(db, request);
    if (!user) throw redirect("/portal");

    const sites   = await getSitesByOwner(db, user.id);
    const siteIds = sites.map((s) => s.id);
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

            {/* Sites — cards com informação útil */}
            {sites.length > 0 && (
                <div className="mb-6">
                    <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-3">Os teus sites</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {sites.map((site) => (
                            <div
                                key={site.id}
                                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 flex items-start gap-4"
                            >
                                {/* Logo ou ícone com brand_color */}
                                <div
                                    className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                                    style={{ backgroundColor: site.brand_color ?? "#2563eb" }}
                                >
                                    {site.logo_r2_key ? (
                                        <img
                                            src={`/uploads/${site.logo_r2_key}`}
                                            alt={site.name}
                                            className="w-7 h-7 object-contain rounded-lg"
                                        />
                                    ) : (
                                        <Globe size={18} className="text-white" />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm truncate">{site.name}</p>
                                    <a
                                        href={`https://${site.domain}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors mt-0.5"
                                    >
                                        <ExternalLink size={11} />
                                        {site.domain}
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Faturas pendentes */}
            {pendingInvoices.length > 0 && (
                <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50 rounded-2xl p-5 mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-semibold text-sm text-orange-700 dark:text-orange-400 flex items-center gap-2">
                            <FileText size={15} />
                            Faturas por pagar
                        </h2>
                        <Link to="/portal/invoices" className="text-xs text-orange-600 hover:underline">Ver todas</Link>
                    </div>
                    <div className="space-y-2">
                        {pendingInvoices.slice(0, 3).map((inv) => (
                            <div key={inv.id} className="flex items-center justify-between text-sm">
                                <span className="text-gray-700 dark:text-gray-300 truncate max-w-[60%]">{inv.description}</span>
                                <span className="font-semibold text-orange-600 whitespace-nowrap ml-2">{inv.amount.toFixed(2)} €</span>
                            </div>
                        ))}
                    </div>
                    {pendingInvoices.length > 3 && (
                        <p className="text-xs text-orange-500 mt-2">+{pendingInvoices.length - 3} mais faturas em aberto</p>
                    )}
                </div>
            )}

            {/* Tickets recentes */}
            {recentTickets.length > 0 && (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold flex items-center gap-2">
                            <Headphones size={15} className="text-gray-400" />
                            Tickets recentes
                        </h2>
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
