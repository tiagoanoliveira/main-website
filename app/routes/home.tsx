import type { MetaFunction } from "react-router";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

import "../app.css";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

export const meta: MetaFunction = () => [
    { title: "Tiago Oliveira — Software Developer" },
    {
        name: "description",
        content:
            "Tiago Oliveira is a full-stack developer building useful digital products, web applications and real-world systems.",
    },
];

export default function Home() {
    const root = useRef<HTMLElement>(null);

    const header = useRef<HTMLElement>(null);

    const hero = useRef<HTMLElement>(null);
    const heroTitle = useRef<HTMLHeadingElement>(null);
    const titleCopy = useRef<HTMLSpanElement>(null);
    const systemsWord = useRef<HTMLSpanElement>(null);
    const heroVisual = useRef<HTMLDivElement>(null);
    const visualCore = useRef<HTMLDivElement>(null);
    const heroEyebrow = useRef<HTMLParagraphElement>(null);
    const heroFooter = useRef<HTMLDivElement>(null);
    const progressCurrent = useRef<HTMLSpanElement>(null);
    const progressBar = useRef<HTMLSpanElement>(null);
    const stageLabel = useRef<HTMLSpanElement>(null);

    const aboutWrap = useRef<HTMLDivElement>(null);
    const about = useRef<HTMLElement>(null);
    const aboutTitle = useRef<HTMLHeadingElement>(null);
    const aboutCopy = useRef<HTMLParagraphElement>(null);
    const aboutActivity = useRef<HTMLDivElement>(null);
    const aboutFooter = useRef<HTMLDivElement>(null);

    const servicesWrap = useRef<HTMLDivElement>(null);
    const services = useRef<HTMLElement>(null);

    useGSAP(
        () => {
            if (
                !hero.current ||
                !heroTitle.current ||
                !titleCopy.current ||
                !systemsWord.current ||
                !heroVisual.current ||
                !visualCore.current ||
                !aboutWrap.current ||
                !about.current ||
                !servicesWrap.current ||
                !services.current
            ) {
                return;
            }

            const media = gsap.matchMedia();

            media.add(
                {
                    desktop: "(min-width: 761px)",
                    reducedMotion: "(prefers-reduced-motion: reduce)",
                },
                (context) => {
                    const { reducedMotion } = context.conditions as {
                        desktop: boolean;
                        reducedMotion: boolean;
                    };

                    if (reducedMotion) {
                        gsap.set(
                            [
                                header.current,
                                heroEyebrow.current,
                                heroFooter.current,
                                heroTitle.current,
                                systemsWord.current,
                                about.current,
                                aboutTitle.current,
                                aboutCopy.current,
                                aboutActivity.current,
                                aboutFooter.current,
                                services.current,
                            ],
                            {
                                autoAlpha: 1,
                                clearProps: "transform",
                            },
                        );

                        return;
                    }

                    const split = SplitText.create(titleCopy.current, {
                        type: "words,chars",
                        wordsClass: "hero-word++",
                        charsClass: "hero-char",
                        aria: "auto",
                        autoSplit: true,
                        onSplit: (self) => {
                            gsap.set(self.words, {
                                display: "inline-block",
                                transformOrigin: "50% 50%",
                                willChange: "transform, opacity, filter",
                            });

                            return gsap.set(self.words, {
                                x: 0,
                                y: 0,
                                rotate: 0,
                                scale: 1,
                                opacity: 1,
                                filter: "blur(0px)",
                            });
                        },
                    });

                    const words = split.words;
                    const chars = split.chars;

                    // Header is fixed and never touched by scroll — animate once, then leave alone.
                    gsap.set(header.current, { autoAlpha: 0, y: -14 });

                    gsap.set([heroEyebrow.current, heroFooter.current, progressCurrent.current, progressBar.current], {
                        autoAlpha: 0,
                        y: 18,
                    });

                    gsap.set(systemsWord.current, {
                        autoAlpha: 1,
                        transformOrigin: "50% 52%",
                        willChange: "transform, opacity",
                    });

                    gsap.set(heroVisual.current, { autoAlpha: 0, scale: 0.72, rotate: -18 });
                    gsap.set(visualCore.current, { scale: 0 });

                    gsap.set(about.current, { xPercent: 100 });
                    gsap.set([aboutTitle.current, aboutCopy.current, aboutActivity.current, aboutFooter.current], {
                        autoAlpha: 0,
                        y: 28,
                    });

                    gsap.set(services.current, { yPercent: 100 });

                    const intro = gsap.timeline({ defaults: { ease: "power3.out" } });

                    intro
                        .to(header.current, { autoAlpha: 1, y: 0, duration: 0.65 })
                        .to(heroEyebrow.current, { autoAlpha: 1, y: 0, duration: 0.6 }, "-=0.35")
                        .to(
                            heroVisual.current,
                            { autoAlpha: 1, scale: 1, rotate: -5, duration: 1.1, ease: "power4.out" },
                            "-=0.45",
                        )
                        .to(visualCore.current, { scale: 1, duration: 0.85, ease: "back.out(1.8)" }, "-=0.72")
                        .from(
                            words,
                            {
                                yPercent: 115,
                                rotateX: -80,
                                opacity: 0,
                                duration: 0.95,
                                stagger: { amount: 0.48, from: "start" },
                                ease: "power4.out",
                            },
                            "-=0.72",
                        )
                        .to(heroFooter.current, { autoAlpha: 1, y: 0, duration: 0.6 }, "-=0.58")
                        .to(
                            [progressCurrent.current, progressBar.current],
                            { autoAlpha: 1, y: 0, duration: 0.45 },
                            "-=0.42",
                        );

                    // Idle "radar" animation — always running, independent from scroll direction.
                    gsap.to(".hero-radar-sweep", {
                        rotate: 360,
                        duration: 5.5,
                        repeat: -1,
                        ease: "none",
                    });

                    gsap.to(".hero-radar-node", {
                        scale: 1.6,
                        opacity: 0.15,
                        duration: 1.4,
                        repeat: -1,
                        yoyo: true,
                        ease: "sine.inOut",
                        stagger: { each: 0.5, repeat: -1 },
                    });

                    gsap.to(visualCore.current, {
                        boxShadow: "0 0 0 20px rgba(24, 26, 24, 0.03)",
                        duration: 1.6,
                        repeat: -1,
                        yoyo: true,
                        ease: "sine.inOut",
                    });

                    // Hero morph timeline — only elements INSIDE the hero pin are touched.
                    const heroTimeline = gsap.timeline({
                        defaults: { ease: "none" },
                        scrollTrigger: {
                            trigger: hero.current,
                            start: "top top",
                            end: "+=270%",
                            pin: true,
                            pinSpacing: true,
                            scrub: 0.65,
                            anticipatePin: 1,
                            invalidateOnRefresh: true,
                            onUpdate: (self) => {
                                if (stageLabel.current) {
                                    stageLabel.current.textContent =
                                        self.progress < 0.5 ? "Introduction" : "About me";
                                }
                                if (progressBar.current) {
                                    progressBar.current.style.setProperty(
                                        "--progress",
                                        `${Math.round(self.progress * 100)}%`,
                                    );
                                }
                            },
                        },
                    });

                    heroTimeline
                        .addLabel("split", 0)
                        .to(
                            words,
                            {
                                x: (index) =>
                                    (index % 2 === 0 ? -1 : 1) *
                                    gsap.utils.mapRange(0, words.length - 1, 55, 250, index),
                                y: (index) => gsap.utils.mapRange(0, words.length - 1, -130, 185, index),
                                rotate: (index) => gsap.utils.mapRange(0, words.length - 1, -14, 17, index),
                                scale: (index) => gsap.utils.mapRange(0, words.length - 1, 0.84, 1.14, index),
                                opacity: 0,
                                filter: "blur(10px)",
                                stagger: { each: 0.015, from: "center" },
                            },
                            "split",
                        )
                        .to(
                            chars,
                            {
                                x: "random(-38, 38)",
                                y: "random(-68, 68)",
                                rotate: "random(-28, 28)",
                                stagger: { each: 0.002, from: "random" },
                            },
                            "split",
                        )
                        .addLabel("systems-focus", 0.4)
                        .to(heroVisual.current, { rotate: 180, scale: 1.72, autoAlpha: 0.18 }, "systems-focus")
                        .to(visualCore.current, { scale: 2.25 }, "systems-focus")
                        .to(
                            systemsWord.current,
                            {
                                scale: 4.1,
                                xPercent: -15,
                                yPercent: -18,
                                letterSpacing: "-0.075em",
                                duration: 0.25,
                                ease: "power2.inOut",
                            },
                            "systems-focus",
                        )
                        .to(heroTitle.current, { color: "#f0eee7" }, "systems-focus+=0.05")
                        .addLabel("handoff", 0.72)
                        .to(
                            systemsWord.current,
                            { scale: 7.5, xPercent: -12, yPercent: -22, autoAlpha: 0 },
                            "handoff",
                        )
                        .to(heroVisual.current, { scale: 2.4, autoAlpha: 0 }, "handoff")
                        .to(hero.current, { backgroundColor: "#1c211c" }, "handoff");

                    // About: sticky slide-in from the right, synced 1:1 with the wrapper's scroll length.
                    const aboutSlide = gsap.timeline({
                        defaults: { ease: "none" },
                        scrollTrigger: {
                            trigger: aboutWrap.current,
                            start: "top top",
                            end: "bottom top",
                            scrub: 0.5,
                            invalidateOnRefresh: true,
                        },
                    });

                    aboutSlide
                        .to(about.current, { xPercent: 0, duration: 0.55, ease: "power2.out" })
                        .to(
                            [aboutTitle.current, aboutCopy.current],
                            { autoAlpha: 1, y: 0, duration: 0.25 },
                            "-=0.2",
                        )
                        .to(aboutActivity.current, { autoAlpha: 1, y: 0, duration: 0.25 }, "-=0.15")
                        .to(aboutFooter.current, { autoAlpha: 1, y: 0, duration: 0.2 }, "-=0.12");

                    // Services: sticky slide-in from below, same technique.
                    const servicesSlide = gsap.timeline({
                        defaults: { ease: "none" },
                        scrollTrigger: {
                            trigger: servicesWrap.current,
                            start: "top top",
                            end: "bottom top",
                            scrub: 0.5,
                            invalidateOnRefresh: true,
                        },
                    });

                    servicesSlide.to(services.current, { yPercent: 0, duration: 1, ease: "power2.out" });

                    return () => {
                        split.revert();
                        intro.kill();
                        heroTimeline.kill();
                        aboutSlide.kill();
                        servicesSlide.kill();
                    };
                },
            );

            return () => media.revert();
        },
        { scope: root },
    );

    return (
        <main ref={root} className="site-shell">
            <header ref={header} className="site-nav">
                <a className="brand" href="/" aria-label="Tiago Oliveira — home">
                    <span className="brand-mark">TO</span>
                    <span className="brand-name">Tiago Oliveira</span>
                </a>

                <nav className="main-nav" aria-label="Primary navigation">
                    <a href="#about">About</a>
                    <a href="#services">What I do</a>
                    <a href="/projects">Projects</a>
                    <a href="#contact">Contact</a>
                    <a className="portal-link" href="/portal">
                        <span aria-hidden="true">↗</span>
                        Portal
                    </a>
                </nav>
            </header>

            <section ref={hero} className="hero hero-scroll" aria-labelledby="hero-title">
                <div className="hero-background" aria-hidden="true">
                    <div ref={heroVisual} className="hero-visual">
                        <span className="hero-radar-sweep" />
                        <span className="hero-orbit hero-orbit-one" />
                        <span className="hero-orbit hero-orbit-two" />
                        <span className="hero-orbit hero-orbit-three" />

                        <span className="hero-radar-node hero-radar-node-1" />
                        <span className="hero-radar-node hero-radar-node-2" />
                        <span className="hero-radar-node hero-radar-node-3" />

                        <div ref={visualCore} className="hero-core">
                            <span>TO</span>
                        </div>
                    </div>
                </div>

                <div className="hero-progress" aria-live="polite">
                    <span ref={progressCurrent}>01</span>
                    <span className="hero-progress-track">
            <span ref={progressBar} className="hero-progress-fill" />
          </span>
                    <span>05</span>
                </div>

                <div className="hero-content">
                    <p ref={heroEyebrow} className="hero-eyebrow">
                        Software development <span>·</span> Portugal
                    </p>

                    <h1 ref={heroTitle} id="hero-title" className="hero-title">
                        <span ref={titleCopy}>Hi, I&apos;m Tiago and I build</span>{" "}
                        <span ref={systemsWord} className="hero-systems-word">
              digital solutions
            </span>{" "}
                        <span className="hero-title-ending">users love and businesses value.</span>
                    </h1>
                </div>

                <div ref={heroFooter} className="hero-footer">
                    <p className="hero-description">
                        Web applications, booking platforms, support portals and real-time systems built
                        around actual operational needs.
                    </p>

                    <div className="hero-stage">
                        <span className="hero-stage-prefix">Current stage</span>
                        <span ref={stageLabel}>Introduction</span>
                    </div>

                    <a className="scroll-cue" href="#about">
                        <span>Meet me</span>
                        <span className="scroll-arrow" aria-hidden="true">
              ↓
            </span>
                    </a>
                </div>
            </section>

            <div ref={aboutWrap} className="panel-wrap">
                <section ref={about} id="about" className="panel-sticky about-section" aria-labelledby="about-title">
                    <div className="section-header">
                        <p className="section-kicker">02 / About me</p>
                        <div className="section-progress" aria-hidden="true">
                            <span>02</span>
                            <span className="section-progress-track">
                <span className="section-progress-fill section-progress-static" />
              </span>
                            <span>05</span>
                        </div>
                    </div>

                    <div className="about-body">
                        <div className="about-top">
                            <h2 ref={aboutTitle} id="about-title">
                                Code comes second. First, I bridge the gap between human needs and
                                business goals.
                            </h2>

                            <p ref={aboutCopy} className="about-copy">
                                I&apos;m Tiago Oliveira, a full-stack developer based in Portugal. I combine
                                product thinking, interface design and engineering to turn complex workflows
                                into practical digital experiences.
                            </p>
                        </div>

                        <div ref={aboutActivity} className="about-activity">
                            <span className="last-activity-label">Last activity</span>

                            <ul className="last-activity-list">
                                <li>
                                    <span className="last-activity-meta">Work</span>
                                    <span>Building booking and support systems with real operational data.</span>
                                </li>
                                <li>
                                    <span className="last-activity-meta">Study</span>
                                    <span>Informatics and Computer Engineering student at FEUP.</span>
                                </li>
                                <li>
                                    <span className="last-activity-meta">Side</span>
                                    <span>Experimenting with home automation and transport projects.</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div ref={aboutFooter} className="section-footer">
                        <p className="section-footer-copy">Always building something on the side.</p>

                        <div className="section-footer-meta">
                            <span>Based in</span>
                            <span>Viana do Castelo, PT</span>
                        </div>

                        <a className="section-footer-link" href="#services">
                            <span>See what I do</span>
                            <span aria-hidden="true">↓</span>
                        </a>
                    </div>
                </section>
            </div>

            <div ref={servicesWrap} className="panel-wrap">
                <section ref={services} id="services" className="panel-sticky services-section">
                    <div className="section-header">
                        <p className="section-kicker">03 / What I do</p>
                        <div className="section-progress" aria-hidden="true">
                            <span>03</span>
                            <span className="section-progress-track">
                <span className="section-progress-fill section-progress-static" />
              </span>
                            <span>05</span>
                        </div>
                    </div>

                    <div className="about-body">
                        <div className="about-top">
                            <h2>Products, systems and interfaces made for real work.</h2>
                        </div>
                    </div>
                </section>
            </div>

            <section id="contact" className="content-section contact-section">
                <div className="section-header">
                    <p className="section-kicker">04 / Contact</p>
                    <div className="section-progress" aria-hidden="true">
                        <span>04</span>
                        <span className="section-progress-track">
              <span className="section-progress-fill section-progress-static" />
            </span>
                        <span>05</span>
                    </div>
                </div>

                <div className="about-body">
                    <div className="about-top">
                        <h2>Have a difficult product problem worth solving?</h2>
                    </div>
                </div>
            </section>
        </main>
    );
}