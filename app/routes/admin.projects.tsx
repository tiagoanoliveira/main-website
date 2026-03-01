// app/routes/admin.projects.tsx
import { redirect, useLoaderData, useActionData, Form } from "react-router";
import type { Route } from "./+types/admin.projects";
import { getSessionUser } from "~/lib/auth.server";
import {
    getAllProjectsForAdmin, getProjectById,
    createProject, updateProject, deleteProjectById,
} from "~/lib/projects.server";
import type { Project } from "~/lib/projects.server";
import { uploadFile, deleteFile } from "~/lib/storage";
import { useState } from "react";
import {
    Plus, Pencil, Trash2, Eye, EyeOff, ExternalLink,
    ChevronUp, ChevronDown, X,
} from "lucide-react";

// ── Loader ──────────────────────────────────────────────────────
export async function loader({ request, context }: Route.LoaderArgs) {
    const db = context.cloudflare.env.DB;
    const user = await getSessionUser(db, request);
    if (!user || user.role !== "admin") throw redirect("/admin");
    const projects = await getAllProjectsForAdmin(db);
    return { projects };
}

// ── Action ──────────────────────────────────────────────────────
export async function action({ request, context }: Route.ActionArgs) {
    const db     = context.cloudflare.env.DB;
    const bucket = context.cloudflare.env.UPLOADS;
    const user   = await getSessionUser(db, request);
    if (!user || user.role !== "admin") throw redirect("/admin");

    const formData = await request.formData();
    const intent   = String(formData.get("intent") ?? "");

    // ── Toggle publicado ──────────────────────────────────────────
    if (intent === "toggle") {
        const id      = Number(formData.get("id"));
        const current = await getProjectById(db, id);
        if (current) await updateProject(db, id, { is_published: current.is_published ? 0 : 1 });
        return redirect("/admin/projects");
    }

    // ── Eliminar ──────────────────────────────────────────────────
    if (intent === "delete") {
        const id      = Number(formData.get("id"));
        const project = await deleteProjectById(db, id);
        if (project) {
            const keys = [project.cover_image_key, project.image_1_key, project.image_2_key, project.image_3_key];
            await Promise.all(keys.filter(Boolean).map((k) => deleteFile(bucket, k!)));
        }
        return redirect("/admin/projects");
    }

    // ── Criar / Editar ────────────────────────────────────────────
    const id = formData.get("id") ? Number(formData.get("id")) : null;

    const title       = String(formData.get("title")        ?? "").trim();
    const slug        = String(formData.get("slug")         ?? "").trim();
    const category    = String(formData.get("category")     ?? "").trim();
    const order_index = Number(formData.get("order_index")  ?? 0);
    const summary     = String(formData.get("summary")      ?? "").trim();
    const description = String(formData.get("description")  ?? "").trim();
    const link        = String(formData.get("link")         ?? "").trim() || null;
    const tagsRaw     = String(formData.get("tags")         ?? "").trim();
    const tags        = JSON.stringify(tagsRaw.split(",").map((t) => t.trim()).filter(Boolean));
    const completed_at = String(formData.get("completed_at") ?? "").trim() || null;
    const complexity  = Math.min(5, Math.max(1, Number(formData.get("complexity") ?? 1)));
    const is_published = formData.get("is_published") === "1" ? 1 : 0;

    if (!title || !slug || !category || !summary) {
        return { error: "Preenche os campos obrigatórios: título, slug, categoria e resumo." };
    }

    // ── Tratamento de imagens ─────────────────────────────────────
    const imageFields = ["cover_image", "image_1", "image_2", "image_3"] as const;
    const dbFields    = ["cover_image_key", "image_1_key", "image_2_key", "image_3_key"] as const;

    let existingProject: Project | null = null;
    if (id) existingProject = await getProjectById(db, id);

    const imageKeys: Record<string, string | null | undefined> = {};

    for (let i = 0; i < imageFields.length; i++) {
        const field   = imageFields[i];
        const dbField = dbFields[i];
        const file    = formData.get(field) as File | null;
        const remove  = formData.get(`remove_${field}`) === "1";

        if (remove) {
            const oldKey = existingProject?.[dbField] ?? null;
            if (oldKey) await deleteFile(bucket, oldKey);
            imageKeys[dbField] = null;
        } else if (file && file.size > 0) {
            const oldKey = existingProject?.[dbField] ?? null;
            if (oldKey) await deleteFile(bucket, oldKey);
            const ext = file.name.split(".").pop() ?? "jpg";
            const key = `projects/${slug}/${field}_${crypto.randomUUID().replace(/-/g, "")}.${ext}`;
            await uploadFile(bucket, key, file);
            imageKeys[dbField] = key;
        }
        // undefined = sem alteração (só relevante no update)
    }

    if (id) {
        await updateProject(db, id, {
            title, slug, category, order_index, summary, description, link,
            tags, completed_at, complexity, is_published, ...imageKeys,
        });
    } else {
        await createProject(db, {
            title, slug, category, order_index, summary, description, link,
            cover_image_key: imageKeys["cover_image_key"] ?? null,
            image_1_key:     imageKeys["image_1_key"]     ?? null,
            image_2_key:     imageKeys["image_2_key"]     ?? null,
            image_3_key:     imageKeys["image_3_key"]     ?? null,
            tags, completed_at, complexity, is_published,
        });
    }

    return redirect("/admin/projects");
}

