import { useLoaderData } from "react-router";
import type { Route } from "./+types/portal.invoices";
import { getSessionUser } from "~/lib/auth.server";
import { getSitesByOwner, getInvoicesBySiteIds } from "~/lib/db";
import StatusBadge from "~/components/ui/StatusBadge";
import { redirect } from "react-router";

export async function loader({ request, context }: Route.LoaderArgs) {
    const db   = context.cloudflare.env.DB;
    const user = await getSessionUser(db, request);
    if (!user) throw redirect("/portal");
    const sites    = await getSitesByOwner(db, user.id);
    const invoices = await getInvoicesBySiteIds(db, sites.map((s) => s.id));
    return { invoices };
}

export default function PortalInvoices() {
    const { invoices } = useLoaderData<typeof loader>();
    const total   = invoices.reduce((s, i) => s + i.amount, 0);
    const pending = invoices.filter((i) => i.status === "pending").reduce((s, i) => s + i.amount, 0);

    return (
        <div>
            <h1 className="text-2xl font-bold mb-8">As minhas Faturas</h1>
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                    <p className="text-xs text-gray-400 mb-1">Total pago</p>
                    <p className="text-2xl font-bold text-green-500">{(total - pending).toFixed(2)} €</p>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                    <p className="text-xs text-gray-400 mb-1">Em aberto</p>
                    <p className={`text-2xl font-bold ${pending > 0 ? "text-orange-500" : "text-green-500"}`}>
                        {pending.toFixed(2)} €
                    </p>
                </div>
            </div>
            {invoices.length === 0 ? (
                <p className="text-center text-gray-400 py-12">Ainda não tens faturas.</p>
            ) : (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="text-left px-6 py-3 font-medium text-gray-500">#</th>
                            <th className="text-left px-6 py-3 font-medium text-gray-500">Descrição</th>
                            <th className="text-left px-6 py-3 font-medium text-gray-500">Site</th>
                            <th className="text-left px-6 py-3 font-medium text-gray-500">Valor</th>
                            <th className="text-left px-6 py-3 font-medium text-gray-500">Estado</th>
                            <th className="text-left px-6 py-3 font-medium text-gray-500">Vencimento</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {invoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <td className="px-6 py-4 text-gray-400 font-mono">#{inv.id}</td>
                                <td className="px-6 py-4 font-medium">{inv.description}</td>
                                <td className="px-6 py-4 text-gray-500">{inv.site_name}</td>
                                <td className="px-6 py-4 font-semibold">{inv.amount.toFixed(2)} €</td>
                                <td className="px-6 py-4"><StatusBadge status={inv.status} /></td>
                                <td className="px-6 py-4 text-gray-400 text-xs">
                                    {inv.due_date ? new Date(inv.due_date).toLocaleDateString("pt-PT") : "—"}
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
