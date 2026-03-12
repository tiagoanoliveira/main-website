// app/routes/cv.tsx
import { Link } from "react-router";
import { Briefcase, GraduationCap, Heart, Award, Globe, Code } from "lucide-react";

const cv = {
    name: "Tiago Oliveira",
    tagline: "Engenheiro Informático · Porto",
    about: `Focado na ajuda ao próximo, com preferência por trabalhos onde o impacto no cliente é visível e direto. Forte compromisso com o voluntariado e a comunidade. Fundador e Presidente da Associação Juvenil Easy Future desde 2020.`,

    experience: [
        {
            role: "Websites com 🤍 — Fundador & Dev",
            org: "Projeto pessoal de desenvolvimento web com impacto social",
            period: "2020 — presente",
            bullets: [
                "Desenvolvimento de websites a custo nulo para estabelecimentos e organizações centradas no cliente, bem-estar e serviço de qualidade (em detrimento do lucro)",
                "Custo nulo também para ONGs, Associações Juvenis e projetos com princípios alinhados com os meus valores",
                "Custo reduzido para qualquer outro cliente que necessite de um website, software ou produto digital na minha área de atuação",
                "Integração com serviços pré-existentes, adaptação às necessidades reais de cada negócio e desenvolvimento de identidades digitais",
            ],
        },
        {
            role: "Fundador & Presidente",
            org: "Associação Juvenil Easy Future",
            period: "2020 — presente",
            bullets: ["Presidente da direção", "Gestor de Recursos Humanos"],
        },
        {
            role: "Operador de Loja",
            org: "Sonae (Continente)",
            period: "2022 & ago 2023 — ago 2024",
            bullets: ["Linha de caixas, entregas ao domicílio, apoio no setor alimentar"],
        },
        {
            role: "Operador de Loja",
            org: "Pingo Doce",
            period: "out 2022 — ago 2023",
            bullets: ["Reposição (setor alimentar e frescos), apoio às caixas, formação de novos colegas"],
        },
        {
            role: "Gestor de Negócios",
            org: "Setor Interativo (NOS)",
            period: "2021",
            bullets: ["Gestão de clientes da operadora NOS", "Renegociação de contratos"],
        },
        {
            role: "Apoio Técnico",
            org: "MegaBarcelos",
            period: "2019",
            bullets: ["Assistência técnica ao cliente", "Manutenção e reparação informática", "Apoio na assistência ao domicílio"],
        },
    ],

    education: [
        {
            degree: "Licenciatura em Engenharia Informática e Computação",
            school: "Faculdade de Engenharia da Universidade do Porto (FEUP)",
            period: "2023 — 2026",
            bullets: [],
        },
        {
            degree: "Ensino Secundário — Ciências e Tecnologias (19 valores)",
            school: "Escola Secundária Alcaides de Faria",
            period: "2017 — 2020",
            bullets: [
                "Presença assídua no quadro de excelência e valor",
                "Vogal na Lista S candidata à AE-ESAF",
                "Organização de eventos recreativos e educativos",
                "Ator na peça de teatro \"Farsa de Inês Pereira Séc.XXI\"",
                "Participação no concurso \"Miúdos a Votos\" com o livro vencedor",
            ],
        },
    ],

    volunteering: [
        {
            org: "Federação Portuguesa de Futebol",
            period: "set 2022 — presente",
            desc: "Voluntário assíduo em jogos da Seleção Nacional Masculina e Feminina (Liga das Nações, qualificações para Mundiais e Europeus) nas áreas de hospitalidade, apoio ao adepto e bilheteira. Colaboração em simulacro médico com a equipa médica da seleção (UEFA Nations League, nov 2024).",
        },
        {
            org: "Associação Juvenil Easy Future",
            period: "2020 — presente",
            desc: "Fundador, Presidente da direção e Gestor de Recursos Humanos.",
        },
        {
            org: "Liga Portuguesa Contra o Cancro",
            period: "Pontual",
            desc: "Recolha de fundos para apoio ao doente oncológico e família, promoção da saúde e prevenção do cancro.",
        },
        {
            org: "Associação SOPRO",
            period: "Maio 2019",
            desc: "Voluntário em resposta a desastres climáticos e assistência humanitária.",
        },
    ],

    awards: [
        {
            title: "Bolsa de Mérito Huawei & Associação .PT",
            detail: "5.000 € — Abril 2022",
        },
    ],

    events: [
        "Jornadas de Química — Escola de Ciências da Universidade do Minho (Maio 2019)",
        "15ª Escola de Verão de Física — Universidade do Porto (Setembro 2019)",
        "Masterclasses Internacionais em Física de Partículas — U. Minho (Fevereiro 2020)",
    ],

    languages: [
        { lang: "Português", level: 5 },
        { lang: "Inglês",    level: 4 },
        { lang: "Francês",   level: 4 },
    ],

    skills: {
        tech: ["Java", "Python", "C", "C++", "HTML", "CSS", "JavaScript", "TypeScript", "React", "Tailwind CSS", "Cloudflare Workers", "D1", "R2"],
        soft: ["Comunicação", "Trabalho em equipa", "Resiliência", "Organização"],
    },
};

