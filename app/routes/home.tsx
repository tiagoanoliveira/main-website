// app/routes/home.tsx
import { motion, AnimatePresence } from "motion/react";
import { type MetaFunction, useLoaderData } from "react-router";
import { Link } from "react-router";
import AnimatedSection from "~/components/ui/AnimatedSection";
import CounterStat from "~/components/ui/CounterStat";
import ScrollProgressBar from "~/components/ui/ScrollProgressBar";
import { useEffect, useState } from "react";
import {
  Menu,
  X,
  User,
  GraduationCap,
  Heart,
  Briefcase,
  ArrowRight,
  Cpu,
  Network,
  Server,
} from "lucide-react";
import type { Route } from "./+types/home";
import { getPublishedProjects } from "~/lib/projects.server";
import { getSessionUser } from "~/lib/auth.server";

export const meta: MetaFunction = () => [
  { title: "Tiago Oliveira" },
  {
    name: "description",
    content:
      "Engenheiro Informático no Porto. Desenvolvimento de websites, softwares, manutenção de sistemas e suporte técnico para empresas e particulares.",
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

const stats = [
  { value: "2+", label: "Anos de experiência" },
  { value: "10+", label: "Projetos concluídos" },
];

const skills = [
  "Sistemas de reservas",
  "Gestão de espaços",
  "Aplicações web complexas",
  "Suporte técnico", 
  "Infraestrutura" ,
];

const navLinks = [
  { href: "/cv", label: "CV" },
  { href: "#portfolio", label: "Portófolio" },
  { href: "#contacto", label: "Contacto" },
];

const cvHighlights = [
  {
    icon: GraduationCap,
    label: "FEUP",
    detail: "Eng. Informática e Computação",
    color: "text-blue-400",
    bg: "bg-blue-950/40",
  },
  {
    icon: Briefcase,
    label: "Websites com 🤍",
    detail: "Fundador & Dev freelance",
    color: "text-sky-300",
    bg: "bg-sky-950/40",
  },
  {
    icon: Heart,
    label: "FPF · Easy Future",
    detail: "Voluntário assíduo desde 2020",
    color: "text-rose-400",
    bg: "bg-rose-950/40",
  },
];

const thinkingModes = [
  {
    id: "discover",
    icon: Network,
    label: "Descobrir",
    description:
      "Começo sempre por perceber o contexto real: pessoas, processos e limitações técnicas antes de sugerir qualquer solução.",
  },
  {
    id: "build",
    icon: Cpu,
    label: "Construir",
    description:
      "Arquitetura sólida, código limpo e sistemas pensados para crescer sem se tornarem impossíveis de manter.",
  },
  {
    id: "refine",
    icon: Server,
    label: "Afinar",
    description:
      "Monitorização, suporte contínuo e pequenas melhorias que, acumuladas, fazem grande diferença no dia a dia.",
  },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [thinkingMode, setThinkingMode] = useState<(typeof thinkingModes)[number]["id"]>("discover");
  const { projects, isLoggedIn } = useLoaderData<typeof loader>();

  // Navbar compacta após scroll
  const [compactHeader, setCompactHeader] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setCompactHeader(window.scrollY > 40);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="overflow-x-hidden w-full bg-[#050712] text-gray-100">
      <ScrollProgressBar />

      {/* ───── NAVBAR ───── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b border-slate-800/60 transition-all duration-300 ${
          compactHeader ? "bg-[#050712]/95 h-14" : "bg-[#050712]/70 h-16"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-500/40">
              <div className="w-3 h-3 rounded-sm bg-slate-950" />
            </div>
            <span className="font-semibold tracking-tight text-slate-100">Tiago Oliveira</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-slate-400 hover:text-slate-100 transition-colors"
              >
                {l.label}
              </a>
            ))}
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
              className="md:hidden overflow-hidden border-t border-slate-800 bg-[#050712]"
            >
              <nav className="flex flex-col px-4 py-3 gap-1">
                {navLinks.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className="text-sm font-medium text-slate-200 hover:text-sky-400 py-2.5 px-2 rounded-lg hover:bg-slate-900 transition-colors"
                  >
                    {l.label}
                  </a>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ───── HERO ───── */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-4 pt-20">
        {/* Fundo digital */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute top-1/4 -left-24 w-96 h-96 rounded-full bg-sky-500/18 blur-3xl"
            animate={{ x: [0, 40, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-1/4 -right-24 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl"
            animate={{ x: [0, -30, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full bg-cyan-400/8 blur-3xl"
            animate={{ x: [0, 20, -20, 0], y: [0, -20, 20, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
        </div>

        {/* Grid overlay subtil */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(#1f2937 1px, transparent 1px), linear-gradient(90deg, #1f2937 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative w-full max-w-6xl mx-auto grid md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-10 items-center">
          {/* Texto principal */}
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
              className="text-4xl sm:text-5xl md:text-6xl font-semibold mb-4 leading-tight tracking-tight text-slate-50"
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Construo sistemas digitais que continuam a fazer sentido depois do primeiro clique.
            </motion.h1>

            <motion.p
              className="text-sm sm:text-base text-slate-300/90 mb-8 max-w-md"
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Websites, aplicações web, sistemas de gestão e suporte técnico pensados para a vida real de empresas, associações e pessoas.
            </motion.p>

            <motion.div
              className="flex flex-wrap gap-3"
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <motion.a
                href="/cv"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl font-medium text-sm sm:text-base transition-colors shadow-lg shadow-sky-500/40 flex items-center gap-2"
              >
                <GraduationCap size={16} />
                Ver CV
              </motion.a>
              <motion.a
                href="#portfolio"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="px-5 py-2.5 border border-slate-700 rounded-xl font-medium text-sm sm:text-base text-slate-200 hover:border-sky-400 hover:text-sky-200 transition-colors flex items-center gap-2"
              >
                <ArrowRight size={16} />
                Ver Portófolio
              </motion.a>
            </motion.div>

            <motion.div
              className="mt-8 flex flex-wrap gap-4 text-xs text-slate-400"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {stats.map((stat) => (
                <div key={stat.label} className="flex items-center gap-2">
                  <span className="text-slate-200 font-semibold text-sm">{stat.value}</span>
                  <span className="text-slate-400 text-xs">{stat.label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Painel técnico sticky */}
          <div className="relative">
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="relative rounded-2xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-xl p-4 sm:p-5 shadow-2xl shadow-slate-900/60"
            >
              {/* Cabeçalho do painel */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-xs font-medium text-slate-300">Painel de sistemas</span>
                </div>
                <span className="text-[11px] text-slate-500">Operacional</span>
              </div>

              {/* Skills em scroll horizontal leve */}
              <div className="mb-4 overflow-hidden">
                <motion.div
                  className="flex gap-2 whitespace-nowrap"
                  animate={{ x: ["0%", "-50%"] }}
                  transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
                >
                  {[...skills, ...skills].map((skill, i) => (
                    <span
                      key={i}
                      className="text-[11px] font-medium text-slate-300 px-3 py-1 rounded-full border border-slate-700 bg-slate-900/60 flex-shrink-0"
                    >
                      {skill}
                    </span>
                  ))}
                </motion.div>
              </div>

              {/* Destaques CV */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {cvHighlights.map((highlight) => (
                  <button
                    key={highlight.label}
                    type="button"
                    className={`${highlight.bg} border border-slate-800/70 rounded-xl p-2 flex flex-col items-start gap-1 text-left hover:border-sky-500/60 transition-colors`}
                  >
                    <highlight.icon size={14} className={highlight.color} />
                    <span className="text-[11px] font-semibold text-slate-100 truncate">
                      {highlight.label}
                    </span>
                    <span className="text-[10px] text-slate-400 leading-snug line-clamp-2">
                      {highlight.detail}
                    </span>
                  </button>
                ))}
              </div>

              {/* Indicadores simples */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-3 flex flex-col gap-2">
                  <span className="text-[11px] text-slate-400">Suporte técnico</span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-200">Pedidos em curso</span>
                    <span className="text-xs font-semibold text-sky-300">Ativo</span>
                  </div>
                  <div className="mt-1 flex gap-1 h-1.5">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div
                        key={index}
                        className={`flex-1 rounded-full ${index < 4 ? "bg-sky-500" : "bg-slate-700"}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-3 flex flex-col gap-2">
                  <span className="text-[11px] text-slate-400">Sistemas operacionais</span>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[11px] text-slate-300">Online</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-snug">
                    Monitorização contínua, backups e atualizações planeadas.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
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

      {/* ───── SECÇÃO "COMO PENSO" ───── */}
      <section id="sobre" className="py-12 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-10 items-start">
          <AnimatedSection>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-lg shadow-slate-900/60">
                <Cpu size={22} className="text-sky-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-sky-400 uppercase tracking-[0.25em] mb-1.5">
                  Como penso
                </p>
                <h2 className="text-2xl sm:text-3xl font-semibold text-slate-50">
                  Sistemas bons começam com perguntas certas.
                </h2>
              </div>
            </div>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
              Muito além da tecnologia, o meu foco está em compreender o que o sistema precisa de fazer pelas pessoas que o usam. É a partir daí que tomo decisões técnicas — da arquitetura à implementação — para evitar soluções bonitas mas impraticáveis.
            </p>
          </AnimatedSection>

          <AnimatedSection direction="right">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 backdrop-blur-xl p-3 sm:p-4 flex flex-col gap-3">
              <div className="flex gap-2 mb-2">
                {thinkingModes.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setThinkingMode(mode.id)}
                    className={`flex-1 rounded-xl border text-xs sm:text-sm font-medium px-3 py-2 flex items-center gap-2 transition-colors ${
                      thinkingMode === mode.id
                        ? "border-sky-500 bg-sky-500/10 text-sky-200"
                        : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-sky-500/60 hover:text-sky-200"
                    }`}
                  >
                    <mode.icon size={14} />
                    {mode.label}
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 sm:p-4 min-h-[96px]">
                {thinkingModes.map((mode) => (
                  <AnimatePresence key={mode.id} mode="wait">
                    {thinkingMode === mode.id && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25 }}
                      >
                        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                          {mode.description}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ───── PORTFOLIO NARRATIVO ───── */}
      <section id="portfolio" className="py-14 px-4 bg-slate-950/40 border-t border-slate-800/70">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection>
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-xs font-semibold text-sky-400 uppercase tracking-[0.25em] mb-2">Portófolio</p>
                <h2 className="text-2xl sm:text-3xl font-semibold text-slate-50">Projetos em contexto real.</h2>
                <p className="text-sm text-slate-400 mt-2 max-w-xl">
                  Alguns dos sistemas que desenvolvi, focados em problemas concretos: reservas, gestão, automação, suporte e operações.
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

          {/* Palco sticky com capítulos */}
          <div className="grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-10">
            {/* Palco visual */}
            <div className="md:sticky md:top-24">
              <AnimatedSection direction="left">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/40 backdrop-blur-xl p-4 sm:p-5 shadow-xl shadow-slate-900/70">
                  <p className="text-xs font-medium text-slate-400 mb-3">Vista operacional</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 flex flex-col gap-2">
                      <span className="text-[11px] text-slate-400">Reservas & espaços</span>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-300">Slots de hoje</span>
                        <span className="text-[11px] font-semibold text-emerald-300">78% cheios</span>
                      </div>
                      <div className="mt-1 flex gap-1 h-1.5">
                        {Array.from({ length: 8 }).map((_, index) => (
                          <div
                            key={index}
                            className={`flex-1 rounded-full ${index < 6 ? "bg-emerald-400" : "bg-slate-700"}`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 flex flex-col gap-2">
                      <span className="text-[11px] text-slate-400">Tickets de suporte</span>
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="text-[11px] text-slate-300">Prioridade normal</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-snug">
                        Filas organizadas, estados claros e automações discretas.
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 flex flex-col gap-2 col-span-2">
                      <span className="text-[11px] text-slate-400">Telemetria</span>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 flex flex-col gap-1">
                          <span className="text-[11px] text-slate-300">Respostas do sistema</span>
                          <div className="mt-1 grid grid-cols-6 gap-1">
                            {Array.from({ length: 6 }).map((_, index) => (
                              <div
                                key={index}
                                className="h-3 rounded-full bg-gradient-to-b from-sky-500 to-indigo-500"
                                style={{ opacity: 0.4 + index * 0.08 }}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="w-24 h-16 rounded-lg border border-slate-800 bg-slate-950 flex items-center justify-center">
                          <span className="text-[10px] text-slate-400">Latência média
                            <span className="block text-[11px] text-sky-300 font-semibold">34 ms</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            </div>

            {/* Capítulos dos projetos */}
            <div className="space-y-6">
              {projects.map((project, index) => (
                <AnimatedSection key={project.slug} delay={index * 0.08}>
                  <Link to={`/projects/${project.slug}`}>
                    <motion.article
                      whileHover={{ y: -4 }}
                      className="group rounded-2xl border border-slate-800 bg-slate-950/40 p-4 sm:p-5 cursor-pointer transition-colors hover:border-sky-500/60"
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
                      <p className="text-sm text-slate-300/90 mb-3">
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
      <section id="contacto" className="py-12 px-4 border-t border-slate-800/70 bg-[#050712]">
        <div className="max-w-xl mx-auto">
          <AnimatedSection className="relative rounded-2xl overflow-hidden p-4 sm:p-6 text-center bg-gradient-to-br from-sky-500 via-indigo-600 to-purple-700 shadow-2xl shadow-sky-500/40">
            <div className="absolute inset-0 opacity-[0.12] pointer-events-none"
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
