// app/routes/home.tsx
import { motion, useScroll, useTransform } from "motion/react";
import { type MetaFunction, useLoaderData } from "react-router";
import { Link } from "react-router";
import { useRef, useState } from "react";
import { ArrowUpRight, Menu, X, User } from "lucide-react";
import type { Route } from "./+types/home";
import { getPublishedProjects } from "~/lib/projects.server";
import { getSessionUser } from "~/lib/auth.server";
import ScrollProgressBar from "~/components/ui/ScrollProgressBar";

export const meta: MetaFunction = () => [
  { title: "Tiago Oliveira — Desenvolvimento de Software" },
  { name: "description", content: "Tiago Oliveira cria websites, sistemas e suporte técnico para transformar problemas reais em ferramentas digitais mais claras." },
  { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
];

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB;
  const [projects, user] = await Promise.all([
    getPublishedProjects(db, { sortBy: "order_index", sortDir: "asc", limit: 4 }),
    getSessionUser(db, request),
  ]);
  return { projects, isLoggedIn: !!user };
}

const services = [
  { number: "01", title: "Websites e experiências digitais", text: "Presença digital com intenção: arquitetura clara, conteúdo legível e uma experiência que representa o teu projeto." },
  { number: "02", title: "Sistemas de gestão e reservas", text: "Ferramentas para organizar pessoas, espaços, pedidos e informação sem criar mais trabalho para quem as usa." },
  { number: "03", title: "Automação de processos", text: "Ligo tarefas e dados repetitivos para que o tempo das pessoas possa ser usado onde realmente acrescenta valor." },
  { number: "04", title: "Suporte e manutenção técnica", text: "Acompanhamento depois da entrega: corrigir, explicar, prevenir e manter os sistemas confiáveis." },
];

const journey = [
  { label: "Pessoa", text: "Sou engenheiro informático e trabalho entre produto, desenvolvimento e suporte técnico." },
  { label: "Percurso", text: "Estudo na FEUP, desenvolvo projetos freelance e participo ativamente em iniciativas de voluntariado." },
  { label: "Prática", text: "Gosto de perceber o contexto antes de escolher a tecnologia — e de continuar presente depois do lançamento." },
];

