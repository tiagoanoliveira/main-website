import { data, redirect, useLoaderData, useActionData, Form } from "react-router";
import type { Route } from "./+types/admin.invoices";
import { getInvoices, getSites, createInvoice, markInvoicePaid, deleteInvoice } from "~/lib/db";
import StatusBadge from "~/components/ui/StatusBadge";
import { PlusCircle, CheckCheck, Trash2 } from "lucide-react";

export async function loader({ request, context }: Route.LoaderArgs) {
    const db     = context.cloudflare.env.DB;
    const url    = new URL(request.url);
    const siteId = url.searchParams.get("site") ? Number(url.searchParams.get("site")) : undefined;
    const [invoices, sites] = await Promise.all([
        getInvoices(db, { siteId }),
        getSites(db),
    ]);
    const total   = invoices.reduce((s, i) => s + i.amount, 0);
    const pending = invoices.filter((i) => i.status === "pending").reduce((s, i) => s + i.amount, 0);
    return { invoices, sites, filters: { siteId }, total, pending };
}

export async function action({ request, context }: Route.ActionArgs) {
    const db     = context.cloudflare.env.DB;
    const form   = await request.formData();
    const intent = String(form.get("intent"));

    if (intent === "create") {
        const siteId      = Number(form.get("siteId"));
        const description = String(form.get("description") || "").trim();
        const amount      = parseFloat(String(form.get("amount") || "0"));
        const dueDate     = String(form.get("dueDate") || "").trim() || null;
        if (!siteId || !description || isNaN(amount) || amount <= 0)
            return data({ error: "Preenche todos os campos corretamente." }, { status: 400 });
        await createInvoice(db, { siteId, description, amount, dueDate });
        return redirect("/admin/invoices");
    }

    if (intent === "paid") {
        await markInvoicePaid(db, Number(form.get("id")));
        return redirect("/admin/invoices");
    }

    if (intent === "delete") {
        await deleteInvoice(db, Number(form.get("id")));
        return redirect("/admin/invoices");
    }

    return null;
}

export default function AdminInvoices() {
    const { invoices, sites, filters, total, pending } = useLoaderData<typeof loader>();
    const result = useActionData<typeof action>();

    return (
        <div>
            <h1 className="text-2xl font-bold mb-8">Faturas</h1>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                    { label: "Total faturado",  value: `${total.toFixed(2)} €`,   color: "text-gray-900 dark:text-white" },
                    { label: "Em aberto",       value: `${pending.toFixed(2)} €`, color: "text-orange-500" },
                    { label: "Nº de faturas",   value: invoices.length,           color: "text-blue-600" },
                ].map((kpi) => (
                    <div key={kpi.label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                        <p className="text-xs text-gray-400 mb-1">{kpi.label}</p>
                        <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                    </div>
                ))}
            </div>

            {/* Formulário nova fatura */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 mb-8">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                    <PlusCircle size={16} /> Nova Fatura
                </h2>
                <Form method="post" className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                    <input type="hidden" name="intent" value="create" />
                    {result?.error && (
                        <p className="col-span-full text-sm text-red-600">{result.error}</p>
                    )}
                    <div>
                        <label className="block text-xs font-medium mb-1.5 text-gray-500">Site / Cliente</label>
                        <select name="siteId" required
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Selecionar…</option>
                            {sites.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name} {s.owner_name ? `(${s.owner_name})` : ""}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-xs font-medium mb-1.5 text-gray-500">Descrição</label>
                        <input name="description" placeholder="Manutenção mensal" required
                               className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1.5 text-gray-500">Valor (€)</label>
                        <input name="amount" type="number" step="0.01" min="0.01" placeholder="0.00" required
                               className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1.5 text-gray-500">Data limite (opcional)</label>
                        <input name="dueDate" type="date"
                               className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="md:col-span-full flex justify-end">
                        <button type="submit"
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors">
                            Criar Fatura
                        </button>
                    </div>
                </Form>
            </div>

            {/* Filtro por site */}
            <Form method="get" className="mb-4">
                <select name="site" defaultValue={filters.siteId ?? ""}
                        onChange={(e) => e.currentTarget.form?.requestSubmit()}
                        className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Todos os sites</option>
                    {sites.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
            </Form>

            {/* Tabela */}
            {invoices.length === 0 ? (
                <p className="text-center text-gray-400 py-12">Nenhuma fatura encontrada.</p>
            ) : (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="text-left px-6 py-3 font-medium text-gray-500">#</th>
                            <th className="text-left px-6 py-3 font-medium text-gray-500">Cliente / Site</th>
                            <th className="text-left px-6 py-3 font-medium text-gray-500">Descrição</th>
                            <th className="text-left px-6 py-3 font-medium text-gray-500">Valor</th>
                            <th className="text-left px-6 py-3 font-medium text-gray-500">Estado</th>
                            <th className="text-left px-6 py-3 font-medium text-gray-500">Vencimento</th>
                            <th className="px-6 py-3" />
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {invoices.map((inv) => (
                            <tr key={inv.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                                inv.status === "pending" && inv.due_date && new Date(inv.due_date) < new Date()
                                    ? "bg-red-50/50 dark:bg-red-950/10"
                                    : ""
                            }`}>
                                <td className="px-6 py-4 text-gray-400 font-mono">#{inv.id}</td>
                                <td className="px-6 py-4">
                                    <p className="font-medium">{inv.site_name}</p>
                                    <p className="text-xs text-gray-400">{inv.owner_name ?? "—"}</p>
                                </td>
                                <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{inv.description}</td>
                                <td className="px-6 py-4 font-semibold">{inv.amount.toFixed(2)} €</td>
                                <td className="px-6 py-4"><StatusBadge status={inv.status} /></td>
                                <td className="px-6 py-4 text-gray-400 text-xs">
                                    {inv.due_date
                                        ? new Date(inv.due_date).toLocaleDateString("pt-PT")
                                        : "—"}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-end gap-3">
                                        {inv.status === "pending" && (
                                            <Form method="post">
                                                <input type="hidden" name="intent" value="paid" />
                                                <input type="hidden" name="id" value={inv.id} />
                                                <button type="submit" title="Marcar como pago"
                                                        className="text-green-500 hover:text-green-700 transition-colors">
                                                    <CheckCheck size={15} />
                                                </button>
                                            </Form>
                                        )}
                                        <Form method="post" onSubmit={(e) => !confirm("Eliminar fatura?") && e.preventDefault()}>
                                            <input type="hidden" name="intent" value="delete" />
                                            <input type="hidden" name="id" value={inv.id} />
                                            <button type="submit" className="text-gray-400 hover:text-red-500 transition-colors">
                                                <Trash2 size={14} />
                                            </button>
                                        </Form>
                                    </div>
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
