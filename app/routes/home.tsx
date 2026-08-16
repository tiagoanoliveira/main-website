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
            "Tiago Oliveira is a software developer building useful digital systems, products and web applications.",
    },
];

const heroTitle =
    "I build digital systems people enjoy using and businesses depend on.";

export default function Home() {
    const root = useRef<HTMLElement>(null);
    const hero = useRef<HTMLElement>(null);
    const title = useRef<HTMLHeadingElement>(null);
    const titleStage = useRef<HTMLDivElement>(null);
    const revealWord = useRef<HTMLSpanElement>(null);
    const visual = useRef<HTMLDivElement>(null);
    const visualCore = useRef<HTMLDivElement>(null);
    const eyebrow = useRef<HTMLParagraphElement>(null);
    const header = useRef<HTMLElement>(null);
    const footer = useRef<HTMLDivElement>(null);
    const progressCurrent = useRef<HTMLSpanElement>(null);
    const progressBar = useRef<HTMLSpanElement>(null);
    const stageLabel = useRef<HTMLSpanElement>(null);

    useGSAP(
        () => {
            if (
                !hero.current ||
                !title.current ||
                !titleStage.current ||
                !revealWord.current ||
                !visual.current ||
                !visualCore.current
            ) {
                return;
            }

            const media = gsap.matchMedia();

            media.add(
                {
                    desktop: "(min-width: 761px)",
                    mobile: "(max-width: 760px)",
                    reducedMotion: "(prefers-reduced-motion: reduce)",
                },
                (context) => {
                    const { desktop, reducedMotion } = context.conditions as {
                        desktop: boolean;
                        mobile: boolean;
                        reducedMotion: boolean;
                    };

                    if (reducedMotion) {
                        gsap.set(
                            [
                                header.current,
                                eyebrow.current,
                                footer.current,
                                title.current,
                                revealWord.current,
                            ],
                            {
                                autoAlpha: 1,
                            },
                        );

                        gsap.set(revealWord.current, {
                            yPercent: 0,
                            scale: 1,
                        });

                        return;
                    }

                    const split = SplitText.create(title.current, {
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
                                yPercent: 0,
                                rotateX: 0,
                                opacity: 1,
                                filter: "blur(0px)",
                            });
                        },
                    });

                    const words = split.words;
                    const chars = split.chars;

                    gsap.set(
                        [
                            header.current,
                            eyebrow.current,
                            footer.current,
                            progressCurrent.current,
                            progressBar.current,
                        ],
                        {
                            autoAlpha: 0,
                            y: 18,
                        },
                    );

                    gsap.set(revealWord.current, {
                        autoAlpha: 0,
                        yPercent: 45,
                        scale: 0.74,
                        rotate: -8,
                    });

                    gsap.set(visual.current, {
                        scale: 0.72,
                        rotate: -18,
                        autoAlpha: 0,
                    });

                    gsap.set(visualCore.current, {
                        scale: 0,
                    });

                    const intro = gsap.timeline({
                        defaults: {
                            ease: "power3.out",
                        },
                    });

                    intro
                        .to(header.current, {
                            autoAlpha: 1,
                            y: 0,
                            duration: 0.65,
                        })
                        .to(
                            eyebrow.current,
                            {
                                autoAlpha: 1,
                                y: 0,
                                duration: 0.6,
                            },
                            "-=0.35",
                        )
                        .to(
                            visual.current,
                            {
                                autoAlpha: 1,
                                scale: 1,
                                duration: 1.2,
                                ease: "power4.out",
                            },
                            "-=0.45",
                        )
                        .to(
                            visualCore.current,
                            {
                                scale: 1,
                                duration: 0.9,
                                ease: "back.out(1.8)",
                            },
                            "-=0.75",
                        )
                        .from(
                            words,
                            {
                                yPercent: 120,
                                rotateX: -85,
                                opacity: 0,
                                stagger: {
                                    amount: 0.6,
                                    from: "start",
                                },
                                duration: 1.05,
                                ease: "power4.out",
                            },
                            "-=0.75",
                        )
                        .to(
                            footer.current,
                            {
                                autoAlpha: 1,
                                y: 0,
                                duration: 0.6,
                            },
                            "-=0.75",
                        )
                        .to(
                            [progressCurrent.current, progressBar.current],
                            {
                                autoAlpha: 1,
                                y: 0,
                                duration: 0.5,
                            },
                            "-=0.4",
                        );

                    const scrollTimeline = gsap.timeline({
                        defaults: {
                            ease: "none",
                        },
                        scrollTrigger: {
                            trigger: hero.current,
                            start: "top top",
                            end: desktop ? "+=300%" : "+=220%",
                            pin: true,
                            pinSpacing: true,
                            scrub: 0.7,
                            anticipatePin: 1,
                            invalidateOnRefresh: true,
                            onUpdate: (self) => {
                                const progress = Math.round(self.progress * 100);
                                const section = Math.min(
                                    5,
                                    Math.max(1, Math.ceil(self.progress * 5)),
                                );

                                if (progressCurrent.current) {
                                    progressCurrent.current.textContent = String(section).padStart(
                                        2,
                                        "0",
                                    );
                                }

                                if (progressBar.current) {
                                    progressBar.current.style.setProperty(
                                        "--progress",
                                        `${progress}%`,
                                    );
                                }

                                if (stageLabel.current) {
                                    const labels = [
                                        "Introduction",
                                        "Discovery",
                                        "Systems",
                                        "Interaction",
                                        "Delivery",
                                    ];

                                    stageLabel.current.textContent =
                                        labels[Math.min(labels.length - 1, section - 1)];
                                }
                            },
                        },
                    });

                    scrollTimeline
                        .addLabel("intro", 0)
                        .to(
                            eyebrow.current,
                            {
                                xPercent: -120,
                                autoAlpha: 0,
                            },
                            "intro",
                        )
                        .to(
                            footer.current,
                            {
                                yPercent: 125,
                                autoAlpha: 0,
                            },
                            "intro",
                        )
                        .to(
                            header.current,
                            {
                                yPercent: -120,
                                autoAlpha: 0,
                            },
                            "intro",
                        )
                        .to(
                            visual.current,
                            {
                                scale: 1.1,
                                rotate: 10,
                            },
                            "intro",
                        )
                        .addLabel("split", 0.18)
                        .to(
                            words,
                            {
                                x: (index) =>
                                    (index % 2 === 0 ? -1 : 1) *
                                    gsap.utils.mapRange(0, words.length - 1, 50, 230, index),
                                y: (index) =>
                                    gsap.utils.mapRange(0, words.length - 1, -120, 180, index),
                                rotate: (index) =>
                                    gsap.utils.mapRange(
                                        0,
                                        words.length - 1,
                                        -11,
                                        14,
                                        index,
                                    ),
                                scale: (index) =>
                                    gsap.utils.mapRange(
                                        0,
                                        words.length - 1,
                                        0.92,
                                        1.18,
                                        index,
                                    ),
                                opacity: 0,
                                filter: "blur(9px)",
                                stagger: {
                                    each: 0.015,
                                    from: "center",
                                },
                            },
                            "split",
                        )
                        .to(
                            chars,
                            {
                                y: "random(-65, 65)",
                                x: "random(-35, 35)",
                                rotate: "random(-25, 25)",
                                stagger: {
                                    each: 0.003,
                                    from: "random",
                                },
                            },
                            "split",
                        )
                        .addLabel("systems", 0.42)
                        .to(
                            visual.current,
                            {
                                rotate: 145,
                                scale: 1.34,
                            },
                            "systems",
                        )
                        .to(
                            visualCore.current,
                            {
                                scale: 1.65,
                                duration: 0.18,
                            },
                            "systems",
                        )
                        .to(
                            revealWord.current,
                            {
                                autoAlpha: 1,
                                yPercent: 0,
                                scale: 1,
                                rotate: 0,
                                duration: 0.2,
                                ease: "power3.out",
                            },
                            "systems",
                        )
                        .to(
                            revealWord.current,
                            {
                                letterSpacing: "0.03em",
                                duration: 0.14,
                            },
                            "systems+=0.14",
                        )
                        .addLabel("detail", 0.66)
                        .to(
                            revealWord.current,
                            {
                                scale: 0.72,
                                yPercent: -65,
                                autoAlpha: 0,
                            },
                            "detail",
                        )
                        .to(
                            visual.current,
                            {
                                rotate: 250,
                                scale: 1.72,
                                xPercent: 20,
                                yPercent: -18,
                            },
                            "detail",
                        )
                        .to(
                            titleStage.current,
                            {
                                scale: 0.82,
                                autoAlpha: 0,
                                transformOrigin: "50% 50%",
                            },
                            "detail",
                        )
                        .addLabel("outro", 0.9)
                        .to(
                            visual.current,
                            {
                                autoAlpha: 0,
                                scale: 2.1,
                            },
                            "outro",
                        );

                    return () => {
                        split.revert();
                        intro.kill();
                        scrollTimeline.kill();
                    };
                },
            );

            return () => media.revert();
        },
        { scope: root },
    );

    return (
        <main ref={root} className="site-shell">
            <section ref={hero} className="hero hero-scroll" aria-labelledby="hero-title">
                <div className="hero-background" aria-hidden="true">
                    <div ref={visual} className="hero-visual">
                        <span className="hero-orbit hero-orbit-one" />
                        <span className="hero-orbit hero-orbit-two" />
                        <span className="hero-orbit hero-orbit-three" />
                        <span className="hero-orbit hero-orbit-four" />

                        <span className="hero-grid hero-grid-horizontal" />
                        <span className="hero-grid hero-grid-vertical" />

                        <span className="hero-dot hero-dot-one" />
                        <span className="hero-dot hero-dot-two" />
                        <span className="hero-dot hero-dot-three" />

                        <div ref={visualCore} className="hero-core">
                            <span>TO</span>
                        </div>
                    </div>
                </div>

                <header ref={header} className="site-header">
                    <a className="brand" href="/" aria-label="Tiago Oliveira — início">
                        <span className="brand-mark">TO</span>
                        <span className="brand-name">Tiago Oliveira</span>
                    </a>

                    <nav className="main-nav" aria-label="Navegação principal">
                        <a href="#about">Sobre</a>
                        <a href="#services">O que faço</a>
                        <a href="/projects">Projetos</a>
                        <a href="#contact">Contacto</a>
                        <a className="portal-link" href="/portal">
                            <span aria-hidden="true">↗</span>
                            Portal
                        </a>
                    </nav>
                </header>

                <div className="hero-progress" aria-live="polite">
                    <span ref={progressCurrent}>01</span>
                    <span className="hero-progress-track">
            <span ref={progressBar} className="hero-progress-fill" />
          </span>
                    <span>05</span>
                </div>

                <div ref={titleStage} className="hero-content">
                    <p ref={eyebrow} className="hero-eyebrow">
                        Software development <span>·</span> Portugal
                    </p>

                    <h1 ref={title} id="hero-title" className="hero-title">
                        {heroTitle}
                    </h1>
                </div>

                <div className="hero-reveal" aria-hidden="true">
          <span ref={revealWord} className="hero-reveal-word">
            SYSTEMS
          </span>
                </div>

                <div ref={footer} className="hero-footer">
                    <p className="hero-description">
                        From booking flows and support portals to real-time data systems,
                        I design technology that works in the real world.
                    </p>

                    <div className="hero-stage">
                        <span className="hero-stage-prefix">Current stage</span>
                        <span ref={stageLabel}>Introduction</span>
                    </div>

                    <a className="scroll-cue" href="#about">
                        <span>Explore my work</span>
                        <span className="scroll-arrow" aria-hidden="true">
              ↓
            </span>
                    </a>
                </div>
            </section>

            <section id="about" className="content-section content-section-light">
                <p className="section-kicker">02 / About</p>
                <h2>I turn difficult requirements into software people can trust.</h2>
                <p className="section-copy">
                    I work across product thinking, interface design and full-stack
                    development to create products that behave well beyond the happy path.
                </p>
            </section>

            <section id="services" className="content-section content-section-dark">
                <p className="section-kicker">03 / What I do</p>
                <h2>Web products, internal systems and connected experiences.</h2>
            </section>

            <section id="contact" className="content-section content-section-light">
                <p className="section-kicker">04 / Contact</p>
                <h2>Have a difficult product problem?</h2>
            </section>
        </main>
    );
}