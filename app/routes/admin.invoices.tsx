import { data, redirect, useLoaderData, useActionData, Form } from "react-router";
import type { Route } from "./+types/admin.invoices";
import {
    getInvoices,
    getSites,
    createInvoice,
    updateInvoice,
    markInvoicePaid,
    deleteInvoice,
    getAttachments,
    createAttachment,
    deleteAttachment,
    type Attachment,
} from "~/lib/db";
import StatusBadge from "~/components/ui/StatusBadge";
import Attachments from "~/components/ui/Attachments";
import { uploadFile, buildR2Key } from "~/lib/storage";
import { PlusCircle, CheckCheck, Trash2, Paperclip, ChevronDown, ChevronUp, Pencil, X } from "lucide-react";
import { useState } from "react";

export async function loader({ request, context }: Route.LoaderArgs) {
    const db     = context.cloudflare.env.DB;
    const url    = new URL(request.url);
    const siteId = url.searchParams.get("site") ? Number(url.searchParams.get("site")) : undefined;

    const [invoices, sites] = await Promise.all([
        getInvoices(db, { siteId }),
        getSites(db),
    ]);

    const attachmentsByInvoice: Record<number, Attachment[]> = {};
    await Promise.all(
        invoices.map(async (inv) => {
            attachmentsByInvoice[inv.id] = await getAttachments(db, "invoice", inv.id);
        })
    );

    const total   = invoices.reduce((s, i) => s + i.amount, 0);
    const pending = invoices.filter((i) => i.status === "pending").reduce((s, i) => s + i.amount, 0);

    return { invoices, sites, filters: { siteId }, total, pending, attachmentsByInvoice };
}

export async function action({ request, context }: Route.ActionArgs) {
    const db     = context.cloudflare.env.DB;
    const env    = context.cloudflare.env;
    const form   = await request.formData();
    const intent = String(form.get("intent"));

    if (intent === "create") {
        const siteId      = Number(form.get("siteId"));
        const description = String(form.get("description") || "").trim();
        const amount      = parseFloat(String(form.get("amount") || "0"));
        const dueDate     = String(form.get("dueDate") || "").trim() || null;

        if (!siteId || !description || isNaN(amount) || amount <= 0)
            return data({ error: "Preenche todos os campos corretamente." }, { status: 400 });

        const invoiceId = await createInvoice(db, { siteId, description, amount, dueDate });

        const files = form.getAll("files") as File[];
        for (const file of files) {
            if (!(file instanceof File) || file.size === 0) continue;
            try {
                const key = buildR2Key("invoice", invoiceId, file.name);
                await uploadFile(env.UPLOADS, key, file);
                await createAttachment(db, {
                    entityType: "invoice",
                    entityId:   invoiceId,
                    fileName:   file.name,
                    fileType:   file.type,
                    fileSize:   file.size,
                    r2Key:      key,
                });
            } catch (err) {
                console.error("Erro ao fazer upload de anexo:", err);
            }
        }

        return redirect("/admin/invoices");
    }

    if (intent === "update") {
        const id          = Number(form.get("id"));
        const description = String(form.get("description") || "").trim();
        const amount      = parseFloat(String(form.get("amount") || "0"));
        const dueDate     = String(form.get("dueDate") || "").trim() || null;
        const status      = String(form.get("status") || "pending");

        if (!id || !description || isNaN(amount) || amount <= 0)
            return data({ error: "Preenche todos os campos corretamente." }, { status: 400 });

        await updateInvoice(db, id, { description, amount, dueDate, status });
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

    if (intent === "deleteAttachment") {
        const attachmentId = Number(form.get("attachmentId"));
        const r2Key = await deleteAttachment(db, attachmentId);
        if (r2Key) {
            try { await env.UPLOADS.delete(r2Key); } catch (e) { console.error(e); }
        }
        return redirect("/admin/invoices");
    }

    return null;
}

function InvoiceRow({
    inv,
    attachments,
}: {
    inv: ReturnType<typeof useLoaderData<typeof loader>>["invoices"][number];
    attachments: Attachment[];
}) {
    const [open, setOpen]       = useState(false);
    const [editing, setEditing] = useState(false);
    const isOverdue = inv.status === "pending" && inv.due_date && new Date(inv.due_date) < new Date();

    return (
        <>
            <tr
                className={`transition-colors ${
                    isOverdue ? "bg-red-50/50 dark:bg-red-950/10" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                }`}
            >
                <td className="px-6 py-4 text-gray-400 font-mono">#{inv.id}</td>
                <td className="px-6 py-4">
                    <p className="font-medium">{inv.site_name}</p>
                    <p className="text-xs text-gray-400">{inv.owner_name ?? "—"}</p>
                </td>
                <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{inv.description}</td>
                <td className="px-6 py-4 font-semibold">{inv.amount.toFixed(2)} €</td>
                <td className="px-6 py-4">
                    <StatusBadge status={inv.status} />
                </td>
                <td className="px-6 py-4 text-gray-400 text-xs">
                    {inv.due_date ? new Date(inv.due_date).toLocaleDateString("pt-PT") : "—"}
                </td>
                <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                        {attachments.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setOpen((v) => !v)}
                                className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors"
                                title={open ? "Fechar anexos" : "Ver anexos"}
                            >
                                <Paperclip size={13} />
                                {attachments.length}
                                {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => setEditing((v) => !v)}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                            title="Editar fatura"
                        >
                            <Pencil size={14} />
                        </button>

                        {inv.status === "pending" && (
                            <Form method="post">
                                <input type="hidden" name="intent" value="paid" />
                                <input type="hidden" name="id" value={inv.id} />
                                <button
                                    type="submit"
                                    title="Marcar como pago"
                                    className="text-green-500 hover:text-green-700 transition-colors"
                                >
                                    <CheckCheck size={15} />
                                </button>
                            </Form>
                        )}

                        <Form
                            method="post"
                            onSubmit={(e) => !confirm("Eliminar fatura?") && e.preventDefault()}
                        >
                            <input type="hidden" name="intent" value="delete" />
                            <input type="hidden" name="id" value={inv.id} />
                            <button
                                type="submit"
                                className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                                <Trash2 size={14} />
                            </button>
                        </Form>
                    </div>
                </td>
            </tr>

            {/* Linha de edição inline */}
            {editing && (
                <tr className="bg-blue-50/50 dark:bg-blue-950/10">
                    <td colSpan={7} className="px-6 py-4">
                        <Form method="post" className="flex flex-wrap gap-3 items-end">
                            <input type="hidden" name="intent" value="update" />
                            <input type="hidden" name="id"     value={inv.id} />

                            <div>
                                <label className="block text-xs font-medium mb-1 text-gray-500">Descrição</label>
                                <input
                                    name="description"
                                    defaultValue={inv.description}
                                    required
                                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1 text-gray-500">Valor (€)</label>
                                <input
                                    name="amount"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    defaultValue={inv.amount}
                                    required
                                    className="w-28 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1 text-gray-500">Data limite</label>
                                <input
                                    name="dueDate"
                                    type="date"
                                    defaultValue={inv.due_date?.slice(0, 10) ?? ""}
                                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1 text-gray-500">Estado</label>
                                <select
                                    name="status"
                                    defaultValue={inv.status}
                                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="pending">Pendente</option>
                                    <option value="paid">Pago</option>
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                    Guardar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditing(false)}
                                    className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </Form>
                    </td>
                </tr>
            )}

            {/* Linha de expansão dos anexos */}
            {open && attachments.length > 0 && (
                <tr className="bg-gray-50/80 dark:bg-gray-800/40">
                    <td colSpan={7} className="px-6 py-3">
                        <Attachments
                            attachments={attachments}
                            entityType="invoice"
                            entityId={inv.id}
                            canDelete
                        />
                    </td>
                </tr>
            )}
        </>
    );
}

