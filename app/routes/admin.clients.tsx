import { data, redirect, useLoaderData, useActionData, Form } from "react-router";
import type { Route } from "./+types/admin.clients";
import { getSites, createSite, deleteSite } from "~/lib/db";

export async function loader({ context }: Route.LoaderArgs) {
    const db = context.cloudflare.env.DB;
    const sites = await getSites(db);
    return { sites };
}

export async function action({ request, context }: Route.ActionArgs) {
    const db = context.cloudflare.env.DB;
    const form = await request.formData();
    const intent = String(form.get("intent"));

    if (intent === "create") {
        const name   = String(form.get("name")   || "").trim();
        const domain = String(form.get("domain") || "").trim();
        if (!name || !domain) return data({ error: "Nome e domínio são obrigatórios." }, { status: 400 });
        await createSite(db, { name, domain, ownerId: null });
        return redirect("/admin/clients");
    }

    if (intent === "delete") {
        const id = Number(form.get("id"));
        await deleteSite(db, id);
        return redirect("/admin/clients");
    }

    return null;
}

export default function AdminClients() {
    const { sites } = useLoaderData<typeof loader>();
    const result    = useActionData<typeof action>();

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold">Clientes & Sites</h1>
            </div>

            {/* Formulário novo site */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 mb-8">
                <h2 className="font-semibold mb-4">Adicionar novo site</h2>
                <Form method="post" className="flex flex-wrap gap-3 items-end">
                    <input type="hidden" name="intent" value="create" />
                    {result?.error && (
                        <p className="w-full text-sm text-red-600">{result.error}</p>
                    )}
                    <div className="flex-1 min-w-48">
                        <label className="block text-xs font-medium mb-1 text-gray-500">Nome do site</label>
                        <input name="name" placeholder="Barbearia Brooklyn" required
                               className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="flex-1 min-w-48">
                        <label className="block text-xs font-medium mb-1 text-gray-500">Domínio</label>
                        <input name="domain" placeholder="barbearia-brooklyn.pt" required
                               className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <button type="submit"
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                        Criar Site
                    </button>
                </Form>
            </div>

            {/* Lista de sites */}
            {sites.length === 0 ? (
                <p className="text-center text-gray-400 py-12">Ainda não tens sites registados.</p>
            ) : (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="text-left px-6 py-3 font-medium text-gray-500">Site</th>
                            <th className="text-left px-6 py-3 font-medium text-gray-500">Domínio</th>
                            <th className="text-left px-6 py-3 font-medium text-gray-500">Token do Widget</th>
                            <th className="text-left px-6 py-3 font-medium text-gray-500">Criado em</th>
                            <th className="px-6 py-3" />
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {sites.map((site) => (
                            <tr key={site.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <td className="px-6 py-4 font-medium">{site.name}</td>
                                <td className="px-6 py-4 text-gray-500">{site.domain}</td>
                                <td className="px-6 py-4">
                                    <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">
                                        {site.token}
                                    </code>
                                </td>
                                <td className="px-6 py-4 text-gray-500">
                                    {new Date(site.created_at).toLocaleDateString("pt-PT")}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <Form method="post" onSubmit={(e) => !confirm("Tens a certeza?") && e.preventDefault()}>
                                        <input type="hidden" name="intent" value="delete" />
                                        <input type="hidden" name="id" value={site.id} />
                                        <button type="submit" className="text-xs text-red-500 hover:text-red-700 hover:underline">
                                            Remover
                                        </button>
                                    </Form>
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