export default function Home() {
  const { projects, isLoggedIn } = useLoaderData<typeof loader>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeService, setActiveService] = useState(0);
  const storyRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: storyRef, offset: ["start end", "end start"] });
  const storyX = useTransform(scrollYProgress, [0, 0.5, 1], ["-12%", "0%", "12%"]);

  return (
    <main className="editorial-home">
      <ScrollProgressBar />
      <header className="editorial-header">
        <div className="editorial-header__inner">
          <a href="#top" className="editorial-logo" aria-label="Tiago Oliveira, início"><span>TO</span><strong>Tiago Oliveira</strong></a>
          <nav className="editorial-nav editorial-nav--desktop" aria-label="Navegação principal"><a href="#sobre">Sobre</a><a href="#servicos">O que faço</a><a href="#projetos">Projetos</a><a href="#contacto">Contacto</a><Link to="/portal" className="editorial-account"><User size={14} /> {isLoggedIn ? "Conta" : "Portal"}</Link></nav>
          <div className="editorial-mobile-actions"><Link to="/portal" className="editorial-account"><User size={14} /> {isLoggedIn ? "Conta" : "Portal"}</Link><button type="button" className="editorial-menu" onClick={() => setMenuOpen((value) => !value)} aria-label="Abrir menu">{menuOpen ? <X size={20} /> : <Menu size={20} />}</button></div>
        </div>
        {menuOpen && <nav className="editorial-nav editorial-nav--mobile"><a href="#sobre" onClick={() => setMenuOpen(false)}>Sobre</a><a href="#servicos" onClick={() => setMenuOpen(false)}>O que faço</a><a href="#projetos" onClick={() => setMenuOpen(false)}>Projetos</a><a href="#contacto" onClick={() => setMenuOpen(false)}>Contacto</a></nav>}
      </header>

      <section id="top" className="editorial-hero">
        <div className="editorial-hero__index">01 <span>/ 05</span></div>
        <div className="editorial-hero__inner"><p className="editorial-label">Software Development · Porto, Portugal</p><h1>Hi, I'm Tiago and I build solutions users love and businesses value.</h1><div className="editorial-hero__footer"><p>Websites, booking softwares, home automation and cctv systems, etc.</p><a href="#sobre" className="editorial-scroll">Descer para conhecer <span>↓</span></a></div></div>
      </section>

      <section id="sobre" ref={storyRef} className="editorial-intro">
        <div className="editorial-intro__rail"><span>02</span><span>/</span><span>sobre</span></div>
        <div className="editorial-intro__content"><p className="editorial-label">Quem sou</p><motion.h2 style={{ x: storyX }}>Code comes second. First, I bridge the gap between human needs and business goals.</motion.h2><p className="editorial-intro__body">Sou o Tiago, engenheiro informático no Porto. Trabalho na interseção entre desenvolvimento, produto e suporte: transformo necessidades difíceis de explicar em ferramentas que as pessoas conseguem usar.</p><div className="editorial-journey">{journey.map((item, index) => <div className="editorial-journey__item" key={item.label}><span>0{index + 1}</span><div><strong>{item.label}</strong><p>{item.text}</p></div></div>)}</div></div>
      </section>

      <section id="servicos" className="editorial-services"><div className="editorial-section-head"><div><p className="editorial-label">O que faço</p><h2>Quatro formas de pôr a tecnologia a trabalhar.</h2></div><span className="editorial-section-count">03 / 05</span></div><div className="editorial-services__list">{services.map((service, index) => <button type="button" key={service.number} className={`editorial-service ${activeService === index ? "is-active" : ""}`} onMouseEnter={() => setActiveService(index)} onFocus={() => setActiveService(index)} onClick={() => setActiveService(index)}><span className="editorial-service__number">{service.number}</span><span className="editorial-service__title">{service.title}</span><ArrowUpRight className="editorial-service__arrow" size={22} /><span className="editorial-service__description">{service.text}</span></button>)}</div></section>

      <section id="projetos" className="editorial-projects"><div className="editorial-section-head"><div><p className="editorial-label">Trabalho selecionado</p><h2>Projetos que saíram do papel.</h2></div><Link to="/projects" className="editorial-text-link">Ver portfólio completo <ArrowUpRight size={17} /></Link></div><div className="editorial-project-list">{projects.map((project, index) => <Link to={`/projects/${project.slug}`} className="editorial-project" key={project.slug}><span className="editorial-project__number">0{index + 1}</span><span className="editorial-project__title">{project.title}</span><span className="editorial-project__category">{project.category}</span><span className="editorial-project__summary">{project.summary}</span><ArrowUpRight className="editorial-project__arrow" size={19} /></Link>)}</div><Link to="/projects" className="editorial-projects__more">Explorar todos os projetos <ArrowUpRight size={17} /></Link></section>

      <section className="editorial-statement"><p className="editorial-label">04 / percurso</p><h2>Há sempre uma pessoa, uma equipa ou uma comunidade do outro lado do sistema.</h2><p>É por isso que também me envolvo em voluntariado e projetos associativos. A tecnologia interessa-me mais quando melhora alguma coisa fora do ecrã.</p></section>

      <section id="contacto" className="editorial-contact"><p className="editorial-label">05 / próximo passo</p><h2>O que está a impedir o teu trabalho de fluir?</h2><a href="mailto:geral@tiagoanoliveira.pt" className="editorial-contact__cta">Fala comigo <ArrowUpRight size={23} /></a><div className="editorial-contact__footer"><span>Tiago Oliveira · Porto, Portugal</span><Link to="/cv">Ver CV completo <ArrowUpRight size={15} /></Link></div></section>
    </main>
  );
}
