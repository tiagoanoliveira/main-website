// app/routes/projects.$slug.tsx
import { useState } from "react";
import { useLoaderData, Link } from "react-router";
import type { Route } from "./+types/projects.$slug";
import { getProjectBySlug } from "~/lib/projects.server";
import { marked } from "marked";
import { ExternalLink, Calendar, Zap } from "lucide-react";
import Lightbox from "~/components/ui/Lightbox";
import ProjectStatusBadge from "~/components/ui/ProjectStatusBadge";
import type { ProjectStatus } from "~/components/ui/ProjectStatusBadge";

// ── Meta dinâmica ────────────────────────────────────────────────
export const meta = ({ data }: Route.MetaArgs) => {
    if (!data) return [{ title: "Projeto | Tiago Oliveira" }];
    const { project } = data;
    return [
        { title: `${project.title} | Tiago Oliveira` },
        { name: "description", content: project.summary },
        { property: "og:title", content: project.title },
        { property: "og:description", content: project.summary },
        { property: "og:type", content: "article" },
        ...(project.cover_image_key
            ? [{ property: "og:image", content: `/uploads/${project.cover_image_key}` }]
            : project.logo_r2_key
                ? [{ property: "og:image", content: `/uploads/${project.logo_r2_key}` }]
                : []),
        ...(project.completed_at
            ? [{ property: "article:published_time", content: project.completed_at }]
            : []),
    ];
};

// ── Loader ───────────────────────────────────────────────────────
export async function loader({ params, context }: Route.LoaderArgs) {
    const db      = context.cloudflare.env.DB;
    const project = await getProjectBySlug(db, params.slug);
    if (!project) throw new Response("Not Found", { status: 404 });

    marked.setOptions({ gfm: true, breaks: true });
    const descriptionHtml = project.description
        ? String(await marked.parse(project.description))
        : "";

    return { project, descriptionHtml };
}

// ── Componente ───────────────────────────────────────────────────
export default function ProjectDetail() {
    const { project, descriptionHtml } = useLoaderData<typeof loader>();
    const tags: string[] = JSON.parse(project.tags ?? "[]");
    const extraImages    = [project.image_1_key, project.image_2_key, project.image_3_key].filter(Boolean) as string[];

    // Todas as imagens para o lightbox (capa + galeria)
    const allImages = [
        project.cover_image_key,
        ...extraImages,
    ].filter(Boolean).map((k) => `/uploads/${k}`);

    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 px-4 pb-20 pt-8">
            <div className="max-w-4xl mx-auto">

                {/* ── Breadcrumb ── */}
                <Link
                    to="/projects"
                    className="text-sm text-gray-400 hover:text-blue-600 transition-colors"
                >
                    ← Todos os projetos
                </Link>

                {/* ── Logo ── */}
                {project.logo_r2_key && (
                    <div className="mt-8 flex items-center gap-3">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2.5 shadow-lg flex-shrink-0">
                            <img
                                src={`/uploads/${project.logo_r2_key}`}
                                alt={`${project.title} logo`}
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-3 py-1.5 rounded-full">
                            {project.category}
                        </span>
                        <ProjectStatusBadge status={(project.status ?? "completed") as ProjectStatus} />
                    </div>
                )}

                {/* ── Imagem de capa (clicável) ── */}
                {project.cover_image_key && (
                    <div
                        className={`rounded-2xl overflow-hidden aspect-video bg-gray-100 dark:bg-gray-800 cursor-zoom-in ${
                            project.logo_r2_key ? "mt-5" : "mt-8"
                        }`}
                        onClick={() => setLightboxIndex(0)}
                    >
                        <img
                            src={`/uploads/${project.cover_image_key}`}
                            alt={project.title}
                            className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-300"
                        />
                    </div>
                )}

                {/* ── Cabeçalho ── */}
                <div className="mt-8 mb-6">
                    {/* Categoria + estado (quando não há logo) */}
                    {!project.logo_r2_key && (
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-3 py-1 rounded-full">
                                {project.category}
                            </span>
                            <ProjectStatusBadge status={(project.status ?? "completed") as ProjectStatus} />
                        </div>
                    )}

                    {/* Meta: data + complexidade */}
                    <div className="flex flex-wrap items-center gap-4 mb-4">
                        {project.completed_at && (
                            <span className="flex items-center gap-1.5 text-xs text-gray-400">
                                <Calendar size={12} />
                                Concluído em{" "}
                                {new Date(project.completed_at).toLocaleDateString("pt-PT", {
                                    month: "long",
                                    year: "numeric",
                                })}
                            </span>
                        )}
                        <span className="flex items-center gap-1.5 text-xs text-gray-400">
                            <Zap size={12} />
                            Complexidade
                            <span className="flex gap-0.5 ml-1">
                                {Array.from({ length: 5 }).map((_, j) => (
                                    <div
                                        key={j}
                                        className={`h-2 w-4 rounded-full ${
                                            j < project.complexity
                                                ? "bg-blue-500"
                                                : "bg-gray-200 dark:bg-gray-700"
                                        }`}
                                    />
                                ))}
                            </span>
                        </span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-bold mb-3 leading-tight">
                        {project.title}
                    </h1>
                    <p className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed">
                        {project.summary}
                    </p>
                </div>

                {/* ── Link externo ── */}
                {project.link && (
                    <a
                        href={project.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mb-8 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors shadow-lg shadow-blue-500/25"
                    >
                        <ExternalLink size={15} />
                        Ver projeto online
                    </a>
                )}

                {/* ── Tags clicáveis ── */}
                {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-8">
                        {tags.map((t) => (
                            <Link
                                key={t}
                                to={`/projects?tag=${encodeURIComponent(t)}`}
                                className="text-xs text-purple-600 dark:text-purple-400 font-mono bg-purple-50 dark:bg-purple-950/30 px-2.5 py-1 rounded-md hover:bg-purple-100 dark:hover:bg-purple-950/60 transition-colors"
                            >
                                #{t}
                            </Link>
                        ))}
                    </div>
                )}

                {/* ── Divisor ── */}
                {descriptionHtml && (
                    <hr className="border-gray-100 dark:border-gray-800 mb-8" />
                )}

                {/* ── Descrição em Markdown ── */}
                {descriptionHtml && (
                    <div
                        className="prose prose-gray dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-gray-900 prose-pre:text-gray-100 dark:prose-pre:bg-gray-800"
                        dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                    />
                )}

                {/* ── Galeria de imagens (clicável) ── */}
                {extraImages.length > 0 && (
                    <div className="mt-12">
                        <h2 className="text-lg font-semibold mb-4">Galeria</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {extraImages.map((key, i) => (
                                <div
                                    key={i}
                                    className="aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-zoom-in"
                                    onClick={() => {
                                        // índice na allImages: capa é 0, galeria começa em 1
                                        const offset = project.cover_image_key ? 1 : 0;
                                        setLightboxIndex(offset + i);
                                    }}
                                >
                                    <img
                                        src={`/uploads/${key}`}
                                        alt={`${project.title} — imagem ${i + 1}`}
                                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>

            {/* ── Lightbox ── */}
            {lightboxIndex !== null && (
                <Lightbox
                    images={allImages}
                    index={lightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                    onPrev={() => setLightboxIndex((lightboxIndex - 1 + allImages.length) % allImages.length)}
                    onNext={() => setLightboxIndex((lightboxIndex + 1) % allImages.length)}
                />
            )}
        </div>
    );
}
