// app/routes/home.tsx
import { motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { type MetaFunction, useLoaderData } from "react-router";
import { Link } from "react-router";
import ScrollProgressBar from "~/components/ui/ScrollProgressBar";
import { useRef, useState } from "react";
import { Menu, X, User, ArrowUpRight } from "lucide-react";
import type { Route } from "./+types/home";
import { getPublishedProjects } from "~/lib/projects.server";
import { getSessionUser } from "~/lib/auth.server";

export const meta: MetaFunction = () => [
  { title: "Tiago Oliveira" },
  { name: "description", content: "Tiago Oliveira — engenharia de interfaces, sistemas e suporte técnico para operações reais." },
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

const scenes = [
  { id: "brief", kicker: "01 / perceber", title: "Antes da interface, existe a operação.", body: "Um pedido de reserva. Um ticket sem resposta. Um processo preso numa folha de cálculo. Começo por tornar o problema visível.", status: "recolher contexto" },
  { id: "system", kicker: "02 / estruturar", title: "Depois, transformo ruído em sistema.", body: "Fluxos, estados, permissões e dados passam a ter uma forma que as pessoas conseguem usar sem lutar contra a ferramenta.", status: "modelar solução" },
  { id: "ship", kicker: "03 / acompanhar", title: "A entrega não termina no deploy.", body: "Uma boa solução continua a ser observada, afinada e explicada. É assim que a tecnologia ganha durabilidade.", status: "manter em movimento" },
];

function SystemWindow({ sceneIndex }: { sceneIndex: number }) {
  const stage = scenes[sceneIndex];
  const data = [["RESERVAS", "12", "03 pendentes"], ["SUPORTE", "08", "02 em análise"], ["SISTEMA", "99.8%", "estável"]];
  return (
    <div className="system-window" aria-label={`Interface: ${stage.title}`}>
      <div className="system-window__topbar"><div className="system-window__traffic" aria-hidden="true"><span /><span /><span /></div><span className="system-window__path">/workspace / {stage.id}</span><span className="system-window__state">{stage.status}</span></div>
      <div className="system-window__body"><div className="system-window__rail" aria-hidden="true"><span className="system-window__rail-mark system-window__rail-mark--active" /><span className="system-window__rail-mark" /><span className="system-window__rail-mark" /><span className="system-window__rail-line" /><span className="system-window__rail-mark" /></div><div className="system-window__content"><div className="system-window__heading"><span>OVERVIEW</span><span>TIAGO / SYSTEMS</span></div><div className="system-window__signal"><div className="system-window__signal-line" /><div className="system-window__signal-line system-window__signal-line--short" /><div className="system-window__signal-node system-window__signal-node--one" /><div className="system-window__signal-node system-window__signal-node--two" /><div className="system-window__signal-node system-window__signal-node--three" /></div><div className="system-window__metrics">{data.map(([label, value, note]) => <div key={label} className="system-window__metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>)}</div><div className="system-window__log"><div><span className="system-window__log-dot" /> flow resolved <em>00:04:12</em></div><div><span className="system-window__log-dot system-window__log-dot--muted" /> permissions synced <em>00:04:16</em></div><div><span className="system-window__log-dot" /> next action ready <em>00:04:20</em></div></div></div></div>
      <div className="system-window__footer"><span>SCENE / {String(sceneIndex + 1).padStart(2, "0")}</span><span>SCROLL TO CHANGE STATE</span></div>
    </div>
  );
}

export default function Home() {
  const { projects, isLoggedIn } = useLoaderData<typeof loader>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sceneIndex, setSceneIndex] = useState(0);
  const narrativeRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: narrativeRef, offset: ["start start", "end end"] });
  const windowScale = useTransform(scrollYProgress, [0, 0.45, 1], [0.76, 1, 0.92]);
  const windowY = useTransform(scrollYProgress, [0, 0.45, 1], [80, 0, -18]);
  const windowRadius = useTransform(scrollYProgress, [0, 0.45, 1], [32, 12, 0]);
  const windowWidth = useTransform(scrollYProgress, [0, 0.45, 1], ["78%", "100%", "100%"]);
  useMotionValueEvent(scrollYProgress, "change", (latest) => { const next = Math.min(2, Math.floor(latest * 3)); setSceneIndex((current) => current === next ? current : next); });

  return (
    <main className="site-shell">
      <ScrollProgressBar />
      <header className="site-header"><div className="site-header__inner"><a href="#top" className="site-mark" aria-label="Tiago Oliveira, início"><span className="site-mark__symbol" aria-hidden="true">T/</span><span>Tiago Oliveira</span></a><nav className="site-nav site-nav--desktop" aria-label="Navegação principal"><a href="#processo">Processo</a><a href="#portfolio">Projetos</a><a href="#contacto">Contacto</a><Link to="/portal" className="site-nav__account"><User size={14} /> {isLoggedIn ? "Conta" : "Portal"}</Link></nav><div className="site-header__mobile-actions"><Link to="/portal" className="site-nav__account"><User size={14} /> {isLoggedIn ? "Conta" : "Portal"}</Link><button type="button" className="menu-button" onClick={() => setMenuOpen((value) => !value)} aria-label="Abrir menu">{menuOpen ? <X size={20} /> : <Menu size={20} />}</button></div></div>{menuOpen && <nav className="site-nav site-nav--mobile" aria-label="Navegação mobile"><a href="#processo" onClick={() => setMenuOpen(false)}>Processo</a><a href="#portfolio" onClick={() => setMenuOpen(false)}>Projetos</a><a href="#contacto" onClick={() => setMenuOpen(false)}>Contacto</a></nav>}</header>
      <section id="top" className="opening-section"><div className="opening-section__grid" /><div className="opening-section__inner"><p className="eyebrow">Engenharia de produto / Porto, PT</p><h1>Ferramentas digitais para problemas que não cabem num template.</h1><div className="opening-section__bottom"><p>Websites, sistemas internos e suporte técnico — desenhados a partir da forma como o trabalho realmente acontece.</p><a href="#processo" className="scroll-link">Começar a explorar <span>↓</span></a></div></div></section>
      <section id="processo" ref={narrativeRef} className="narrative-section"><div className="narrative-section__sticky"><div className="narrative-section__copy"><p className="eyebrow">Uma interface em três estados</p><div className="narrative-section__scene-counter">0{sceneIndex + 1} <span>/ 03</span></div><motion.div key={scenes[sceneIndex].id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}><p className="narrative-section__kicker">{scenes[sceneIndex].kicker}</p><h2>{scenes[sceneIndex].title}</h2><p>{scenes[sceneIndex].body}</p></motion.div><div className="narrative-section__progress" aria-hidden="true">{scenes.map((scene, index) => <span key={scene.id} className={index <= sceneIndex ? "is-active" : ""} />)}</div></div><motion.div className="narrative-section__window" style={{ scale: windowScale, y: windowY, width: windowWidth, borderRadius: windowRadius }}><SystemWindow sceneIndex={sceneIndex} /></motion.div></div><div className="narrative-section__chapters" aria-hidden="true">{scenes.map((scene) => <div key={scene.id} className="narrative-section__chapter" />)}</div></section>
      <section className="statement-section"><p className="eyebrow">O resultado</p><h2>Não entrego apenas ecrãs. Entrego uma forma mais clara de trabalhar.</h2></section>
      <section id="portfolio" className="projects-section"><div className="section-heading"><div><p className="eyebrow">Projetos selecionados</p><h2>Sistemas que saíram do papel.</h2></div><Link to="/projects" className="text-link">Ver todos <ArrowUpRight size={16} /></Link></div><div className="projects-list">{projects.map((project, index) => <Link key={project.slug} to={`/projects/${project.slug}`} className="project-row"><span className="project-row__number">0{index + 1}</span><span className="project-row__title">{project.title}</span><span className="project-row__category">{project.category}</span><ArrowUpRight className="project-row__arrow" size={18} /></Link>)}</div></section>
      <section id="contacto" className="contact-section"><p className="eyebrow">Próximo sistema</p><h2>O que está a impedir o teu trabalho de fluir?</h2><a href="mailto:geral@tiagoanoliveira.pt" className="contact-section__link">geral@tiagoanoliveira.pt <ArrowUpRight size={20} /></a></section>
    </main>
  );
}
