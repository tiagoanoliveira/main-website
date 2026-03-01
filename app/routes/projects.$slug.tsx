// app/routes/projects.$slug.tsx
import { useLoaderData, Link } from "react-router";
import type { Route } from "./+types/projects.$slug";
import { getProjectBySlug } from "~/lib/projects.server";
import { ExternalLink, Calendar, Zap } from "lucide-react";

export async function loader({ params, context }: Route.LoaderArgs) {
    const db = context.cloudflare.env.DB;
    const project = await getProjectBySlug(db, params.slug);
    if (!project) throw new Response("Not Found", { status: 404 });
    return { project };
}

export default function ProjectDetail() {
    const { project } = useLoaderData<typeof loader>();
    const tags: string[] = JSON.parse(project.tags ?? "[]");
    const extraImages = [project.image_1_key, project.image_2_key, project.image_3_key].filter(Boolean);

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 px-4 pb-20 pt-8">
            <div className="max-w-4xl mx-auto">
                {/* Navegação */}
                <Link to="/projects" className="text-sm text-gray-400 hover:text-blue-600 transition-colors">
                    ← Todos os projetos
                </Link>

                {/* Imagem de capa */}
                {project.cover_image_key && (
                    <div className="mt-6 rounded-2xl overflow-hidden aspect-video bg-gray-100 dark:bg-gray-800">
                        <img
                            src={`/uploads/${project.cover_image_key}`}
                            alt={project.title}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                {/* Header do projeto */}
                <div className="mt-8 mb-6">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-950 px-3 py-1 rounded-full">
              {project.category}
            </span>
                        {project.completed_at && (
                            <span className="flex items-center gap-1.5 text-xs text-gray-400">
                <Calendar size={12} />
                Concluído em {new Date(project.completed_at).toLocaleDateString("pt-PT", { month: "long", year: "numeric" })}
              </span>
                        )}
                        <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <Zap size={12} />
              Complexidade:
              <span className="flex gap-0.5 ml-1">
                {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} className={`h-2 w-4 rounded-full ${j < project.complexity ? "bg-blue-500" : "bg-gray-200 dark:bg-gray-700"}`} />
                ))}
              </span>
            </span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-3">{project.title}</h1>
                    <p className="text-lg text-gray-500 dark:text-gray-400">{project.summary}</p>
                </div>

                {/* Link externo */}
                {project.link && (
                    <a
                        href={project.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mb-8 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                    >
                        <ExternalLink size={15} />
                        Ver projeto online
                    </a>
                )}

                {/* Tags */}
                {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-8">
                        {tags.map((t) => (
                            <Link
                                key={t}
                                to={`/projects?tag=${encodeURIComponent(t)}`}
                                className="text-xs text-purple-600 dark:text-purple-400 font-mono bg-purple-50 dark:bg-purple-950/30 px-2.5 py-1 rounded-md hover:bg-purple-100 transition-colors"
                            >
                                #{t}
                            </Link>
                        ))}
                    </div>
                )}

                {/* Descrição completa */}
                <div className="prose dark:prose-invert max-w-none mb-10">
                    {/* Se usares HTML: */}
                    <div dangerouslySetInnerHTML={{ __html: project.description }} />
                    {/* Se usares texto simples, substitui por: <p>{project.description}</p> */}
                </div>

                {/* Galeria de imagens extra */}
                {extraImages.length > 0 && (
                    <div className="mt-10">
                        <h2 className="text-lg font-semibold mb-4">Galeria</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {extraImages.map((key, i) => (
                                <div key={i} className="aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                                    <img
                                        src={`/uploads/${key}`}
                                        alt={`${project.title} — imagem ${i + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