export const meta = () => [
    { title: "CV | Tiago Oliveira" },
    { name: "description", content: "Currículo de Tiago Oliveira — Engenheiro Informático, voluntário e fundador da Associação Juvenil Easy Future." },
];

export default function CV() {
    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 px-4 pb-20 pt-8">
            <div className="max-w-4xl mx-auto">

                {/* Voltar */}
                <Link to="/" className="text-sm text-gray-400 hover:text-blue-600 transition-colors">
                    ← Voltar
                </Link>

                {/* ── Header ── */}
                <div className="mt-8 mb-12 flex items-center gap-5">
                    <img
                        src="/profile.jpg"
                        alt="Tiago Oliveira"
                        className="w-20 h-20 rounded-2xl object-cover ring-2 ring-blue-100 dark:ring-blue-900 shadow-lg flex-shrink-0"
                    />
                    <div>
                        <h1 className="text-3xl font-bold">{cv.name}</h1>
                        <p className="text-gray-500 mt-1">{cv.tagline}</p>
                        <div className="flex gap-3 mt-2">
                            <a
                                href="https://www.linkedin.com/in/tiagoanoliveira/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                            >
                                LinkedIn
                            </a>
                            <a href="mailto:tiagoalexneiva@gmail.com" className="text-xs text-blue-600 hover:underline">
                                Email
                            </a>
                        </div>
                    </div>
                </div>

                <div className="space-y-12">

                    {/* Sobre */}
                    <section>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{cv.about}</p>
                    </section>

                    {/* Experiência */}
                    <CVSection icon={<Briefcase size={18} />} title="Experiência Profissional">
                        {cv.experience.map((e) => (
                            <TimelineItem key={e.org + e.period} title={e.role} sub={e.org} period={e.period} bullets={e.bullets} />
                        ))}
                    </CVSection>

                    {/* Educação */}
                    <CVSection icon={<GraduationCap size={18} />} title="Educação">
                        {cv.education.map((e) => (
                            <TimelineItem key={e.school} title={e.degree} sub={e.school} period={e.period} bullets={e.bullets} />
                        ))}
                    </CVSection>

                    {/* Voluntariado */}
                    <CVSection icon={<Heart size={18} />} title="Voluntariado">
                        {cv.volunteering.map((v) => (
                            <TimelineItem key={v.org} title={v.org} sub={v.desc} period={v.period} />
                        ))}
                    </CVSection>

                    {/* Prémios & Eventos */}
                    <CVSection icon={<Award size={18} />} title="Prémios & Reconhecimentos">
                        {cv.awards.map((a) => (
                            <div key={a.title} className="flex items-start gap-3">
                                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                                <div>
                                    <p className="font-medium text-sm">{a.title}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{a.detail}</p>
                                </div>
                            </div>
                        ))}
                        <div className="mt-4 space-y-2">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-widest">Outros eventos</p>
                            {cv.events.map((ev) => (
                                <div key={ev} className="flex items-center gap-3 text-sm text-gray-500">
                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
                                    {ev}
                                </div>
                            ))}
                        </div>
                    </CVSection>

                    {/* Competências técnicas */}
                    <CVSection icon={<Code size={18} />} title="Competências Técnicas">
                        <div className="flex flex-wrap gap-2">
                            {cv.skills.tech.map((s) => (
                                <span key={s} className="px-3 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg">
                                    {s}
                                </span>
                            ))}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {cv.skills.soft.map((s) => (
                                <span key={s} className="px-3 py-1 text-xs bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-lg">
                                    {s}
                                </span>
                            ))}
                        </div>
                    </CVSection>

                    {/* Idiomas */}
                    <CVSection icon={<Globe size={18} />} title="Idiomas">
                        <div className="space-y-3">
                            {cv.languages.map((l) => (
                                <div key={l.lang} className="flex items-center gap-4">
                                    <span className="w-24 text-sm text-gray-600 dark:text-gray-400">{l.lang}</span>
                                    <div className="flex gap-1">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className={`h-2 w-6 rounded-full ${
                                                    i < l.level ? "bg-blue-500" : "bg-gray-200 dark:bg-gray-700"
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CVSection>

                </div>
            </div>
        </div>
    );
}

// ── Componentes auxiliares ──────────────────────────────────────

function CVSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <section>
            <h2 className="flex items-center gap-2 text-lg font-bold mb-5 pb-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-blue-600">{icon}</span>
                {title}
            </h2>
            <div className="space-y-5">{children}</div>
        </section>
    );
}

function TimelineItem({
    title, sub, period, bullets,
}: {
    title: string; sub: string; period: string; bullets?: string[];
}) {
    return (
        <div className="flex gap-4">
            <div className="flex flex-col items-center pt-1">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                <div className="w-px flex-1 bg-gray-100 dark:bg-gray-800 mt-1" />
            </div>
            <div className="pb-4">
                <div className="flex flex-wrap items-baseline gap-2">
                    <p className="font-semibold text-sm">{title}</p>
                    <span className="text-xs text-gray-400">{period}</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>
                {bullets && bullets.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5">
                        {bullets.map((b) => (
                            <li key={b} className="text-xs text-gray-400 flex gap-1.5">
                                <span>—</span>{b}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
