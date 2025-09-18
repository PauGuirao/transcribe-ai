'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import {
  BrainCircuit,
  CheckCircle2,
  Clock3,
  FileAudio2,
  Headphones,
  Loader2,
  ShieldCheck,
  Sparkles,
  Mic,
  PenTool,
  BookOpen,
} from 'lucide-react'

const features = [
  {
    title: 'Notas clínicas en minutos',
    description:
      'Transcribe las sesiones de logopedia con IA adaptada al español, lista para que añadas observaciones y objetivos terapéuticos.',
    icon: BrainCircuit,
  },
  {
    title: 'Limpieza inteligente',
    description:
      'Elimina muletillas, repeticiones y segmentos irrelevantes automáticamente para obtener informes claros que puedas compartir con las familias.',
    icon: Sparkles,
  },
  {
    title: 'Seguimiento seguro',
    description:
      'Almacena historiales, evolutivos y acuerdos de intervención con cifrado y controles de acceso que cumplen las normativas sanitarias.',
    icon: ShieldCheck,
  },
]

const workflow = [
  {
    title: 'Registra tu sesión',
    description: 'Importa las grabaciones de tus sesiones individuales o grupales desde cualquier dispositivo en segundos.',
    icon: FileAudio2,
  },
  {
    title: 'Analiza y anota',
    description: 'Escucha mientras lees, etiqueta hitos del plan terapéutico y añade observaciones clínicas desde el editor.',
    icon: Headphones,
  },
  {
    title: 'Comparte avances',
    description: 'Exporta informes para familias, colegios u otros profesionales y sincroniza el progreso de cada alumno.',
    icon: CheckCircle2,
  },
]

const quickActions = [
  {
    title: 'Transcribir sesión',
    description: 'Convierte el audio en texto editable y listo para el informe clínico.',
    icon: Mic,
    href: '/transcribe',
  },
  {
    title: 'Anotar intervención',
    description: 'Marca objetivos, etiquetas y observaciones mientras revisas la sesión.',
    icon: PenTool,
    href: '/annotate',
  },
  {
    title: 'Biblioteca terapéutica',
    description: 'Consulta historiales, exporta informes y comparte avances con tu equipo.',
    icon: BookOpen,
    href: '/library',
  },
]

