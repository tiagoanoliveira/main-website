// app/routes/projects._index.tsx
import { useLoaderData, useSearchParams, Link, Form } from "react-router";
import type { Route } from "./+types/projects._index";
import { getPublishedProjects, getDistinctCategories, getAllTags } from "~/lib/projects.server";
import type { SortField, SortDir } from "~/lib/projects.server";
import { motion } from "motion/react";
import { Search, X } from "lucide-react";

export async function loader({ request, context }: Route.LoaderArgs) {
    const db  = context.cloudflare.env.DB;
    const url = new URL(request.url);

    const search   = url.searchParams.get("q")        ?? undefined;
    const category = url.searchParams.get("category") ?? undefined;
    const tag      = url.searchParams.get("tag")      ?? undefined;
    const sortBy   = (url.searchParams.get("sort") ?? "order_index") as SortField;
    const sortDir  = (url.searchParams.get("dir")  ?? "asc")         as SortDir;

    const [projects, categories, tags] = await Promise.all([
        getPublishedProjects(db, { search, category, tag, sortBy, sortDir }),
        getDistinctCategories(db),
        getAllTags(db),
    ]);

    return { projects, categories, tags, search, category, tag, sortBy, sortDir };
}

export default function ProjectsIndex() {
    const { projects, categories, tags, search, category, tag, sortBy, sortDir } =
        useLoaderData<typeof loader>();
    const [, setSearchParams] = useSearchParams();

    function buildParams(overrides: Record<string, string | undefined>) {
        const p    = new URLSearchParams();
        const base = { q: search, category, tag, sort: sortBy, dir: sortDir };
        Object.entries({ ...base, ...overrides }).forEach(([k, v]) => {
            if (v) p.set(k, v);
        });
        return p.toString();
    }

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 pt-8 px-4 pb-20">
            <div className="max-w-6xl mx-auto">

                {/* ── Header ── */}
                <div className="mb-10">
                    <Link to="/" className="text-sm text-gray-400 hover:text-blue-600 transition-colors">
                        ← Voltar
                    </Link>
                    <h1 className="text-4xl font-bold mt-4 mb-2">Projetos</h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        {projects.length} projeto{projects.length !== 1 && "s"} encontrado{projects.length !== 1 && "s"}
                    </p>
                </div>

                {/* ── Pesquisa ── */}
                <Form method="get" className="relative mb-6">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                        name="q"
                        defaultValue={search}
                        placeholder="Pesquisar projetos..."
                        className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearchParams(buildParams({ q: undefined }))}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X size={16} />
                        </button>
                    )}
                </Form>

                {/* ── Filtro por categoria ── */}
                {categories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        <button
                            onClick={() => setSearchParams(buildParams({ category: undefined }))}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                !category
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                            }`}
                        >
                            Todas
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() =>
                                    setSearchParams(buildParams({ category: cat === category ? undefined : cat }))
                                }
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                    category === cat
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                )}

                {/* ── Filtro por tag ── */}
                {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                        {tags.map((t) => (
                            <button
                                key={t}
                                onClick={() =>
                                    setSearchParams(buildParams({ tag: t === tag ? undefined : t }))
                                }
                                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
                                    tag === t
                                        ? "bg-purple-600 text-white"
                                        : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                                }`}
                            >
                                #{t}
                            </button>
                        ))}
                    </div>
                )}

                {/* ── Ordenação ── */}
                <div className="flex flex-wrap items-center gap-2 mb-8 text-sm">
                    <span className="text-gray-400 text-xs">Ordenar por:</span>
                    {(
                        [
                            { val: "order_index",  label: "Mais relevante" },
                            { val: "completed_at", label: "Data de conclusão" },
                            { val: "complexity",   label: "Complexidade" },
                        ] as const
                    ).map(({ val, label }) => (
                        <button
                            key={val}
                            onClick={() => {
                                const newDir = sortBy === val && sortDir === "asc" ? "desc" : "asc";
                                setSearchParams(buildParams({ sort: val, dir: newDir }));
                            }}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                                sortBy === val
                                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                            }`}
                        >
                            {label}
                            {sortBy === val && (
                                <span className="opacity-70">{sortDir === "asc" ? "↑" : "↓"}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Grid de projetos ── */}
                {projects.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <p className="text-lg mb-2">Nenhum projeto encontrado.</p>
                        {(search || category || tag) && (
                            <button
                                onClick={() => setSearchParams("")}
                                className="text-sm text-blue-600 hover:underline"
                            >
                                Limpar filtros
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project, i) => (
                            <motion.div
                                key={project.slug}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                            >
                                <Link to={`/projects/${project.slug}`} className="group block h-full">
                                    <div className="h-full p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl hover:border-blue-300 dark:hover:border-blue-700 transition-all hover:shadow-lg">

                                        {/* Topo: logo/ícone + categoria + ano */}
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                {/* Logo ou fallback */}
                                                {project.logo_r2_key ? (
                                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-1.5 shadow-sm flex-shrink-0">
                                                        <img
                                                            src={`/uploads/${project.logo_r2_key}`}
                                                            alt={`${project.title} logo`}
                                                            className="w-full h-full object-contain"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-md shadow-blue-500/20 flex-shrink-0">
                                                        {project.title[0]}
                                                    </div>
                                                )}
                                                <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2.5 py-1 rounded-full">
                          {project.category}
                        </span>
                                            </div>
                                            {project.completed_at && (
                                                <span className="text-xs text-gray-400 flex-shrink-0">
                          {new Date(project.completed_at).getFullYear()}
                        </span>
                                            )}
                                        </div>

                                        {/* Título e resumo */}
                                        <h2 className="font-semibold text-lg mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                                            {project.title}
                                        </h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">
                                            {project.summary}
                                        </p>

                                        {/* Tags */}
                                        {(JSON.parse(project.tags) as string[]).length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mb-4">
                                                {(JSON.parse(project.tags) as string[]).slice(0, 4).map((t) => (
                                                    <span key={t} className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                            #{t}
                          </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Complexidade */}
                                        <div className="flex gap-1 mt-auto pt-1">
                                            {Array.from({ length: 5 }).map((_, j) => (
                                                <div
                                                    key={j}
                                                    className={`h-1.5 w-5 rounded-full transition-colors ${
                                                        j < project.complexity
                                                            ? "bg-blue-500"
                                                            : "bg-gray-200 dark:bg-gray-700"
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
