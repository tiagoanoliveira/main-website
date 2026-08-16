// app/components/ui/HomeScene.tsx
import { forwardRef, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowRight, Server, Cable, Home as HomeIcon, MonitorSmartphone } from "lucide-react";

let isScrollTriggerRegistered = false;
if (typeof window !== "undefined" && !isScrollTriggerRegistered) {
  gsap.registerPlugin(ScrollTrigger);
  isScrollTriggerRegistered = true;
}

type HomeSceneProps = {
  onSectionChange?: (sectionId: string) => void;
};

export const HomeScene = forwardRef<HTMLDivElement, HomeSceneProps>(function HomeScene(
  { onSectionChange },
  forwardedRef
) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;

      const mm = gsap.matchMedia();

      mm.add("(min-width: 768px)", () => {
        const scenes = gsap.utils.toArray<HTMLElement>("[data-scene]");

        gsap.set(scenes, {
          autoAlpha: (index) => (index === 0 ? 1 : 0.18),
          scale: (index) => (index === 0 ? 1 : 0.96),
          y: 0,
          willChange: "opacity, transform",
        });

        onSectionChange?.("cockpit");

        const tl = gsap.timeline({
          defaults: { duration: 0.8, ease: "sine.inOut" },
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top top+=12",
            end: "+=1400",
            scrub: 0.85,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        tl.to("[data-scene='cockpit']", {
          autoAlpha: 0.24,
          scale: 0.95,
          y: -4,
          onStart: () => onSectionChange?.("booking"),
        })
          .to(
            "[data-scene='booking']",
            {
              autoAlpha: 1,
              scale: 1,
              y: 0,
            },
            "<"
          )
          .to("[data-scene='booking']", {
            autoAlpha: 0.2,
            scale: 0.95,
            y: -4,
            onStart: () => onSectionChange?.("domotics"),
          })
          .to(
            "[data-scene='domotics']",
            {
              autoAlpha: 1,
              scale: 1,
              y: 0,
            },
            "<"
          );
      });

      mm.add("(max-width: 767px)", () => {
        gsap.set("[data-scene]", { clearProps: "all" });
      });

      return () => mm.revert();
    },
    { scope: containerRef, dependencies: [onSectionChange] }
  );

  return (
    <div
      ref={(node) => {
        containerRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      }}
      className="relative h-auto md:h-[200vh] bg-slate-950 text-slate-100 flex items-center justify-center overflow-hidden"
    >
      <div
        className="absolute inset-0 opacity-[0.1]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 0 0, rgba(56,189,248,.35), transparent 55%), radial-gradient(circle at 100% 100%, rgba(129,140,248,.35), transparent 55%)",
        }}
      />

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 py-8 md:py-0">
        <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start md:items-center">
          <div className="order-1 md:order-1 md:w-[30%] space-y-6">
            <p className="text-xs font-semibold tracking-[0.3em] uppercase text-slate-400">Soluções técnicas em foco</p>
            <h2 className="text-2xl md:text-3xl font-semibold text-slate-50">
              Cada scroll aproxima-te de um tipo de solução diferente.
            </h2>
            <p className="text-sm text-slate-400">
              Do cockpit de suporte técnico aos sistemas de reservas e centrais de domótica, o foco muda para
              representar o tipo de software que posso construir para o teu negócio.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge icon={MonitorSmartphone}>Websites & Portais</Badge>
              <Badge icon={Server}>Integrações & APIs</Badge>
              <Badge icon={HomeIcon}>Domótica & automação</Badge>
            </div>
          </div>

          <div className="order-2 md:flex-1 w-full">
            <div className="md:hidden space-y-3">
              <MobileSceneCard title="Cockpit técnico">
                <CockpitSceneBody />
              </MobileSceneCard>
              <MobileSceneCard title="Reservas em tempo real">
                <BookingSceneBody />
              </MobileSceneCard>
              <MobileSceneCard title="Central de domótica">
                <DomoticsSceneBody />
              </MobileSceneCard>
            </div>

            <div className="hidden md:block relative w-full aspect-[16/11] rounded-3xl bg-slate-900 border border-slate-700 shadow-[0_40px_80px_rgba(15,23,42,0.85)] overflow-hidden">
              <div className="absolute inset-0 grid grid-cols-3">
                <Scene sceneId="cockpit">
                  <CockpitSceneBody />
                </Scene>

                <Scene sceneId="booking">
                  <BookingSceneBody />
                </Scene>

                <Scene sceneId="domotics">
                  <DomoticsSceneBody />
                </Scene>
              </div>

              <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 text-xs text-slate-400 bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-transparent">
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Online
                </span>
                <span className="inline-flex items-center gap-1">
                  <Cable size={12} />
                  Full-stack · Cloudflare · APIs
                </span>
              </div>

              <div className="absolute bottom-0 left-0 right-0 px-4 py-3 flex items-center justify-between text-xs bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent">
                <span className="text-slate-400">Scroll para alternar o tipo de solução.</span>
                <a
                  href="#contacto"
                  className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Fala sobre o teu sistema
                  <ArrowRight size={12} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

