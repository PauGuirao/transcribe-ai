"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  BrainCircuit,
  CheckCircle2,
  Clock3,
  FileAudio2,
  Headphones,
  Loader2,
  Sparkles,
  Mic,
  PenTool,
  BookOpen,
} from "lucide-react";

const features = [
  {
    title: "Notes clíniques en minuts",
    description:
      "Transcriu les sessions de logopèdia amb IA adaptada al català, a punt perquè hi afegeixis observacions i objectius.",
    icon: BrainCircuit,
  },
  {
    title: "Neteja intel·ligent",
    description:
      "Elimina crossos, repeticions i segments irrellevants automàticament per obtenir informes clars que puguis compartir amb les famílies.",
    icon: Sparkles,
  },
];

const workflow = [
  {
    title: "Enregistra la sessió",
    description:
      "Importa les gravacions de sessions individuals o grupals des de qualsevol dispositiu en segons.",
    icon: FileAudio2,
  },
  {
    title: "Analitza i anota",
    description:
      "Escolta mentre llegeixes, etiqueta fites del pla terapèutic i afegeix observacions clíniques des de l’editor.",
    icon: Headphones,
  },
  {
    title: "Comparteix avenços",
    description:
      "Exporta informes per a famílies, escoles o altres professionals i sincronitza el progrés de cada alumne.",
    icon: CheckCircle2,
  },
];

const quickActions = [
  {
    title: "Transcriure sessió",
    description:
      "Converteix l'àudio en text editable i llest per a l'informe clínic.",
    icon: Mic,
    href: "/transcribe",
  },
  {
    title: "Anotar intervenció",
    description:
      "Marca objectius, etiquetes i observacions mentre revises la sessió.",
    icon: PenTool,
    href: "/annotate",
  },
  {
    title: "Biblioteca",
    description:
      "Consulta historials, exporta informes i comparteix avenços amb el teu equip.",
    icon: BookOpen,
    href: "/library",
  },
];

const plans = [
  {
    key: "basic",
    name: "Bàsic",
    price: "5€",
    originalPrice: "9€",
    description: "Ideal per descobrir Transcriu en el teu dia a dia.",
    features: [
      "30 transcripcions al mes",
      `Models base d'IA optimitzats per a català i espanyol`,
      `Editor col·laboratiu`,
      "Suport estàndard",
    ],
    highlighted: false,
  },
  {
    key: "pro",
    name: "Pro",
    price: "9€",
    originalPrice: "19€",
    description:
      "Perfecte per a equips que treballen amb múltiples entrevistes.",
    features: [
      "120 transcripcions al mes",
      "Models avançats amb diarització",
      "Exportacions il·limitades (PDF, DOCX, TXT)",
      "Suport prioritari en menys de 2h",
    ],
    highlighted: true,
  },
  {
    key: "premium",
    name: "Premium",
    price: "19€",
    originalPrice: "29€",
    description: "Per a organitzacions que necessiten velocitat i control.",
    features: [
      "300 transcripcions al mes",
      "Models personalitzats i glossaris propis",
      "Integracions amb Slack, Notion i Drive",
      "Customer Success dedicat",
    ],
    highlighted: false,
  },
];

