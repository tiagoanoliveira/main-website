// app/routes/home.tsx
import { motion, AnimatePresence } from "motion/react";
import {type MetaFunction, useLoaderData} from "react-router";
import { Link } from "react-router";
import AnimatedSection from "~/components/ui/AnimatedSection";
import CounterStat from "~/components/ui/CounterStat";
import ScrollProgressBar from "~/components/ui/ScrollProgressBar";
import { useState } from "react";
import { Menu, X, User } from "lucide-react";
import type { Route } from "./+types/home";
import { getPublishedProjects } from "~/lib/projects.server";
import { getSessionUser } from "~/lib/auth.server";

export const meta: MetaFunction = () => [
  { title: "Tiago Oliveira" },
  { name: "description", content: "Desenvolvimento de websites, softwares, manutenção de sistemas e suporte técnico para empresas e particulares." },
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

const skills = [
  "HTML", "CSS", "JavaScript", "React", "PHP", "SQL", "Linux", "DNS", "SEO",
];

const navLinks = [
  { href: "#sobre",     label: "Sobre" },
  { href: "#portfolio", label: "Portófolio" },
  { href: "#contacto",  label: "Contacto" },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { projects, isLoggedIn } = useLoaderData<typeof loader>();

  return (
      // overflow-x-hidden no wrapper raiz elimina o scroll horizontal em mobile
      <div className="overflow-x-hidden w-full">
        <ScrollProgressBar />

        {/* ───── NAVBAR ───── */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200/60 dark:border-gray-800/60">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            {/* Logo */}
            <span className="font-bold text-gray-900 dark:text-white tracking-tight">Tiago Oliveira</span>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((l) => (
                  <a
                      key={l.href}
                      href={l.href}
                      className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    {l.label}
                  </a>
              ))}
              <Link
                  to="/portal"
                  className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                <User size={14} />
                {isLoggedIn ? "Minha Conta" : "Login"}
              </Link>
            </nav>

            {/* Mobile: conta + hamburguer */}
            <div className="flex items-center gap-2 md:hidden">
              <Link
                  to="/portal"
                  className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                <User size={13} />
                {isLoggedIn ? "Conta" : "Login"}
              </Link>
              <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
                    className="md:hidden overflow-hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
                >
                  <nav className="flex flex-col px-4 py-3 gap-1">
                    {navLinks.map((l) => (
                        <a
                            key={l.href}
                            href={l.href}
                            onClick={() => setMenuOpen(false)}
                            className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 py-2.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
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
        {/* px-4 em vez de overflow-hidden isola os orbs sem cortar conteúdo */}
        <section className="relative min-h-[95vh] flex items-center justify-center px-4">

          {/* Orbs animados — pointer-events-none evita qualquer interacção */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <motion.div
                className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-500/20 blur-3xl"
                animate={{ x: [0, 40, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-purple-500/15 blur-3xl"
                animate={{ x: [0, -30, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }}
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            />
            <motion.div
                className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl"
                animate={{ x: [0, 20, -20, 0], y: [0, -20, 20, 0] }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            />
          </div>

          {/* Grid decorativo */}
          <div
              className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
              style={{
                backgroundImage: "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)",
                backgroundSize: "60px 60px",
              }}
          />

          {/* Conteúdo hero — w-full garante que não alarga para além do viewport */}
          <div className="relative text-center w-full max-w-3xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-sm font-medium mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
              </span>
              👋🏻 Bem-vind@!
            </motion.div>

            <motion.h1
                className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 leading-tight tracking-tight"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
            >
              Tiago Oliveira
            </motion.h1>

            <motion.p
                className="text-lg sm:text-xl md:text-2xl text-gray-500 dark:text-gray-400 mb-4 font-light"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
            >
              <span className="relative">
                <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-sky-800">Engenheiro Informático </span>
                 · Porto, Portugal
              </span>

            </motion.p>

            <motion.p
                className="text-sm sm:text-base text-gray-400 dark:text-gray-500 mb-10 max-w-xl mx-auto px-2"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
            >
              Desenvolvimento de websites, softwares, manutenção de sistemas e suporte técnico para empresas e particulares.
            </motion.p>

            <motion.div
                className="flex flex-wrap justify-center gap-3 px-4"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
            >
              <motion.a
                  href="#portfolio"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/25"
              >
                Ver Portófolio
              </motion.a>
              <motion.a
                  href="#contacto"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-700 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                Contactar
              </motion.a>
            </motion.div>
          </div>

          {/* Seta de scroll */}
          <motion.div
              className="absolute bottom-10 left-1/2 -translate-x-1/2"
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="w-6 h-10 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-start justify-center pt-2">
              <div className="w-1 h-2 bg-gray-400 rounded-full" />
            </div>
          </motion.div>
        </section>

        {/* ───── SKILLS ───── */}
        <section className="py-12 border-y border-gray-100 dark:border-gray-800 overflow-hidden">
          <motion.div
              className="flex gap-8 whitespace-nowrap"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            {[...skills, ...skills].map((skill, i) => (
                <span
                    key={i}
                    className="text-sm font-medium text-gray-400 dark:text-gray-600 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-800 flex-shrink-0"
                >
                  {skill}
                </span>
            ))}
          </motion.div>
        </section>

        {/* ───── SOBRE ───── */}
        <section id="sobre" className="py-14 px-4">
          <div className="max-w-6xl mx-auto">
            {/* Header com foto + títulos */}
            <AnimatedSection>
              <div className="flex items-center gap-4 mb-8">
                <img
                    src="/profile.jpg"
                    alt="Tiago Oliveira"
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover flex-shrink-0 shadow-lg ring-2 ring-blue-100 dark:ring-blue-900"
                />
                <div>
                  <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1.5">
                    Sobre mim
                  </p>
                  <h2 className="text-3xl sm:text-4xl font-bold">
                    Muito mais do que um Engenheiro
                  </h2>
                </div>
              </div>
            </AnimatedSection>

            {/* Conteúdo */}
            <div className="grid sm:grid-cols-3 gap-16 items-center">
              <AnimatedSection direction="left" className="sm:col-span-2">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Além de Engenheiro informático com forte experiência em desenvolvimento web e softwares diversificados (sistemas de reservas, gestão de espaços, etc), considero-me um ser capaz de melhorar o mundo que me rodeia - incluindo não só vastos anos de dedicação na área do voluntáriado como ainda a aplicação de conhecimentos da minha àrea no apoio a negócios, pessoas e empresas que causam impacto na comunidade que os rodeia.
                </p>
              </AnimatedSection>
              <AnimatedSection direction="right">
                <div className="grid grid-cols-2 sm:grid-cols-1 gap-4">
                  {stats.map((stat) => (
                      <CounterStat key={stat.label} value={stat.value} label={stat.label} />
                  ))}
                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* ───── PORTFOLIO ───── */}
        <section id="portfolio" className="py-14 px-4 bg-gray-50 dark:bg-gray-900/50">
          <div className="max-w-6xl mx-auto">
            <AnimatedSection>
              <div className="flex items-end justify-between mb-16">
                <div>
                  <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Portófolio</p>
                  <h2 className="text-4xl font-bold">Projetos recentes</h2>
                </div>
                <Link
                    to="/projects"
                    className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Ver todos <span>→</span>
                </Link>
              </div>
            </AnimatedSection>
            <div className="grid md:grid-cols-2 gap-6">
              {projects.map((project, i) => (
                  <AnimatedSection key={project.slug} delay={i * 0.1}>
                    <Link to={`/projects/${project.slug}`}>
                      <motion.div
                          whileHover={{ y: -6, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
                          className="group block p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-4">
                          {/* Logo ou fallback com primeira letra */}
                          {project.logo_r2_key ? (
                              <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-1.5 shadow-sm">
                                <img
                                    src={`/uploads/${project.logo_r2_key}`}
                                    alt={`${project.title} logo`}
                                    className="w-full h-full object-contain"
                                />
                              </div>
                          ) : (
                              <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/30">
                                {project.title[0]}
                              </div>
                          )}
                          <span className="text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-950 px-3 py-1 rounded-full">
                  {project.category}
                </span>
                        </div>
                        <h3 className="font-semibold text-lg mb-2 group-hover:text-blue-600 transition-colors">
                          {project.title}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{project.summary}</p>
                        {project.complexity && (
                            <div className="mt-3 flex gap-1">
                              {Array.from({ length: 5 }).map((_, j) => (
                                  <div
                                      key={j}
                                      className={`h-1.5 w-5 rounded-full ${j < project.complexity ? "bg-blue-500" : "bg-gray-200 dark:bg-gray-700"}`}
                                  />
                              ))}
                            </div>
                        )}
                      </motion.div>
                    </Link>
                  </AnimatedSection>
              ))}
            </div>
            <div className="mt-8 text-center sm:hidden">
              <Link to="/projects" className="text-sm font-medium text-blue-600 hover:underline">
                Ver todos os projetos →
              </Link>
            </div>
          </div>
        </section>

        {/* ───── CONTACTO ───── */}
        <section id="contacto" className="py-20 sm:py-28 px-4">
          <div className="max-w-2xl mx-auto">
            <AnimatedSection className="relative rounded-3xl overflow-hidden p-8 sm:p-12 text-center bg-gradient-to-br from-blue-600 to-purple-700 shadow-2xl shadow-blue-500/25">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Vamos trabalhar juntos?</h2>
                <p className="text-blue-100 mb-8 sm:mb-10 text-base sm:text-lg">Tens um projeto em mente? Fala comigo.</p>
                <motion.a
                    href="mailto:geral@tiagoanoliveira.pt"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-block px-6 sm:px-8 py-3 sm:py-4 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-colors text-base sm:text-lg shadow-xl break-all"
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
