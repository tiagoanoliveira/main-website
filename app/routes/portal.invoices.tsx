// app/routes/portal.invoices.tsx
import { useLoaderData } from "react-router";
import type { Route } from "./+types/portal.invoices";
import { getSessionUser } from "~/lib/auth.server";
import { getSitesByOwner, getInvoicesBySiteIds, getAttachmentsByEntityIds, type Attachment } from "~/lib/db";
import StatusBadge from "~/components/ui/StatusBadge";
import { redirect } from "react-router";
import { FileText, Image, ChevronDown, ChevronUp, Paperclip } from "lucide-react";
import { useState } from "react";

export async function loader({ request, context }: Route.LoaderArgs) {
    const db   = context.cloudflare.env.DB;
    const user = await getSessionUser(db, request);
    if (!user) throw redirect("/portal");
    const sites    = await getSitesByOwner(db, user.id);
    const invoices = await getInvoicesBySiteIds(db, sites.map((s) => s.id));
    const invoiceIds = invoices.map((i) => i.id);
    const allAttachments = invoiceIds.length > 0
        ? await getAttachmentsByEntityIds(db, "invoice", invoiceIds)
        : [];
    const attachmentsByInvoice: Record<number, Attachment[]> = {};
    for (const att of allAttachments) {
        if (!attachmentsByInvoice[att.entity_id]) attachmentsByInvoice[att.entity_id] = [];
        attachmentsByInvoice[att.entity_id].push(att);
    }
    const total   = invoices.reduce((s, i) => s + i.amount, 0);
    const pending = invoices.filter((i) => i.status === "pending").reduce((s, i) => s + i.amount, 0);
    return { invoices, attachmentsByInvoice, total, pending };
}

function AttachmentChip({ att }: { att: Attachment }) {
    const isImage = att.file_type.startsWith("image/");
    return (
        <a href={`/uploads/${att.r2_key}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-300 transition-colors">
            {isImage ? <Image size={11} /> : <FileText size={11} />}
            {att.file_name}
        </a>
    );
}

/** Card mobile para uma fatura (portal) */
function InvoiceMobileCard({
    inv, attachments,
}: {
    inv: ReturnType<typeof useLoaderData<typeof loader>>["invoices"][number];
    attachments: Attachment[];
}) {
    const [open, setOpen] = useState(false);
    const isOverdue = inv.status === "pending" && inv.due_date && new Date(inv.due_date) < new Date();
    return (
        <div className={`bg-white dark:bg-gray-900 border rounded-xl p-4 ${
            isOverdue ? "border-red-200 dark:border-red-900/50" : "border-gray-200 dark:border-gray-800"
        }`}>
            <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                    <p className="font-semibold text-sm">{inv.description}</p>
                    <p className="text-xs text-gray-400">{inv.site_name}</p>
                </div>
                <StatusBadge status={inv.status} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-2">
                <span className="font-semibold text-gray-900 dark:text-white">{inv.amount.toFixed(2)} €</span>
                <span>#{inv.id}</span>
                {inv.due_date && (
                    <span className={isOverdue ? "text-red-500" : ""}>
                        Vence: {new Date(inv.due_date).toLocaleDateString("pt-PT")}
                    </span>
                )}
            </div>
            {attachments.length > 0 && (
                <div className="mt-3">
                    <button type="button" onClick={() => setOpen((v) => !v)}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 transition-colors">
                        <Paperclip size={12} /> {attachments.length} anexo{attachments.length > 1 ? "s" : ""}
                        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </button>
                    {open && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {attachments.map((att) => <AttachmentChip key={att.id} att={att} />)}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function InvoiceRow({
    inv, attachments,
}: {
    inv: ReturnType<typeof useLoaderData<typeof loader>>["invoices"][number];
    attachments: Attachment[];
}) {
    const [open, setOpen] = useState(false);
    const isOverdue = inv.status === "pending" && inv.due_date && new Date(inv.due_date) < new Date();
    return (
        <>
            <tr className={`transition-colors ${
                isOverdue ? "bg-red-50/50 dark:bg-red-950/10" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
            }`}>
                <td className="px-6 py-4 text-gray-400 font-mono">#{inv.id}</td>
                <td className="px-6 py-4 font-medium">{inv.description}</td>
                <td className="px-6 py-4 text-gray-500">{inv.site_name}</td>
                <td className="px-6 py-4 font-semibold">{inv.amount.toFixed(2)} €</td>
                <td className="px-6 py-4"><StatusBadge status={inv.status} /></td>
                <td className="px-6 py-4 text-gray-400 text-xs">
                    {inv.due_date ? new Date(inv.due_date).toLocaleDateString("pt-PT") : "—"}
                </td>
                <td className="px-6 py-4 text-right">
                    {attachments.length > 0 && (
                        <button type="button" onClick={() => setOpen((v) => !v)}
                            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors">
                            <Paperclip size={13} />{attachments.length}
                            {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                    )}
                </td>
            </tr>
            {open && attachments.length > 0 && (
                <tr className="bg-gray-50/80 dark:bg-gray-800/40">
                    <td colSpan={7} className="px-6 py-3">
                        <div className="flex flex-wrap gap-2">
                            {attachments.map((att) => <AttachmentChip key={att.id} att={att} />)}
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}

export default function PortalInvoices() {
    const { invoices, attachmentsByInvoice, total, pending } = useLoaderData<typeof loader>();
    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">As minhas Faturas</h1>
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                    <p className="text-xs text-gray-400 mb-1">Total pago</p>
                    <p className="text-2xl font-bold text-green-500">{(total - pending).toFixed(2)} €</p>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                    <p className="text-xs text-gray-400 mb-1">Em aberto</p>
                    <p className={`text-2xl font-bold ${pending > 0 ? "text-orange-500" : "text-green-500"}`}>{pending.toFixed(2)} €</p>
                </div>
            </div>
            {invoices.length === 0 ? (
                <p className="text-center text-gray-400 py-12">Ainda não tens faturas.</p>
            ) : (
                <>
                    {/* Mobile: cards */}
                    <div className="md:hidden space-y-3">
                        {invoices.map((inv) => (
                            <InvoiceMobileCard key={inv.id} inv={inv} attachments={attachmentsByInvoice[inv.id] ?? []} />
                        ))}
                    </div>
                    {/* Desktop: tabela */}
                    <div className="hidden md:block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="text-left px-6 py-3 font-medium text-gray-500">#</th>
                                <th className="text-left px-6 py-3 font-medium text-gray-500">Descrição</th>
                                <th className="text-left px-6 py-3 font-medium text-gray-500">Site</th>
                                <th className="text-left px-6 py-3 font-medium text-gray-500">Valor</th>
                                <th className="text-left px-6 py-3 font-medium text-gray-500">Estado</th>
                                <th className="text-left px-6 py-3 font-medium text-gray-500">Vencimento</th>
                                <th className="px-6 py-3" />
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {invoices.map((inv) => (
                                <InvoiceRow key={inv.id} inv={inv} attachments={attachmentsByInvoice[inv.id] ?? []} />
                            ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
