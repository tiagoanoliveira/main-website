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
    const hero = useRef<HTMLElement>(null);
    const heroTitle = useRef<HTMLHeadingElement>(null);
    const titleCopy = useRef<HTMLSpanElement>(null);
    const systemsWord = useRef<HTMLSpanElement>(null);
    const heroVisual = useRef<HTMLDivElement>(null);
    const visualCore = useRef<HTMLDivElement>(null);
    const heroEyebrow = useRef<HTMLParagraphElement>(null);
    const heroFooter = useRef<HTMLDivElement>(null);
    const header = useRef<HTMLElement>(null);
    const progressCurrent = useRef<HTMLSpanElement>(null);
    const progressBar = useRef<HTMLSpanElement>(null);
    const stageLabel = useRef<HTMLSpanElement>(null);

    const about = useRef<HTMLElement>(null);
    const aboutEyebrow = useRef<HTMLParagraphElement>(null);
    const aboutTitle = useRef<HTMLHeadingElement>(null);
    const aboutCopy = useRef<HTMLParagraphElement>(null);
    const aboutFooter = useRef<HTMLDivElement>(null);
    const aboutProgress = useRef<HTMLSpanElement>(null);

    useGSAP(
        () => {
            if (
                !hero.current ||
                !heroTitle.current ||
                !titleCopy.current ||
                !systemsWord.current ||
                !heroVisual.current ||
                !visualCore.current ||
                !about.current
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
                                heroEyebrow.current,
                                heroFooter.current,
                                heroTitle.current,
                                systemsWord.current,
                                aboutEyebrow.current,
                                aboutTitle.current,
                                aboutCopy.current,
                                aboutFooter.current,
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

                    gsap.set(
                        [
                            heroEyebrow.current,
                            heroFooter.current,
                            progressCurrent.current,
                            progressBar.current,
                        ],
                        {
                            autoAlpha: 0,
                            y: 18,
                        },
                    );

                    gsap.set(systemsWord.current, {
                        transformOrigin: "50% 52%",
                        willChange: "transform, opacity",
                    });

                    gsap.set(heroVisual.current, {
                        autoAlpha: 0,
                        scale: 0.72,
                        rotate: -18,
                    });

                    gsap.set(visualCore.current, {
                        scale: 0,
                    });

                    gsap.set(
                        [
                            aboutEyebrow.current,
                            aboutTitle.current,
                            aboutCopy.current,
                            aboutFooter.current,
                        ],
                        {
                            autoAlpha: 0,
                            y: 38,
                        },
                    );

                    const intro = gsap.timeline({
                        defaults: {
                            ease: "power3.out",
                        },
                    });

                    intro
                        .from(header.current, {
                            autoAlpha: 0,
                            y: -14,
                            duration: 0.65,
                        })
                        .to(
                            heroEyebrow.current,
                            {
                                autoAlpha: 1,
                                y: 0,
                                duration: 0.6,
                            },
                            "-=0.32",
                        )
                        .to(
                            heroVisual.current,
                            {
                                autoAlpha: 1,
                                scale: 1,
                                rotate: -5,
                                duration: 1.1,
                                ease: "power4.out",
                            },
                            "-=0.45",
                        )
                        .to(
                            visualCore.current,
                            {
                                scale: 1,
                                duration: 0.85,
                                ease: "back.out(1.8)",
                            },
                            "-=0.72",
                        )
                        .from(
                            words,
                            {
                                yPercent: 115,
                                rotateX: -80,
                                opacity: 0,
                                duration: 0.95,
                                stagger: {
                                    amount: 0.48,
                                    from: "start",
                                },
                                ease: "power4.out",
                            },
                            "-=0.72",
                        )
                        .from(
                            systemsWord.current,
                            {
                                yPercent: 115,
                                rotateX: -80,
                                opacity: 0,
                                duration: 0.9,
                                ease: "power4.out",
                            },
                            "-=0.78",
                        )
                        .to(
                            heroFooter.current,
                            {
                                autoAlpha: 1,
                                y: 0,
                                duration: 0.6,
                            },
                            "-=0.58",
                        )
                        .to(
                            [progressCurrent.current, progressBar.current],
                            {
                                autoAlpha: 1,
                                y: 0,
                                duration: 0.45,
                            },
                            "-=0.42",
                        );

                    const heroTimeline = gsap.timeline({
                        defaults: {
                            ease: "none",
                        },
                        scrollTrigger: {
                            trigger: hero.current,
                            start: "top top",
                            end: desktop ? "+=270%" : "+=220%",
                            pin: true,
                            pinSpacing: true,
                            scrub: 0.65,
                            anticipatePin: 1,
                            invalidateOnRefresh: true,
                            onUpdate: (self) => {
                                const section = Math.min(
                                    2,
                                    Math.max(1, Math.ceil(self.progress * 2)),
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
                                        `${Math.round(self.progress * 100)}%`,
                                    );
                                }

                                if (stageLabel.current) {
                                    stageLabel.current.textContent =
                                        self.progress < 0.42 ? "Introduction" : "About me";
                                }
                            },
                        },
                    });

                    heroTimeline
                        .addLabel("departure", 0)
                        .to(
                            heroEyebrow.current,
                            {
                                xPercent: -115,
                                autoAlpha: 0,
                            },
                            "departure",
                        )
                        .to(
                            heroFooter.current,
                            {
                                yPercent: 140,
                                autoAlpha: 0,
                            },
                            "departure",
                        )
                        .to(
                            heroVisual.current,
                            {
                                rotate: 55,
                                scale: 1.2,
                                autoAlpha: 0.5,
                            },
                            "departure",
                        )
                        .addLabel("split", 0.14)
                        .to(
                            words,
                            {
                                x: (index) =>
                                    (index % 2 === 0 ? -1 : 1) *
                                    gsap.utils.mapRange(0, words.length - 1, 55, 250, index),
                                y: (index) =>
                                    gsap.utils.mapRange(0, words.length - 1, -130, 185, index),
                                rotate: (index) =>
                                    gsap.utils.mapRange(
                                        0,
                                        words.length - 1,
                                        -14,
                                        17,
                                        index,
                                    ),
                                scale: (index) =>
                                    gsap.utils.mapRange(
                                        0,
                                        words.length - 1,
                                        0.84,
                                        1.14,
                                        index,
                                    ),
                                opacity: 0,
                                filter: "blur(10px)",
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
                                x: "random(-38, 38)",
                                y: "random(-68, 68)",
                                rotate: "random(-28, 28)",
                                stagger: {
                                    each: 0.002,
                                    from: "random",
                                },
                            },
                            "split",
                        )
                        .addLabel("systems-focus", 0.4)
                        .to(
                            heroVisual.current,
                            {
                                rotate: 180,
                                scale: 1.72,
                                autoAlpha: 0.18,
                            },
                            "systems-focus",
                        )
                        .to(
                            visualCore.current,
                            {
                                scale: 2.25,
                            },
                            "systems-focus",
                        )
                        .to(
                            systemsWord.current,
                            {
                                scale: desktop ? 4.1 : 2.1,
                                xPercent: desktop ? -15 : 0,
                                yPercent: desktop ? -18 : -35,
                                letterSpacing: "-0.075em",
                                duration: 0.25,
                                ease: "power2.inOut",
                            },
                            "systems-focus",
                        )
                        .to(
                            heroTitle.current,
                            {
                                color: "#f0eee7",
                            },
                            "systems-focus+=0.05",
                        )
                        .addLabel("handoff", 0.7)
                        .to(
                            systemsWord.current,
                            {
                                scale: desktop ? 7.5 : 3.25,
                                xPercent: desktop ? -12 : 0,
                                yPercent: desktop ? -22 : -40,
                                autoAlpha: 0,
                            },
                            "handoff",
                        )
                        .to(
                            heroVisual.current,
                            {
                                scale: 2.4,
                                autoAlpha: 0,
                            },
                            "handoff",
                        )
                        .to(
                            hero.current,
                            {
                                backgroundColor: "#1c211c",
                            },
                            "handoff",
                        );

                    const aboutTimeline = gsap.timeline({
                        defaults: {
                            ease: "power3.out",
                        },
                        scrollTrigger: {
                            trigger: about.current,
                            start: "top 74%",
                            end: "top 25%",
                            scrub: 0.8,
                            invalidateOnRefresh: true,
                            onUpdate: (self) => {
                                if (aboutProgress.current) {
                                    aboutProgress.current.style.setProperty(
                                        "--progress",
                                        `${Math.round(self.progress * 100)}%`,
                                    );
                                }
                            },
                        },
                    });

                    aboutTimeline
                        .to(aboutEyebrow.current, {
                            autoAlpha: 1,
                            y: 0,
                            duration: 0.35,
                        })
                        .to(
                            aboutTitle.current,
                            {
                                autoAlpha: 1,
                                y: 0,
                                duration: 0.45,
                            },
                            "-=0.16",
                        )
                        .to(
                            aboutCopy.current,
                            {
                                autoAlpha: 1,
                                y: 0,
                                duration: 0.35,
                            },
                            "-=0.18",
                        )
                        .to(
                            aboutFooter.current,
                            {
                                autoAlpha: 1,
                                y: 0,
                                duration: 0.35,
                            },
                            "-=0.2",
                        );

                    return () => {
                        split.revert();
                        intro.kill();
                        heroTimeline.kill();
                        aboutTimeline.kill();
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
                    <div ref={heroVisual} className="hero-visual">
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
            <span ref={titleCopy}>
              I build digital products and
            </span>{" "}
                        <span ref={systemsWord} className="hero-systems-word">
              digital systems
            </span>{" "}
                        <span className="hero-title-ending">people enjoy using.</span>
                    </h1>
                </div>

                <div ref={heroFooter} className="hero-footer">
                    <p className="hero-description">
                        Web applications, booking platforms, support portals and real-time
                        systems built around actual operational needs.
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

            <section
                ref={about}
                id="about"
                className="content-section about-section"
                aria-labelledby="about-title"
            >
                <div className="section-header">
                    <p ref={aboutEyebrow} className="section-kicker">
                        02 / About me
                    </p>

                    <div className="section-progress" aria-hidden="true">
                        <span>02</span>
                        <span className="section-progress-track">
              <span ref={aboutProgress} className="section-progress-fill" />
            </span>
                        <span>05</span>
                    </div>
                </div>

                <div className="about-content">
                    <h2 ref={aboutTitle} id="about-title">
                        Code comes second. First, I bridge the gap between human needs and
                        business goals.
                    </h2>

                    <p ref={aboutCopy} className="about-copy">
                        I&apos;m Tiago Oliveira, a full-stack developer based in Portugal.
                        I combine product thinking, interface design and engineering to
                        turn complex workflows into practical digital experiences.
                    </p>
                </div>

                <div ref={aboutFooter} className="section-footer">
                    <p className="section-footer-copy">
                        I care about the detail behind a good product: clear flows,
                        reliable systems and software that stays useful after launch.
                    </p>

                    <div className="section-footer-meta">
                        <span>Based in</span>
                        <span>Viana do Castelo, PT</span>
                    </div>

                    <a className="section-footer-link" href="#services">
                        <span>What I do next</span>
                        <span aria-hidden="true">↓</span>
                    </a>
                </div>
            </section>

            <section id="services" className="content-section services-section">
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

                <div className="about-content">
                    <h2>Products, systems and interfaces made for real work.</h2>
                </div>
            </section>

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

                <div className="about-content">
                    <h2>Have a difficult product problem worth solving?</h2>
                </div>
            </section>
        </main>
    );
}