export default function Home() {
  const router = useRouter()
  const { user, loading, signInWithGoogle } = useAuth()
  const [authLoading, setAuthLoading] = useState(false)

  const handlePrimaryAction = async () => {
    if (loading || authLoading) return

    if (user) {
      router.push('/dashboard')
      return
    }

    setAuthLoading(true)
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('Error iniciando sesión:', error)
      setAuthLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/40">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Headphones className="h-5 w-5" />
            </div>
            TranscribeAI
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Button variant="ghost" onClick={() => router.push('/dashboard')}>
                Ir al panel
              </Button>
            ) : (
              <Button asChild variant="ghost">
                <Link href="/auth/signin">Iniciar sesión</Link>
              </Button>
            )}
            <Button onClick={handlePrimaryAction} disabled={authLoading || loading}>
              {authLoading || loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Preparando...
                </>
              ) : user ? (
                'Abrir TranscribeAI'
              ) : (
                'Comenzar gratis'
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
              Documenta cada intervención sin perder tiempo
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
                Transcribe, analiza y comparte el progreso de tus alumnos de logopedia en cuestión de minutos.
              </h1>
              <p className="text-lg text-muted-foreground">
                TranscribeAI te ayuda a transformar el audio de tus sesiones en informes clínicos editables, listos para planificar objetivos, compartir con las familias y coordinarte con otros especialistas.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button size="lg" onClick={handlePrimaryAction} disabled={authLoading || loading}>
                {authLoading || loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Preparando experiencia
                  </>
                ) : user ? (
                  'Ir al panel'
                ) : (
                  'Probar con una sesión gratuita'
                )}
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#caracteristicas">Ver características</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Sin costos ocultos. Empieza con minutos gratuitos y decide después si quieres digitalizar todos tus informes clínicos.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/20 blur-3xl" aria-hidden />
            <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-secondary/40 blur-3xl" aria-hidden />
            <div className="relative rounded-3xl border bg-card/80 p-6 shadow-xl shadow-primary/10 backdrop-blur">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Proyecto</p>
                  <h2 className="text-lg font-semibold">Sesión de articulación /r/</h2>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Plan logopédico
                </span>
              </div>
              <div className="mt-6 space-y-4">
                <div className="space-y-2 rounded-2xl bg-muted/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Resumen</p>
                  <p className="text-sm text-muted-foreground">
                    Se trabajó en vibrante múltiple. El alumno mantiene el objetivo con apoyo visual y necesita reforzar respiración costo-diafragmática.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-3 rounded-xl border p-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary" aria-hidden />
                    <div>
                      <p className="text-sm font-medium">00:06:12</p>
                      <p className="text-sm text-muted-foreground">
                        Mantiene posición lingual /r/ con espejo y esquema corporal. Refuerzo positivo efectivo.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 rounded-xl border p-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary" aria-hidden />
                    <div>
                      <p className="text-sm font-medium">00:12:45</p>
                      <p className="text-sm text-muted-foreground">
                        Se recomienda tarea de lecturas guiadas en casa con audio de referencia.
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
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">¿Qué necesitas hoy?</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Elige la herramienta para tu siguiente sesión</h2>
            <p className="mt-3 text-muted-foreground">
              Accede rápidamente a los flujos más usados por logopedas y equipos de apoyo.
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
                  <h3 className="text-lg font-semibold text-foreground">{action.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
                </div>
                <span className="mt-4 text-sm font-semibold text-primary group-hover:underline">
                  Comenzar
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section id="caracteristicas" className="mt-24 space-y-16">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Para logopedas y equipos de apoyo</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Documenta el progreso terapéutico sin perderte ningún detalle</h2>
            <p className="mt-3 text-muted-foreground">
              Desde la carga del audio hasta el informe final, TranscribeAI te acompaña para que toda tu información clínica quede organizada y disponible cuando la necesites.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-3xl border bg-background p-6 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-6 text-xl font-semibold">{feature.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-24 grid gap-10 rounded-3xl bg-gradient-to-br from-primary/10 via-background to-secondary/60 p-10 md:grid-cols-[1fr_1fr] md:items-center">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Cómo funciona</p>
            <h2 className="text-3xl font-bold">Un flujo pensado para logopedas en consulta y en aula</h2>
            <p className="text-muted-foreground">
              TranscribeAI elimina pasos manuales y te da visibilidad completa sobre cada sesión: ideal para consultas privadas, centros educativos y equipos multidisciplinares.
            </p>
            <Button size="lg" onClick={handlePrimaryAction} disabled={authLoading || loading}>
              {authLoading || loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Preparando experiencia
                </>
              ) : user ? (
                'Volver al panel'
              ) : (
                'Crear mi primera ficha clínica'
              )}
            </Button>
          </div>
          <div className="grid gap-6">
            {workflow.map((step) => (
              <div key={step.title} className="flex gap-4 rounded-2xl border bg-background/80 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <step.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-24 rounded-3xl border bg-card p-10 text-center shadow-lg">
          <div className="mx-auto max-w-2xl space-y-4">
            <h2 className="text-3xl font-bold">Es hora de transcribir sin fricciones</h2>
            <p className="text-muted-foreground">
              Únete a logopedas que ya están digitalizando sus sesiones, evolucionando planes terapéuticos y comunicando avances con TranscribeAI. Empieza gratis y escala solo cuando lo necesites.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" onClick={handlePrimaryAction} disabled={authLoading || loading}>
                {authLoading || loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando
                  </>
                ) : user ? (
                  'Ir al panel'
                ) : (
                  'Crear cuenta con Google'
                )}
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/auth/signin">Ver opciones de acceso</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-background/80">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} TranscribeAI. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            <Link href="mailto:hola@transcribeai.app" className="hover:text-foreground">
              Contacto
            </Link>
            <Link href="/" className="hover:text-foreground">
              Privacidad
            </Link>
            <Link href="/" className="hover:text-foreground">
              Términos
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
