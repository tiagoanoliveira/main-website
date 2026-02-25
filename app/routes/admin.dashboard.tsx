import { useLoaderData } from "react-router";
import type { Route } from "./+types/admin.dashboard";

export async function loader({ context }: Route.LoaderArgs) {
    const db = context.cloudflare.env.DB;
    const [totalTickets, openTickets, pendingInvoices] = await Promise.all([
        db.prepare("SELECT COUNT(*) as n FROM tickets").first<{ n: number }>(),
        db.prepare("SELECT COUNT(*) as n FROM tickets WHERE status = 'open'").first<{ n: number }>(),
        db.prepare("SELECT COUNT(*) as n FROM invoices WHERE status = 'pending'").first<{ n: number }>(),
    ]);
    return { totalTickets: totalTickets?.n ?? 0, openTickets: openTickets?.n ?? 0, pendingInvoices: pendingInvoices?.n ?? 0 };
}

export default function Dashboard() {
    const { totalTickets, openTickets, pendingInvoices } = useLoaderData<typeof loader>();
    const stats = [
        { label: "Total de Tickets", value: totalTickets, color: "text-blue-600" },
        { label: "Tickets Abertos", value: openTickets, color: "text-orange-500" },
        { label: "Faturas Pendentes", value: pendingInvoices, color: "text-red-500" },
    ];
    return (
        <div>
            <h1 className="text-2xl font-bold mb-8">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((s) => (
                    <div key={s.label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{s.label}</p>
                        <p className={`text-4xl font-bold ${s.color}`}>{s.value}</p>
                    </div>
                ))}
            </div>
            <div className="mt-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                <p className="text-sm text-gray-400 text-center">Os tickets e faturas aparecerão aqui nas próximas fases.</p>
            </div>
        </div>
    );
}
