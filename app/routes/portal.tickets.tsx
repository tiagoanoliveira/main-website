import { useLoaderData } from "react-router";
import type { Route } from "./+types/portal.tickets";
import { getSessionUser } from "~/lib/auth.server";
import { getSitesByOwner, getTicketsBySiteIds } from "~/lib/db";
import StatusBadge from "~/components/ui/StatusBadge";
import { redirect } from "react-router";

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
    return (
        <div>
            <h1 className="text-2xl font-bold mb-8">Os meus Tickets</h1>
            {tickets.length === 0 ? (
                <p className="text-center text-gray-400 py-12">Ainda não tens tickets de suporte.</p>
            ) : (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
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
                                       className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium">
                                        Ver →
                                    </a>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