export default function AdminInvoices() {
    const { invoices, sites, filters, total, pending, attachmentsByInvoice } =
        useLoaderData<typeof loader>();
    const result = useActionData<typeof action>();

    return (
        <div>
            <h1 className="text-2xl font-bold mb-8">Faturas</h1>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                    { label: "Total faturado", value: `${total.toFixed(2)} €`,   color: "text-gray-900 dark:text-white" },
                    { label: "Em aberto",      value: `${pending.toFixed(2)} €`, color: "text-orange-500" },
                    { label: "Nº de faturas",  value: invoices.length,           color: "text-blue-600" },
                ].map((kpi) => (
                    <div
                        key={kpi.label}
                        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5"
                    >
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

                <Form method="post" encType="multipart/form-data" className="space-y-4">
                    <input type="hidden" name="intent" value="create" />

                    {result?.error && (
                        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 px-4 py-2.5 rounded-lg">
                            {result.error}
                        </p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-medium mb-1.5 text-gray-500">Site / Cliente</label>
                            <select
                                name="siteId"
                                required
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Selecionar…</option>
                                {sites.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} {s.owner_name ? `(${s.owner_name})` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium mb-1.5 text-gray-500">Descrição</label>
                            <input
                                name="description"
                                placeholder="Manutenção mensal"
                                required
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium mb-1.5 text-gray-500">Valor (€)</label>
                            <input
                                name="amount"
                                type="number"
                                step="0.01"
                                min="0.01"
                                placeholder="0.00"
                                required
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium mb-1.5 text-gray-500">Data limite (opcional)</label>
                            <input
                                name="dueDate"
                                type="date"
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Anexos */}
                    <div>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5">
                            <Paperclip size={12} />
                            Anexar ficheiro (opcional)
                        </label>
                        <input
                            type="file"
                            name="files"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            className="text-sm text-gray-500
                file:mr-3 file:py-1.5 file:px-3
                file:rounded-lg file:border-0
                file:text-xs file:font-medium
                file:bg-gray-50 file:text-gray-700
                hover:file:bg-gray-100
                dark:file:bg-gray-800 dark:file:text-gray-300"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            PDF, JPG, PNG, WebP — máx. 10 MB por ficheiro
                        </p>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
                        >
                            Criar Fatura
                        </button>
                    </div>
                </Form>
            </div>

            {/* Filtro por site */}
            <Form method="get" className="mb-4">
                <select
                    name="site"
                    defaultValue={filters.siteId ?? ""}
                    onChange={(e) => e.currentTarget.form?.requestSubmit()}
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">Todos os sites</option>
                    {sites.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.name}
                        </option>
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
                            <InvoiceRow
                                key={inv.id}
                                inv={inv}
                                attachments={attachmentsByInvoice[inv.id] ?? []}
                            />
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
