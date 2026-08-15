// app/routes/home.tsx
import { motion, AnimatePresence } from "motion/react";
import { type MetaFunction, useLoaderData } from "react-router";
import { Link } from "react-router";
import AnimatedSection from "~/components/ui/AnimatedSection";
import ScrollProgressBar from "~/components/ui/ScrollProgressBar";
import { useEffect, useState } from "react";
import { Menu, X, User, GraduationCap, Heart, Briefcase, ArrowRight } from "lucide-react";
import type { Route } from "./+types/home";
import { getPublishedProjects } from "~/lib/projects.server";
import { getSessionUser } from "~/lib/auth.server";

export const meta: MetaFunction = () => [
  { title: "Tiago Oliveira" },
  {
    name: "description",
    content:
      "Homepage como interface: uma consola para orquestrar websites, sistemas e suporte técnico, desenvolvida por Tiago Oliveira, Engenheiro Informático no Porto.",
  },
  { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
];

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB;
  const [projects, user] = await Promise.all([
    getPublishedProjects(db, { sortBy: "order_index", sortDir: "asc", limit: 3 }),
    getSessionUser(db, request),
  ]);
  return { projects, isLoggedIn: !!user };
}

const presets = [
  {
    id: "websites",
    label: "Websites & produtos",
    description:
      "Interfaces pensadas para negócios reais: reservas, vendas, gestão de espaços e presença digital consistente.",
    metrics: {
      uptime: "99.8%",
      latency: "40 ms",
      projects: "10+",
    },
  },
  {
    id: "systems",
    label: "Sistemas & automação",
    description:
      "Plataformas internas para organizar operações, automatizar tarefas repetitivas e dar visibilidade ao que importa.",
    metrics: {
      uptime: "99.5%",
      latency: "65 ms",
      projects: "6+",
    },
  },
  {
    id: "support",
    label: "Suporte & infraestrutura",
    description:
      "Acompanhamento técnico contínuo, monitorização, backups e resposta rápida quando algo deixa de funcionar.",
    metrics: {
      uptime: "99.9%",
      latency: "34 ms",
      projects: "20+",
    },
  },
];