export default function Home() {
  const router = useRouter();
  const { user, loading, signInWithGoogle } = useAuth();
  const [authLoading, setAuthLoading] = useState(false);

  const handlePrimaryAction = async () => {
    if (loading || authLoading) return;

    if (user) {
      router.push("/dashboard");
      return;
    }

    setAuthLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Error iniciant sessió:", error);
      setAuthLoading(false);
    }
  };

  const handlePricingPlanClick = (planKey: string) => {
    if (loading) return;

    if (user) {
      router.push("/dashboard");
    } else {
      router.push("/auth/signin");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/40">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center space-x-2">
            <img src="/logo3.png" alt="TranscribeAI Logo" className="h-10" />
            <h1 className="text-2xl font-semibold text-gray-900">transcriu</h1>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Button variant="ghost" onClick={() => router.push("/dashboard")}>
                Anar al panell
              </Button>
            ) : (
              <Button asChild variant="ghost">
                <Link href="/auth/signin">Inicia sessió</Link>
              </Button>
            )}
            <Button
              onClick={handlePrimaryAction}
              disabled={authLoading || loading}
            >
              {authLoading || loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Preparant...
                </>
              ) : user ? (
                "Obrir Transcriu"
              ) : (
                "Comença gratis"
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 pb-24 pt-16">
        <section className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Clock3 className="h-4 w-4" />
              Documenta cada sessió sense perdre temps
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
                Transcriu, analitza i comparteix el progrés dels teus alumnes en
                qüestió de segons.
              </h1>
              <p className="text-lg text-muted-foreground">
                Transcriu t’ajuda a transformar l’àudio de les sessions en
                informes editables, a punt per planificar objectius, compartir
                amb les famílies i coordinar-te amb altres especialistes.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                size="lg"
                onClick={handlePrimaryAction}
                disabled={authLoading || loading}
              >
                {authLoading || loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Preparant l’experiència
                  </>
                ) : user ? (
                  "Anar al panell"
                ) : (
                  "Prova amb una sessió gratuïta"
                )}
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#caracteristicas">Veure característiques</Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div
              className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/20 blur-3xl"
              aria-hidden
            />
            <div
              className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-secondary/40 blur-3xl"
              aria-hidden
            />
            <div className="relative rounded-3xl border bg-card/80 p-6 shadow-xl shadow-primary/10 backdrop-blur">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Projecte
                  </p>
                  <h2 className="text-lg font-semibold">
                    Sessió d’articulació /r/
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Pla logopèdic
                </span>
              </div>
              <div className="mt-6 space-y-4">
                <div className="space-y-2 rounded-2xl bg-muted/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Resum
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Es va treballar la vibrant múltiple. L’alumne manté
                    l’objectiu amb suport visual i necessita reforçar la
                    respiració costo-diaphragmàtica.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-3 rounded-xl border p-3">
                    <div
                      className="mt-1 h-2 w-2 rounded-full bg-primary"
                      aria-hidden
                    />
                    <div>
                      <p className="text-sm font-medium">00:06:12</p>
                      <p className="text-sm text-muted-foreground">
                        Manté posició lingual /r/ amb mirall i esquema corporal.
                        Reforç positiu efectiu.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 rounded-xl border p-3">
                    <div
                      className="mt-1 h-2 w-2 rounded-full bg-primary"
                      aria-hidden
                    />
                    <div>
                      <p className="text-sm font-medium">00:12:45</p>
                      <p className="text-sm text-muted-foreground">
                        Es recomana tasca de lectures guiades a casa amb àudio
                        de referència.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-24 rounded-3xl bg-muted/40 px-6 py-10 sm:px-10">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Què necessites?
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">
              Tria l’eina per a la teva propera sessió
            </h2>
            <p className="mt-3 text-muted-foreground">
              Accedeix ràpidament als fluxos més utilitzats per logopedes i
              equips de suport.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="group flex flex-col gap-3 rounded-3xl border border-border/60 bg-card/90 p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <action.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {action.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {action.description}
                  </p>
                </div>
                <span className="mt-4 text-sm font-semibold text-primary group-hover:underline">
                  Començar
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section id="caracteristicas" className="mt-24 space-y-10">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Per a logopedes i equips de suport
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">
              Documenta el progrés sense perdre cap detall
            </h2>
            <p className="mt-3 text-muted-foreground">
              Des de la càrrega de l’àudio fins a l’informe final, Transcriu
              t’acompanya perquè tota la informació clínica quedi organitzada i
              disponible quan la necessitis.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-3xl border bg-background p-6 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-6 text-xl font-semibold">{feature.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-24 grid gap-10 rounded-3xl bg-gradient-to-br from-primary/10 via-background to-secondary/60 p-10 md:grid-cols-[1fr_1fr] md:items-center">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Com funciona
            </p>
            <h2 className="text-3xl font-bold">
              Un fluxe pensat per a logopedes a consulta i a l’aula
            </h2>
            <p className="text-muted-foreground">
              Transcriu elimina passos manuals i et dona visibilitat completa
              sobre cada sessió: ideal per a consultes privades, centres
              educatius i equips multidisciplinaris.
            </p>
            <Button
              size="lg"
              onClick={handlePrimaryAction}
              disabled={authLoading || loading}
            >
              {authLoading || loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Preparant l’experiència
                </>
              ) : user ? (
                "Tornar al panell"
              ) : (
                "Crea la meva primera fitxa clínica"
              )}
            </Button>
          </div>
          <div className="grid gap-6">
            {workflow.map((step) => (
              <div
                key={step.title}
                className="flex gap-4 rounded-2xl border bg-background/80 p-6"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <step.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="mt-24">
          <div className="mx-auto text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Plans i preus
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">
              Escull el pla que millor s&apos;adapti a les teves necessitats
            </h2>
            <p className="mt-3 text-muted-foreground">
              Preus transparents i sense sorpreses. Comença gratis i escala quan
              ho necessitis.
            </p>
          </div>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.key}
                className={`relative rounded-3xl border bg-card p-8 ${
                  plan.highlighted
                    ? "border-primary shadow-lg shadow-primary/10"
                    : ""
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                    Més popular
                  </div>
                )}
                <div className="flex flex-col gap-6">
                  <div>
                    <h3 className="text-2xl font-bold">{plan.name}</h3>
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="text-3xl font-bold">{plan.price}</span>
                      <span className="text-sm text-muted-foreground">
                        /mes
                      </span>
                    </div>
                    {plan.originalPrice && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        <span className="line-through">
                          {plan.originalPrice}
                        </span>{" "}
                        de descompte per llançament
                      </p>
                    )}
                    <p className="mt-4 text-sm text-muted-foreground">
                      {plan.description}
                    </p>
                  </div>
                  <Button
                    variant={plan.highlighted ? "default" : "outline"}
                    className="w-full"
                    onClick={() => handlePricingPlanClick(plan.key)}
                  >
                    Triar pla
                  </Button>
                  <ul className="space-y-4">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <CheckCircle2 className="mt-1 h-4 w-4 text-primary" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t bg-background/80">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <p>
            © {new Date().getFullYear()} Transcriu. Tots els drets reservats.
          </p>
          <div className="flex gap-6">
            <Link
              href="mailto:hola@transcribeai.app"
              className="hover:text-foreground"
            >
              Contacte
            </Link>
            <Link href="/" className="hover:text-foreground">
              Privadesa
            </Link>
            <Link href="/" className="hover:text-foreground">
              Termes
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