type SceneProps = {
  children: React.ReactNode;
  sceneId: string;
};

const Scene = forwardRef<HTMLDivElement, SceneProps>(function Scene({ children, sceneId }, ref) {
  return (
    <div
      ref={ref}
      data-scene={sceneId}
      className="relative border-r border-slate-800/60 px-4 py-4 opacity-0 scale-[0.95]"
    >
      {children}
    </div>
  );
});

function CockpitSceneBody() {
  return (
    <div className="flex flex-col h-full justify-between">
      <header className="flex items-center justify-between text-xs text-slate-400">
        <span className="inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Suporte ativo
        </span>
        <span>Rede técnica</span>
      </header>
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between bg-slate-800/80 rounded-lg px-3 py-2">
          <span className="text-slate-300">Serviço em produção</span>
          <span className="text-xs text-emerald-400">99.98% uptime</span>
        </div>
        <p className="text-slate-400 text-xs">
          Monitorização, alertas e manutenção contínua de sistemas em produção — desde websites a backends críticos.
        </p>
      </div>
    </div>
  );
}

function BookingSceneBody() {
  return (
    <div className="flex flex-col h-full justify-between">
      <header className="flex items-center justify-between text-xs text-slate-400">
        <span className="inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          Reservas em tempo real
        </span>
        <span>Restaurantes · Barbearias</span>
      </header>
      <div className="space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <TicketCard label="Mesa #12" detail="20:00 · 2 pessoas" />
          <TicketCard label="Corte & barba" detail="18:30 · Cliente recorrente" />
        </div>
        <p className="text-slate-400 mt-2">
          Sistemas de reservas e gestão de agenda com notificações, sincronização de dados e relatórios.
        </p>
      </div>
    </div>
  );
}

function DomoticsSceneBody() {
  return (
    <div className="flex flex-col h-full justify-between">
      <header className="flex items-center justify-between text-xs text-slate-400">
        <span className="inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Central de domótica
        </span>
        <span>Casa & escritório</span>
      </header>
      <div className="space-y-3 text-xs">
        <div className="grid grid-cols-3 gap-2">
          <DomoticControl label="Luzes" value="58%" />
          <DomoticControl label="Temperatura" value="21ºC" />
          <DomoticControl label="Estores" value="Aberto" />
        </div>
        <p className="text-slate-400">
          Interfaces para controlar sistemas de domótica, sensores e automações — com integração a plataformas
          existentes.
        </p>
      </div>
    </div>
  );
}

function MobileSceneCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
      <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-slate-400">{title}</p>
      {children}
    </section>
  );
}

function Badge({ icon: Icon, children }: { icon: React.ComponentType<{ size?: number }>; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/60 border border-slate-700 text-xs text-slate-200">
      <Icon size={12} />
      {children}
    </span>
  );
}

function TicketCard({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 flex flex-col gap-1">
      <span className="text-slate-200 text-xs font-medium">{label}</span>
      <span className="text-slate-400 text-[11px]">{detail}</span>
    </div>
  );
}

function DomoticControl({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 flex flex-col gap-1">
      <span className="text-slate-200 text-xs font-medium">{label}</span>
      <span className="text-slate-400 text-[11px]">{value}</span>
    </div>
  );
}