export default function Home() {
  const { projects, isLoggedIn } = useLoaderData<typeof loader>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [compactHeader, setCompactHeader] = useState(false);
  const [activePresetId, setActivePresetId] = useState<(typeof presets)[number]["id"]>("websites");

  const activePreset = presets.find((p) => p.id === activePresetId) ?? presets[0];

  useEffect(() => {
    const onScroll = () => {
      setCompactHeader(window.scrollY > 40);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="overflow-x-hidden w-full bg-slate-950 text-slate-100">
      <ScrollProgressBar />

      {/* ───── NAVBAR ───── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b border-slate-800/70 transition-all duration-300 ${
          compactHeader ? "bg-slate-950/95 h-14" : "bg-slate-950/80 h-16"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
          {/* Logo minimalista */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center shadow-sm shadow-sky-500/40">
              <div className="w-3 h-3 rounded-sm bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500" />
            </div>
            <span className="font-medium tracking-tight text-slate-100">Tiago Oliveira</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <a
              href="/cv"
              className="text-sm font-medium text-slate-300 hover:text-sky-300 transition-colors"
            >
              CV
            </a>
            <a
              href="#portfolio"
              className="text-sm font-medium text-slate-300 hover:text-sky-300 transition-colors"
            >
              Portófolio
            </a>
            <a
              href="#contacto"
              className="text-sm font-medium text-slate-300 hover:text-sky-300 transition-colors"
            >
              Contacto
            </a>
            <Link
              to="/portal"
              className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors shadow-sm shadow-sky-500/40"
            >
              <User size={14} />
              {isLoggedIn ? "Minha Conta" : "Login"}
            </Link>
          </nav>

          {/* Mobile: conta + hamburguer */}
          <div className="flex items-center gap-2 md:hidden">
            <Link
              to="/portal"
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors"
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

        {/* Mobile dropdown */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden border-t border-slate-800 bg-slate-950"
            >
              <nav className="flex flex-col px-4 py-3 gap-1">
                {[
                  { href: "/cv", label: "CV" },
                  { href: "#portfolio", label: "Portófolio" },
                  { href: "#contacto", label: "Contacto" },
                ].map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className="text-sm font-medium text-slate-200 hover:text-sky-300 py-2.5 px-2 rounded-lg hover:bg-slate-900 transition-colors"
                  >
                    {l.label}
                  </a>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ───── HERO: PRODUTO COMO INTERFACE ───── */}
      <section className="relative min-h-[92vh] flex items-center justify-center px-4 pt-20">
        {/* Subtle background */}
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(#0f172a 1px, transparent 1px), linear-gradient(90deg, #0f172a 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />

        <div className="relative w-full max-w-6xl mx-auto grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-8 lg:gap-12 items-start">
          {/* Narrativa */}
          <div className="max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-sky-500/40 bg-sky-500/10 text-sky-200 text-xs font-medium mb-6"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400" />
              </span>
              Engenheiro Informático · Porto, Portugal
            </motion.div>

            <motion.h1
              className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-4 leading-tight tracking-tight text-slate-50"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Uma consola para orquestrar websites, sistemas e suporte técnico.
            </motion.h1>

            <motion.p
              className="text-sm sm:text-base text-slate-300 mb-6 max-w-md"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Em vez de apenas mostrar o meu trabalho, esta homepage comporta‑se como uma interface: escolhe um modo e vê como diferentes tipos de sistemas ganham vida.
            </motion.p>

            <motion.div
              className="flex flex-wrap gap-3"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <motion.a
                href="#interface"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl font-medium text-sm sm:text-base transition-colors shadow-lg shadow-sky-500/40 flex items-center gap-2"
              >
                Explorar consola
              </motion.a>
              <motion.a
                href="/cv"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="px-5 py-2.5 border border-slate-700 rounded-xl font-medium text-sm sm:text-base text-slate-200 hover:border-sky-400 hover:text-sky-200 transition-colors flex items-center gap-2"
              >
                <GraduationCap size={16} />
                Ver CV
              </motion.a>
            </motion.div>

            <motion.div
              className="mt-8 flex flex-wrap gap-4 text-xs text-slate-400"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="flex items-center gap-2">
                <span className="text-slate-200 font-semibold text-sm">2+</span>
                <span className="text-slate-400 text-xs">Anos de experiência</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-200 font-semibold text-sm">10+</span>
                <span className="text-slate-400 text-xs">Projetos concluídos</span>
              </div>
            </motion.div>
          </div>

          {/* Consola: produto como interface */}
          <AnimatedSection id="interface" direction="right" className="relative">
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 shadow-2xl shadow-slate-900/80"
            >
              {/* Cabeçalho */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[11px] font-medium text-slate-300">Consola de orquestração</span>
                </div>
                <span className="text-[11px] text-slate-500">{activePreset.label}</span>
              </div>

              {/* Seletor de modos */}
              <div className="flex gap-2 mb-4">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setActivePresetId(preset.id)}
                    className={`flex-1 rounded-xl border text-xs sm:text-sm font-medium px-3 py-2 flex items-center gap-2 transition-colors ${
                      activePresetId === preset.id
                        ? "border-sky-500 bg-sky-500/10 text-sky-200"
                        : "border-slate-800 bg-slate-900 text-slate-300 hover:border-sky-500/60 hover:text-sky-200"
                    }`}
                  >
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500" />
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Área central com sliders/indicadores */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 flex flex-col gap-2">
                  <span className="text-[11px] text-slate-400">Complexidade do sistema</span>
                  <div className="mt-1 flex gap-1 h-2">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div
                        key={index}
                        className="flex-1 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500"
                        style={{ opacity: 0.25 + index * 0.12 }}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">
                    Ajusto arquitetura e tecnologia à escala e ao contexto de cada projeto.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 flex flex-col gap-2">
                  <span className="text-[11px] text-slate-400">Visibilidade operacional</span>
                  <div className="mt-1 grid grid-cols-4 gap-1">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-6 rounded-md bg-slate-800 flex items-end overflow-hidden"
                      >
                        <div
                          className="w-full rounded-t-md bg-sky-500"
                          style={{ height: `${40 + index * 15}%` }}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">
                    Interfaces para acompanhar reservas, tickets, estados e indicadores em tempo real.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 flex flex-col gap-2">
                  <span className="text-[11px] text-slate-400">Suporte & manutenção</span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[11px] text-slate-300">Monitorização ativa</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">
                    Acompanhamento técnico contínuo, backups e resposta rápida quando algo falha.
                  </p>
                </div>
              </div>

              {/* Descrição do preset ativo + métricas */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
                <div className="flex-1">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={activePreset.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.25 }}
                      className="text-xs sm:text-sm text-slate-200 leading-relaxed"
                    >
                      {activePreset.description}
                    </motion.p>
                  </AnimatePresence>
                </div>
                <div className="flex gap-3 text-[11px] text-slate-300">
                  <div className="flex flex-col">
                    <span className="text-slate-500">Uptime</span>
                    <span className="font-semibold text-sky-300">{activePreset.metrics.uptime}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-500">Latência média</span>
                    <span className="font-semibold text-sky-300">{activePreset.metrics.latency}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-500">Casos reais</span>
                    <span className="font-semibold text-sky-300">{activePreset.metrics.projects}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatedSection>
        </div>

        {/* Indicador de scroll */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-6 h-10 rounded-full border border-slate-600 flex items-start justify-center pt-2">
            <div className="w-1 h-2 bg-slate-400 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* ───── PORTFOLIO COMO CONTEXTO ───── */}
      <section id="portfolio" className="py-14 px-4 bg-slate-950 border-t border-slate-900">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection>
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-xs font-semibold text-sky-400 uppercase tracking-[0.25em] mb-2">Portófolio</p>
                <h2 className="text-2xl sm:text-3xl font-semibold text-slate-50">Casos reais ligados à consola.</h2>
                <p className="text-sm text-slate-400 mt-2 max-w-xl">
                  Cada projeto representa um sistema diferente ligado a esta forma de trabalhar: reservas, gestão, operações internas e suporte técnico.
                </p>
              </div>
              <Link
                to="/projects"
                className="hidden sm:inline-flex items-center gap-2 text-xs font-medium text-sky-300 hover:text-sky-100 transition-colors"
              >
                Ver todos <span>→</span>
              </Link>
            </div>
          </AnimatedSection>

          <div className="grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-8">
            {/* Painel resumo projetos */}
            <AnimatedSection direction="left">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 shadow-xl shadow-slate-900/70">
                <p className="text-[11px] font-medium text-slate-300 mb-3">Mapa operacional</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 flex flex-col gap-2">
                    <span className="text-[11px] text-slate-400">Reservas & espaços</span>
                    <div className="mt-1 flex gap-1 h-1.5">
                      {Array.from({ length: 8 }).map((_, index) => (
                        <div
                          key={index}
                          className={`flex-1 rounded-full ${index < 6 ? "bg-emerald-400" : "bg-slate-700"}`}
                        />
                      ))}
                    </div>
                    <span className="mt-2 text-[10px] text-slate-500">Slots ocupados ao longo do dia.</span>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 flex flex-col gap-2">
                    <span className="text-[11px] text-slate-400">Tickets de suporte</span>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[11px] text-slate-300">Fila normalizada</span>
                    </div>
                    <span className="mt-2 text-[10px] text-slate-500">Estados claros e automações discretas.</span>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 flex flex-col gap-2">
                  <span className="text-[11px] text-slate-400">Telemetria de sistemas</span>
                  <div className="mt-1 flex gap-2 items-center">
                    <div className="flex-1 grid grid-cols-6 gap-1">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <div
                          key={index}
                          className="h-3 rounded-full bg-gradient-to-b from-sky-500 to-indigo-500"
                          style={{ opacity: 0.4 + index * 0.08 }}
                        />
                      ))}
                    </div>
                    <div className="w-24 h-16 rounded-lg border border-slate-800 bg-slate-950 flex items-center justify-center">
                      <span className="text-[10px] text-slate-400">
                        Latência média
                        <span className="block text-[11px] text-sky-300 font-semibold">34 ms</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedSection>

            {/* Lista de projetos */}
            <div className="space-y-6">
              {projects.map((project, index) => (
                <AnimatedSection key={project.slug} delay={index * 0.08}>
                  <Link to={`/projects/${project.slug}`}>
                    <motion.article
                      whileHover={{ y: -4 }}
                      className="group rounded-2xl border border-slate-800 bg-slate-950/80 p-4 sm:p-5 cursor-pointer transition-colors hover:border-sky-500/60"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-[11px] text-slate-500">0{index + 1}</span>
                        <span className="text-[11px] font-medium px-3 py-1 rounded-full bg-slate-900 text-slate-300 border border-slate-700">
                          {project.category}
                        </span>
                      </div>
                      <h3 className="font-semibold text-base sm:text-lg text-slate-50 mb-2 group-hover:text-sky-300 transition-colors">
                        {project.title}
                      </h3>
                      <p className="text-sm text-slate-300 mb-3">
                        {project.summary}
                      </p>
                      {project.complexity && (
                        <div className="mt-2 flex gap-1">
                          {Array.from({ length: 5 }).map((_, j) => (
                            <div
                              key={j}
                              className={`h-1.5 w-5 rounded-full ${j < project.complexity ? "bg-sky-500" : "bg-slate-700"}`}
                            />
                          ))}
                        </div>
                      )}
                    </motion.article>
                  </Link>
                </AnimatedSection>
              ))}
              <div className="mt-4 text-center sm:hidden">
                <Link to="/projects" className="text-xs font-medium text-sky-300 hover:text-sky-100 transition-colors">
                  Ver todos os projetos →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── CONTACTO ───── */}
      <section id="contacto" className="py-12 px-4 border-t border-slate-900 bg-slate-950">
        <div className="max-w-xl mx-auto">
          <AnimatedSection className="relative rounded-2xl overflow-hidden p-4 sm:p-6 text-center bg-gradient-to-br from-sky-500 via-indigo-600 to-purple-700 shadow-2xl shadow-sky-500/40">
            <div
              className="absolute inset-0 opacity-[0.12] pointer-events-none"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 0 0, #0f172a 0, transparent 40%), radial-gradient(circle at 100% 100%, #020617 0, transparent 45%)",
              }}
            />
            <div className="relative z-10">
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-50 mb-2">Tens um problema interessante para resolver?</h2>
              <p className="text-sky-100 mb-3 sm:mb-4 text-sm sm:text-base max-w-sm mx-auto">
                Seja um website, uma aplicação interna ou um sistema de suporte, posso ajudar a pôr a tecnologia a trabalhar a teu favor.
              </p>
              <motion.a
                href="mailto:geral@tiagoanoliveira.pt"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="inline-block px-3 sm:px-6 py-1.5 sm:py-3 bg-slate-950/90 text-sky-100 font-semibold rounded-xl hover:bg-slate-900 transition-colors text-sm sm:text-base shadow-xl break-all"
              >
                geral@tiagoanoliveira.pt
              </motion.a>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