// ── Helpers ─────────────────────────────────────────────────────
function slugify(str: string) {
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const COMPLEXITY_LABELS = ["", "Muito baixa", "Baixa", "Média", "Alta", "Muito alta"];

// ── Componente ──────────────────────────────────────────────────
export default function AdminProjects() {
    const { projects }  = useLoaderData<typeof loader>();
    const actionData    = useActionData<typeof action>();

    const [formOpen, setFormOpen]             = useState(false);
    const [selected, setSelected]             = useState<Project | null>(null);
    const [deleteConfirm, setDeleteConfirm]   = useState<number | null>(null);
    const [complexity, setComplexity]         = useState(1);
    const [slugValue, setSlugValue]           = useState("");

    function openCreate() {
        setSelected(null);
        setComplexity(1);
        setSlugValue("");
        setFormOpen(true);
    }

    function openEdit(p: Project) {
        setSelected(p);
        setComplexity(p.complexity);
        setSlugValue(p.slug);
        setFormOpen(true);
    }

    function closeForm() { setFormOpen(false); setSelected(null); }

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projetos</h1>
                    <p className="text-sm text-gray-500 mt-1">{projects.length} projeto{projects.length !== 1 && "s"}</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    <Plus size={16} /> Novo Projeto
                </button>
            </div>

            {/* Tabela */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                {projects.length === 0 ? (
                    <div className="py-16 text-center text-gray-400">Ainda não há projetos.</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                            <th className="px-4 py-3 text-left font-medium text-gray-500 w-12">#</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Título</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">Categoria</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden lg:table-cell">Complexidade</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden lg:table-cell">Conclusão</th>
                            <th className="px-4 py-3 text-center font-medium text-gray-500">Pub.</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-500">Ações</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {projects.map((p) => (
                            <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                <td className="px-4 py-3 text-gray-400 font-mono">{p.order_index}</td>
                                <td className="px-4 py-3">
                                    <div className="font-medium text-gray-900 dark:text-white">{p.title}</div>
                                    <div className="text-xs text-gray-400 font-mono">{p.slug}</div>
                                </td>
                                <td className="px-4 py-3 hidden md:table-cell">
                    <span className="px-2 py-1 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-full text-xs">
                      {p.category}
                    </span>
                                </td>
                                <td className="px-4 py-3 hidden lg:table-cell">
                                    <div className="flex gap-0.5">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <div key={i} className={`h-1.5 w-4 rounded-full ${i < p.complexity ? "bg-blue-500" : "bg-gray-200 dark:bg-gray-700"}`} />
                                        ))}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                                    {p.completed_at ? new Date(p.completed_at).toLocaleDateString("pt-PT") : "—"}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <Form method="post">
                                        <input type="hidden" name="intent" value="toggle" />
                                        <input type="hidden" name="id"     value={p.id} />
                                        <button type="submit" className={`p-1.5 rounded-lg transition-colors ${p.is_published ? "text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30" : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}>
                                            {p.is_published ? <Eye size={15} /> : <EyeOff size={15} />}
                                        </button>
                                    </Form>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-end gap-1">
                                        {p.link && (
                                            <a href={p.link} target="_blank" rel="noopener noreferrer"
                                               className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors">
                                                <ExternalLink size={15} />
                                            </a>
                                        )}
                                        <button onClick={() => openEdit(p)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors">
                                            <Pencil size={15} />
                                        </button>
                                        {deleteConfirm === p.id ? (
                                            <span className="flex items-center gap-1">
                          <Form method="post">
                            <input type="hidden" name="intent" value="delete" />
                            <input type="hidden" name="id"     value={p.id} />
                            <button type="submit" className="px-2 py-1 bg-red-600 text-white rounded text-xs font-medium">
                              Confirmar
                            </button>
                          </Form>
                          <button onClick={() => setDeleteConfirm(null)} className="p-1 text-gray-400 hover:text-gray-600">
                            <X size={13} />
                          </button>
                        </span>
                                        ) : (
                                            <button onClick={() => setDeleteConfirm(p.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors">
                                                <Trash2 size={15} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Drawer lateral — criar / editar */}
            {formOpen && (
                <>
                    <div className="fixed inset-0 z-30 bg-black/40" onClick={closeForm} />
                    <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-xl bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col shadow-2xl">
                        {/* Header drawer */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                            <h2 className="font-semibold text-lg">
                                {selected ? "Editar Projeto" : "Novo Projeto"}
                            </h2>
                            <button onClick={closeForm} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Form */}
                        <div className="flex-1 overflow-y-auto">
                            <Form
                                key={selected?.id ?? "new"}
                                method="post"
                                encType="multipart/form-data"
                                className="p-6 space-y-5"
                            >
                                <input type="hidden" name="intent" value={selected ? "update" : "create"} />
                                {selected && <input type="hidden" name="id" value={selected.id} />}

                                {actionData?.error && (
                                    <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
                                        {actionData.error}
                                    </div>
                                )}

                                {/* Título + Slug */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Título *</label>
                                        <input
                                            name="title"
                                            defaultValue={selected?.title ?? ""}
                                            onChange={(e) => !selected && setSlugValue(slugify(e.target.value))}
                                            required
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Slug (URL) *</label>
                                        <input
                                            name="slug"
                                            value={slugValue}
                                            onChange={(e) => setSlugValue(e.target.value)}
                                            required
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                                        />
                                    </div>
                                </div>

                                {/* Categoria + Ordem */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Categoria *</label>
                                        <input
                                            name="category"
                                            defaultValue={selected?.category ?? ""}
                                            required
                                            placeholder="ex: Web, Mobile, Sistema"
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Índice de ordem</label>
                                        <input
                                            type="number"
                                            name="order_index"
                                            defaultValue={selected?.order_index ?? 0}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Resumo */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Resumo * <span className="font-normal text-gray-400">(aparece nos cards)</span></label>
                                    <textarea
                                        name="summary"
                                        defaultValue={selected?.summary ?? ""}
                                        rows={2}
                                        required
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                                    />
                                </div>

                                {/* Descrição */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">
                                        Descrição completa <span className="font-normal text-gray-400">(suporta Markdown)</span>
                                    </label>
                                    <textarea
                                        name="description"
                                        defaultValue={selected?.description ?? ""}
                                        rows={8}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono resize-y"
                                    />
                                </div>

                                {/* Link */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Link externo</label>
                                    <input
                                        name="link"
                                        type="url"
                                        defaultValue={selected?.link ?? ""}
                                        placeholder="https://..."
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                </div>

                                {/* Imagens */}
                                {(["cover_image", "image_1", "image_2", "image_3"] as const).map((field, i) => {
                                    const dbField = (["cover_image_key", "image_1_key", "image_2_key", "image_3_key"] as const)[i];
                                    const existingKey = selected?.[dbField] ?? null;
                                    const labels = ["Imagem de capa", "Imagem extra 1", "Imagem extra 2", "Imagem extra 3"];
                                    return (
                                        <div key={field}>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">{labels[i]}</label>
                                            {existingKey && (
                                                <div className="flex items-center gap-3 mb-2">
                                                    <img
                                                        src={`/uploads/${existingKey}`}
                                                        alt=""
                                                        className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                                                    />
                                                    <label className="flex items-center gap-1.5 text-xs text-red-500 cursor-pointer">
                                                        <input type="checkbox" name={`remove_${field}`} value="1" />
                                                        Remover imagem atual
                                                    </label>
                                                </div>
                                            )}
                                            <input
                                                type="file"
                                                name={field}
                                                accept="image/jpeg,image/png,image/webp"
                                                className="text-sm text-gray-500 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-600 file:text-xs file:font-medium hover:file:bg-blue-100 cursor-pointer"
                                            />
                                        </div>
                                    );
                                })}

                                {/* Tags */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">
                                        Tags <span className="font-normal text-gray-400">(separadas por vírgula)</span>
                                    </label>
                                    <input
                                        name="tags"
                                        defaultValue={(JSON.parse(selected?.tags ?? "[]") as string[]).join(", ")}
                                        placeholder="React, Tailwind, D1"
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                </div>

                                {/* Conclusão + Complexidade */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Data de conclusão</label>
                                        <input
                                            type="date"
                                            name="completed_at"
                                            defaultValue={selected?.completed_at ?? ""}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">
                                            Complexidade — <span className="text-blue-600">{COMPLEXITY_LABELS[complexity]}</span>
                                        </label>
                                        <input
                                            type="range"
                                            name="complexity"
                                            min={1} max={5} step={1}
                                            value={complexity}
                                            onChange={(e) => setComplexity(Number(e.target.value))}
                                            className="w-full accent-blue-600"
                                        />
                                        <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                                            <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Publicado */}
                                <div className="flex items-center gap-3 pt-1">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Publicado</label>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="is_published"
                                            value="1"
                                            defaultChecked={(selected?.is_published ?? 1) === 1}
                                            className="sr-only peer"
                                        />
                                        <div className="w-10 h-5 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                                    </label>
                                </div>

                                {/* Botões */}
                                <div className="flex gap-3 pt-2 pb-4">
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
                                    >
                                        {selected ? "Guardar alterações" : "Criar projeto"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={closeForm}
                                        className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </Form>
                        </div>
                    </aside>
                </>
            )}
        </div>
    );
}
