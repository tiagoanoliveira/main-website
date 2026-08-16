// app/routes/home.tsx
import { type MetaFunction, useLoaderData } from "react-router";
import { Link } from "react-router";
import type { Route } from "./+types/home";
import { getPublishedProjects } from "~/lib/projects.server";
import { getSessionUser } from "~/lib/auth.server";
import ScrollProgressBar from "~/components/ui/ScrollProgressBar";
import AnimatedSection from "~/components/ui/AnimatedSection";
import CounterStat from "~/components/ui/CounterStat";
import { HomeScene } from "~/components/ui/HomeScene";
import { Menu, X, User } from "lucide-react";
import { useState } from "react";

export const meta: MetaFunction = () => [
  { title: "Tiago Oliveira" },
  {
    name: "description",
    content:
      "Desenvolvimento de websites, softwares, manutenção de sistemas e suporte técnico para empresas e particulares.",
  },
  { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
];

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB;
  const [projects, user] = await Promise.all([
    getPublishedProjects(db, { sortBy: "order_index", sortDir: "asc", limit: 2 }),
    getSessionUser(db, request),
  ]);

  return { projects, isLoggedIn: !!user };
}

const stats = [
  { value: "2+", label: "Anos de experiência" },
  { value: "10+", label: "Projetos concluídos" },
];

export default function Home() {
  const { projects, isLoggedIn } = useLoaderData<typeof loader>();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="overflow-x-hidden w-full bg-slate-950 text-slate-50">
      <ScrollProgressBar />

      {/* NAVBAR */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/85 backdrop-blur border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="font-semibold tracking-tight text-slate-50">Tiago Oliveira</span>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link
              to="/cv"
              className="text-slate-400 hover:text-slate-50 transition-colors"
            >
              CV
            </Link>
            <a href="#portfolio" className="text-slate-400 hover:text-slate-50 transition-colors">
              Portófolio
            </a>
            <a href="#contacto" className="text-slate-400 hover:text-slate-50 transition-colors">
              Contacto
            </a>
            <Link
              to="/portal"
              className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition-colors"
            >
              <User size={14} />
              {isLoggedIn ? "Minha Conta" : "Login"}
            </Link>
          </nav>
          <div className="flex items-center gap-2 md:hidden">
            <Link
              to="/portal"
              className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition-colors"
            >
              <User size={13} />
              {isLoggedIn ? "Conta" : "Login"}
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="p-2 rounded-lg text-slate-300 hover:bg-slate-900 transition-colors"
              aria-label="Menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* HERO + JANELA NARRATIVA */}
      <main className="pt-20">
        <section className="min-h-[75vh] flex items-center justify-center px-4">
          <div className="max-w-6xl mx-auto grid md:grid-cols-[1.1fr,0.9fr] gap-10 items-center">
            <div className="space-y-6">
              <p className="text-xs font-semibold tracking-[0.35em] uppercase text-slate-400">
                Eng. Informática · Porto
              </p>
              <h1 className="text-3xl md:text-4xl font-semibold text-slate-50">
                Websites, sistemas de reservas e domótica —
                <span className="block text-slate-400 text-lg mt-2">
                  desenvolvidos e mantidos por uma só pessoa.
                </span>
              </h1>
              <p className="text-sm md:text-base text-slate-400 max-w-md">
                Trabalho diretamente com pequenas e médias empresas para criar soluções técnicas que realmente
                acompanham o dia a dia: desde sites públicos a dashboards, integrações e suporte contínuo.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/projects"
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-slate-50 text-slate-900 text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  Ver projetos
                </Link>
                <a
                  href="#contacto"
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-slate-700 text-sm text-slate-300 hover:border-slate-500 hover:text-slate-50 transition-colors"
                >
                  Falar sobre um sistema
                </a>
              </div>
              <div className="flex gap-4 pt-2">
                {stats.map((stat) => (
                  <CounterStat key={stat.label} value={stat.value} label={stat.label} />
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-950/70">
              <HomeScene />
            </div>
          </div>
        </section>

        {/* PORTFOLIO */}
        <section id="portfolio" className="py-10 px-4 bg-slate-900/50">
          <div className="max-w-6xl mx-auto">
            <AnimatedSection>
              <div className="flex items-end justify-between mb-8">
                <div>
                  <p className="text-xs font-semibold text-emerald-400 uppercase tracking-[0.25em] mb-2">
                    Portófolio
                  </p>
                  <h2 className="text-2xl md:text-3xl font-semibold text-slate-50">Projetos recentes</h2>
                </div>
                <Link
                  to="/projects"
                  className="hidden md:inline-flex items-center gap-2 text-xs font-medium text-emerald-400 hover:text-emerald-300"
                >
                  Ver todos →
                </Link>
              </div>
            </AnimatedSection>

            <div className="grid md:grid-cols-2 gap-6">
              {projects.map((project, i) => (
                <AnimatedSection key={project.slug} delay={i * 0.1}>
                  <Link to={`/projects/${project.slug}`}>
                    <div className="group block p-5 bg-slate-950/80 border border-slate-800 rounded-2xl cursor-pointer hover:border-emerald-500/60 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        {project.logo_r2_key ? (
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-900 border border-slate-700 p-1.5">
                            <img
                              src={`/uploads/${project.logo_r2_key}`}
                              alt={`${project.title} logo`}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-slate-950 font-bold text-lg">
                            {project.title[0]}
                          </div>
                        )}
                        <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded-full">
                          {project.category}
                        </span>
                      </div>
                      <h3 className="font-medium text-sm md:text-base mb-1.5 group-hover:text-emerald-300 transition-colors">
                        {project.title}
                      </h3>
                      <p className="text-xs md:text-sm text-slate-400">{project.summary}</p>
                    </div>
                  </Link>
                </AnimatedSection>
              ))}
            </div>

            <div className="mt-6 text-center md:hidden">
              <Link to="/projects" className="text-xs font-medium text-emerald-400 hover:text-emerald-300">
                Ver todos os projetos →
              </Link>
            </div>
          </div>
        </section>

        {/* CONTACTO */}
        <section id="contacto" className="py-12 px-4">
          <div className="max-w-xl mx-auto">
            <AnimatedSection className="relative rounded-2xl overflow-hidden p-6 text-center bg-gradient-to-br from-emerald-500 to-sky-600 shadow-2xl">
              <div className="relative z-10">
                <h2 className="text-xl md:text-2xl font-semibold text-slate-950 mb-2">Vamos trabalhar juntos?</h2>
                <p className="text-slate-900/90 mb-4 text-sm md:text-base">
                  Tens um website, sistema de reservas ou plataforma de domótica em mente? Envia-me um email.
                </p>
                <a
                  href="mailto:geral@tiagoanoliveira.pt"
                  className="inline-block px-5 py-2 bg-slate-950 text-emerald-400 font-semibold rounded-xl text-sm md:text-base hover:bg-slate-900 transition-colors break-all"
                >
                  geral@tiagoanoliveira.pt
                </a>
              </div>
            </AnimatedSection>
          </div>
        </section>
      </main>
    </div>
  );
}
