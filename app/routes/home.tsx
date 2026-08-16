import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ArrowDown, ArrowUpRight, Check, Cpu, Menu, X, Zap } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import '../styles/immersive-home.css';
import { InterfaceMockup } from '../components/immersive/InterfaceMockup';
import { OrbitalGrid } from '../components/immersive/OrbitalGrid';

gsap.registerPlugin(ScrollTrigger);

const scenes = [
  { id: 'booking', eyebrow: '01 / OPERATIONS', title: 'Reservas que se movem ao ritmo do negócio.', text: 'Uma experiência clara para clientes e equipas, com tudo sincronizado em tempo real.', type: 'booking' as const },
  { id: 'kitchen', eyebrow: '02 / FLOW', title: 'Do pedido à cozinha sem ruído.', text: 'Interfaces que tornam o trabalho visível, rápido e impossível de ignorar.', type: 'kitchen' as const },
  { id: 'home', eyebrow: '03 / AUTOMATION', title: 'A casa responde antes de ser chamada.', text: 'Automação doméstica com controlo, contexto e uma camada humana.', type: 'home' as const },
];

export default function Home() {
  const root = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const context = gsap.context(() => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion) return;
      gsap.from('.hero-kicker, .hero-title-line, .hero-copy, .hero-actions', { y: 40, opacity: 0, duration: 1, stagger: 0.12, ease: 'power3.out' });
      gsap.to('.hero-orbit', { rotation: 360, duration: 28, repeat: -1, ease: 'none' });
      gsap.to('.hero-grid', { yPercent: -18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
      gsap.utils.toArray<HTMLElement>('.scene').forEach((scene) => {
        gsap.fromTo(scene.querySelectorAll('.scene-copy, .scene-card'), { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: scene, start: 'top 68%', end: 'top 34%', scrub: 1 } });
      });
      gsap.to('.signal-line', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.scenes', start: 'top 70%', end: 'bottom 75%', scrub: true } });
      gsap.to('.marquee-track', { xPercent: -35, ease: 'none', scrollTrigger: { trigger: '.marquee', start: 'top bottom', end: 'bottom top', scrub: true } });
    }, root);
    return () => context.revert();
  }, []);

  return <main ref={root} className="immersive-home">
    <nav className="site-nav"><Link className="brand" to="/">TA<span>.</span></Link><div className={`nav-links ${menuOpen ? 'is-open' : ''}`}><a href="#work" onClick={() => setMenuOpen(false)}>Soluções</a><Link to="/projects">Projetos</Link><Link to="/cv">Perfil</Link><a href="#contact" onClick={() => setMenuOpen(false)}>Contacto</a></div><button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu">{menuOpen ? <X /> : <Menu />}</button></nav>
    <section className="hero" aria-labelledby="hero-title"><OrbitalGrid className="hero-grid" /><div className="hero-orbit" /><div className="hero-inner"><p className="hero-kicker"><span className="status-dot" /> Software com pulso humano / Viana do Castelo</p><h1 id="hero-title"><span className="hero-title-line">Sistemas que</span><span className="hero-title-line hero-title-accent">ganham vida.</span></h1><p className="hero-copy">Desenho e construo produtos digitais, operações em tempo real e automações que fazem o mundo físico responder melhor.</p><div className="hero-actions"><a className="button button-primary" href="#work">Explorar o sistema <ArrowDown size={16} /></a><Link className="button button-ghost" to="/projects">Ver projetos <ArrowUpRight size={16} /></Link></div></div><div className="scroll-cue"><span>SCROLL TO CONNECT</span><Zap size={16} /></div></section>
    <section className="intro" id="work"><p className="section-label">/ O QUE FAÇO</p><div className="intro-grid"><h2>Interfaces para momentos que não podem parar.</h2><p>Da reserva de uma cadeira ao estado de uma casa inteira: crio ferramentas que organizam complexidade e deixam as pessoas focadas no que importa.</p></div></section>
    <section className="scenes">{scenes.map((scene) => <article className="scene" id={scene.id} key={scene.id}><div className="scene-copy"><p className="section-label">{scene.eyebrow}</p><h2>{scene.title}</h2><p>{scene.text}</p><span className="scene-index">{scene.eyebrow.slice(0, 2)}</span></div><InterfaceMockup type={scene.type} /><div className="signal-line" /></article>)}</section>
    <section className="marquee" aria-hidden="true"><div className="marquee-track">DESIGN / CODE / MOTION / SYSTEMS / DESIGN / CODE / MOTION / SYSTEMS /</div></section>
    <section className="closing" id="contact"><div><p className="section-label">/ PRÓXIMO MOVIMENTO</p><h2>Tem um sistema a precisar de mais vida?</h2><a className="button button-primary" href="mailto:hello@tiagoanoliveira.dev">Vamos falar <ArrowUpRight size={16} /></a></div><div className="closing-mark"><Cpu size={44} /><Check size={18} /></div></section>
  </main>;
}
