import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => [
  { title: "Tiago Oliveira — Técnico de Informática" },
  { name: "description", content: "Desenvolvimento de websites e soluções informáticas." },
];

export default function Home() {
  return (
      <div>
        {/* HERO */}
        <section className="min-h-[90vh] flex items-center justify-center px-4">
          <div className="text-center max-w-2xl">
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-4 uppercase tracking-widest">
              Técnico de Informática
            </p>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Tiago Oliveira
            </h1>
            <p className="text-lg text-gray-500 dark:text-gray-400 mb-8">
              Criação de websites, manutenção de sistemas e suporte técnico.
              Baseado em Porto, Portugal.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                  href="#portfolio"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Ver Portfólio
              </a>
              <a
                  href="#contacto"
                  className="px-6 py-3 border border-gray-300 dark:border-gray-700 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                Contactar
              </a>
            </div>
          </div>
        </section>

        {/* SOBRE */}
        <section id="sobre" className="py-24 px-4 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8">Sobre mim</h2>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  {/* Preenche com o teu texto */}
                  Técnico de informática com experiência em desenvolvimento web,
                  suporte técnico e gestão de sistemas.
                </p>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Especializado em criar soluções digitais para pequenas e médias empresas.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Anos de experiência", value: "5+" },
                  { label: "Websites criados", value: "20+" },
                  { label: "Clientes ativos", value: "10+" },
                  { label: "Disponibilidade", value: "Porto" },
                ].map((stat) => (
                    <div
                        key={stat.label}
                        className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
                    >
                      <p className="text-2xl font-bold text-blue-600">{stat.value}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{stat.label}</p>
                    </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* PORTFOLIO */}
        <section id="portfolio" className="py-24 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-12">Portfólio</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Vais substituir por projetos reais */}
              {[
                { name: "Barbearia Brooklyn", url: "#", desc: "Website para barbearia" },
                { name: "Projeto 2", url: "#", desc: "Descrição do projeto" },
                { name: "Projeto 3", url: "#", desc: "Descrição do projeto" },
              ].map((project) => (
                  <a
                      key={project.name}
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group p-6 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                  >
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">
                    {project.name[0]}
                  </span>
                    </div>
                    <h3 className="font-semibold mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{project.desc}</p>
                  </a>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACTO */}
        <section id="contacto" className="py-24 px-4 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Contacto</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              Tens um projeto em mente? Fala comigo.
            </p>
            <a
                href="mailto:teu@email.com"
                className="inline-block px-8 py-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-lg"
            >
              teu@email.com
            </a>
          </div>
        </section>
      </div>
  );
}
