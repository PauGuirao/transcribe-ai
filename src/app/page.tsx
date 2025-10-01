"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Menu,
  X,
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
      "Escolta mentre llegeixes, etiqueta fites del pla terapèutic i afegeix observacions clíniques des de l'editor.",
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
    key: "free",
    name: "Gratuït",
    price: "0€",
    description: "Perfecte per començar amb Transcriu.",
    features: [
      "5 transcripcions gratuïtes",
      `Models base d'IA optimitzats per a català i espanyol`,
      `Editor bàsic`,
      "Suport per email",
    ],
    highlighted: false,
  },
  {
    key: "paid",
    name: "Pro",
    price: "10€",
    description:
      "Transcripcions il·limitades per a professionals.",
    features: [
      "Transcripcions il·limitades",
      "Models avançats amb diarització",
      "Exportacions il·limitades (PDF, DOCX, TXT)",
      "Editor col·laboratiu avançat",
      "Suport prioritari",
    ],
    highlighted: true,
  },
  {
    key: "org",
    name: "Organització",
    price: "Personalitzat",
    description: "Solucions escalables per a equips i necessitats personalitzades",
    features: [
      "Usuaris il·limitats per a l'equip",
      "Gestió centralitzada d'usuaris i permisos",
      "Suport dedicat",
      "Descomptes per volum",
      "Funcionalitats personalitzades segons necessitats",
      "Formació i onboarding per a l'equip",
    ],
    highlighted: false,
  },
];

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [contactForm, setContactForm] = useState({
    company: "",
    email: "",
    users: "",
    requirements: "",
  });

  const handlePrimaryAction = async () => {
    if (user) {
      router.push("/dashboard");
    } else {
      setLoading(true);
      router.push("/auth/signin");
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: "d6bbba73-babe-48f3-ae25-6b49b7ada51c",
          name: "Sol·licitud d'empresa",
          email: "hola@transcribeai.app",
          subject: "[Transcriu Enterprise] Sol·licitud d'informació - Pla Organització",
          message: `
Nova sol·licitud per al pla Organització:

Detalls de l'empresa:
- Nom de l'empresa: ${contactForm.company}
- Email de contacte: ${contactForm.email}
- Nombre d'usuaris esperats: ${contactForm.users}
- Necessitats específiques del vostre equip: ${contactForm.requirements || 'No especificat'}

---
Informació de la sol·licitud:
- Data: ${new Date().toLocaleString('ca-ES')}
- Tipus: Sol·licitud pla Organització
          `,
        }),
      });

      if (response.ok) {
        setIsSubmitted(true);
        setContactForm({
          company: "",
          email: "",
          users: "",
          requirements: "",
        });
      } else {
        throw new Error("Error en enviar el formulari");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Hi ha hagut un error en enviar la teva sol·licitud. Si us plau, torna-ho a intentar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">transcriu</h1>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <button 
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
            >
              Preus
            </button>
            <button 
              onClick={() => setIsContactOpen(true)}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
            >
              Contacte
            </button>
          </nav>

          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <Button variant="ghost" onClick={() => router.push("/dashboard")} className="text-sm h-11 px-6 text-orange-600 hover:text-orange-700 hover:bg-orange-50 border border-orange-200 hover:border-orange-300">
                Anar al panell
              </Button>
            ) : (
              <Button asChild variant="ghost" className="text-sm h-11 px-6 text-orange-600 hover:text-orange-700 hover:bg-orange-50 border border-orange-200 hover:border-orange-300">
                <Link href="/auth/signin">Inicia sessió</Link>
              </Button>
            )}
            <Button
              onClick={handlePrimaryAction}
              disabled={authLoading || loading}
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm h-11 px-6 font-medium shadow-sm"
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

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-600 hover:text-gray-900"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Panel */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100">
            <div className="mx-auto max-w-6xl px-6 py-4 space-y-3">
              <div className="space-y-2">
                <button 
                  onClick={() => {
                    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                    setIsMobileMenuOpen(false);
                  }}
                  className="block text-sm text-gray-600 hover:text-gray-900 py-2 w-full text-left"
                >
                  Preus
                </button>
                <button 
                  onClick={() => {
                    setIsContactOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="block text-sm text-gray-600 hover:text-gray-900 py-2 w-full text-left"
                >
                  Contacte
                </button>
              </div>
              <div className="pt-4 border-t border-gray-100 space-y-3">
                {user ? (
                  <Button 
                  variant="ghost" 
                  onClick={() => {
                    router.push("/dashboard");
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full justify-start text-sm h-11 text-orange-600 hover:text-orange-700 hover:bg-orange-50 border border-orange-200 hover:border-orange-300"
                >
                  Anar al panell
                </Button>
              ) : (
                <Button 
                  asChild 
                  variant="ghost"
                  className="w-full justify-start text-sm h-11 text-orange-600 hover:text-orange-700 hover:bg-orange-50 border border-orange-200 hover:border-orange-300"
                >
                  <Link 
                    href="/auth/signin"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Inicia sessió
                  </Link>
                </Button>
              )}
                <Button
                  onClick={() => {
                    handlePrimaryAction();
                    setIsMobileMenuOpen(false);
                  }}
                  disabled={authLoading || loading}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm h-11 font-medium shadow-sm"
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
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl px-6 pb-24 pt-16">
        {/* Hero Section */}
        <section className="text-center space-y-6 py-8">
          <div className="space-y-4 max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 leading-[1] max-w-3xl mx-auto">
              Transcriu sessions de
              <span className="text-gray-900"> logopèdia amb facilitat</span>
            </h1>
            <p className="text-2xl md:text-2xl text-gray-500 max-w-2xl mx-auto leading-tight font-bold">
              Utilitza una plataforma dissenyada per a alta precisió. Confiada per professionals de totes les mides per gestionar milions de paraules cada mes.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button
              size="lg"
              onClick={handlePrimaryAction}
              disabled={authLoading || loading}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-7 rounded-lg font-semibold text-lg transition-colors"
            >
              {authLoading || loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Preparant l'experiència
                </>
              ) : user ? (
                "Anar al panell"
              ) : (
                "Prova-ho gratis"
              )}
            </Button>
            <Button size="lg" variant="outline" className="px-6 py-7 rounded-lg font-semibold text-lg border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors">
              Veure característiques
            </Button>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto space-y-24">
            {/* Feature 1: Transcription - Text Left, Image Right */}
            <div className="grid md:grid-cols-2 gap-12 items-stretch">
              <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 space-y-6 flex flex-col justify-center h-96">
                <h3 className="text-3xl font-bold text-gray-900">
                  Transcripció automàtica precisa
                </h3>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Converteix les teves sessions d'àudio en text editable amb la nostra IA especialitzada en català i espanyol. 
                  Transcripció ràpida i precisa que reconeix terminologia mèdica i logopèdica per obtenir resultats professionals.
                </p>
                <Button className="bg-blue-600 hover:bg-blue-700 w-fit">
                  Prova la transcripció
                </Button>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl p-8 relative overflow-hidden h-96">
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileAudio2 className="h-32 w-32 text-blue-600 opacity-20" />
                </div>
                <div className="relative z-10 h-full flex items-center justify-center">
                  <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <div className="text-sm font-medium text-gray-900">Transcrivint...</div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 bg-blue-200 rounded w-full"></div>
                      <div className="h-2 bg-blue-200 rounded w-3/4"></div>
                      <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="mt-4 text-xs text-gray-500">98% precisió</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2: Edit & Annotate - Text Right, Image Left */}
            <div className="grid md:grid-cols-2 gap-12 items-stretch">
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-3xl p-8 relative overflow-hidden h-96 order-2 md:order-1">
                <div className="absolute inset-0 flex items-center justify-center">
                  <PenTool className="h-32 w-32 text-orange-600 opacity-20" />
                </div>
                <div className="relative z-10 h-full flex items-center justify-center">
                  <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <PenTool className="h-4 w-4 text-orange-600" />
                      </div>
                      <div className="text-sm font-medium text-gray-900">Editor Actiu</div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                        <div className="text-xs text-gray-600">Objectiu terapèutic</div>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                        <div className="text-xs text-gray-600">Progrés observat</div>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        <div className="text-xs text-gray-600">Nota clínica</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 space-y-6 flex flex-col justify-center h-96 order-1 md:order-2">
                <h3 className="text-3xl font-bold text-gray-900">
                  Editor intel·ligent amb anotacions
                </h3>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Edita les transcripcions i afegeix anotacions clíniques directament al text. Marca objectius terapèutics, 
                  observacions i progressos amb etiquetes de colors per crear informes estructurats i professionals.
                </p>
                <Button className="bg-orange-600 hover:bg-orange-700 w-fit">
                  Prova l'editor
                </Button>
              </div>
            </div>

            {/* Feature 3: Library & ID Profiling - Text Left, Image Right */}
            <div className="grid md:grid-cols-2 gap-12 items-stretch">
              <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 space-y-6 flex flex-col justify-center h-96">
                <h3 className="text-3xl font-bold text-gray-900">
                  Gestió de pacients i historials
                </h3>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Organitza tots els teus pacients amb perfils detallats i historials complets. Accedeix ràpidament a sessions anteriors, 
                  segueix l'evolució terapèutica i genera informes de progrés per a famílies i altres professionals.
                </p>
                <Button className="bg-green-600 hover:bg-green-700 w-fit">
                  Explora la biblioteca
                </Button>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-3xl p-8 relative overflow-hidden h-96">
                <div className="absolute inset-0 flex items-center justify-center">
                  <BookOpen className="h-32 w-32 text-green-600 opacity-20" />
                </div>
                <div className="relative z-10 h-full flex items-center justify-center">
                  <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-green-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">Perfils de Pacients</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">Sessions totals</span>
                        <span className="text-xs font-medium text-green-600">24</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">Progrés</span>
                        <span className="text-xs font-medium text-green-600">85%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full w-[85%]"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* All-in-One Toolkit Section */}
        <section className="py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Kit d'Eines Tot-en-Un per a Transcripció
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Tot el que necessites per gestionar les teves sessions de logopèdia de manera eficient
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <FileAudio2 className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Llistes i Segments</h3>
              <p className="text-gray-600">
                Crea llistes i segments per organitzar les teves sessions i fer seguiment del progrés dels teus pacients.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <PenTool className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Constructor de Formularis</h3>
              <p className="text-gray-600">
                El nostre constructor de formularis facilita la creació de formularis d'avaluació personalitzats per capturar dades específiques.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <BrainCircuit className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Domini d'Enviament Gratuït</h3>
              <p className="text-gray-600">
                No tens un domini? Cap problema! Oferim un subdomini gratuït perquè puguis començar a enviar informes immediatament.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Plans per a cada necessitat
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comença gratis i escala segons les teves necessitats professionals
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.key}
                className={`rounded-3xl p-8 relative flex flex-col h-full ${
                  plan.highlighted
                    ? "bg-white text-gray-900 shadow-2xl shadow-orange-500/25 scale-105 border-2 border-orange-400"
                    : "bg-white border-2 border-gray-200 hover:border-orange-300 hover:shadow-lg transition-all duration-300"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-orange-400 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                      Més Popular
                    </div>
                  </div>
                )}
                
                <div className="text-center">
                  <h3 className={`text-2xl font-bold mb-2 ${plan.highlighted ? "text-gray-900" : "text-gray-900"}`}>
                    {plan.name}
                  </h3>
                  <div className="mb-4">
                    <span className={`text-5xl font-bold ${plan.highlighted ? "text-gray-900" : "text-gray-900"}`}>
                      {plan.price}
                    </span>
                    {plan.price !== "Personalitzat" && (
                      <span className={`text-lg ${plan.highlighted ? "text-gray-600" : "text-gray-600"}`}>
                        /mes
                      </span>
                    )}
                  </div>
                  <p className={`mb-8 text-lg ${plan.highlighted ? "text-gray-600" : "text-gray-600"}`}>
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-4 mb-8 flex-grow">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle2 className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                        plan.highlighted ? "text-orange-500" : "text-orange-500"
                      }`} />
                      <span className={`text-sm leading-relaxed ${plan.highlighted ? "text-gray-700" : "text-gray-700"}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto">
                  {plan.key === "org" ? (
                    <Button
                      onClick={() => setIsContactOpen(true)}
                      className={`w-full py-6 rounded-lg font-semibold text-lg transition-all duration-200 ${
                        plan.highlighted
                          ? "bg-orange-500 text-white hover:bg-orange-600 shadow-lg hover:shadow-xl"
                          : "bg-orange-500 text-white hover:bg-orange-600 shadow-lg hover:shadow-xl"
                      }`}
                    >
                      Contacta amb vendes
                    </Button>
                  ) : (
                    <Button
                      onClick={handlePrimaryAction}
                      disabled={authLoading || loading}
                      className={`w-full py-6 rounded-lg font-semibold text-lg transition-all duration-200 ${
                        plan.highlighted
                          ? "bg-orange-500 text-white hover:bg-orange-600 shadow-lg hover:shadow-xl"
                          : "bg-orange-500 text-white hover:bg-orange-600 shadow-lg hover:shadow-xl"
                      }`}
                    >
                      {plan.key === "free" ? "Comença gratis" : "Actualitza ara"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Contact Sales Dialog */}
      <Dialog open={isContactOpen} onOpenChange={setIsContactOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contacta per a solucions d'empresa</DialogTitle>
            <DialogDescription>
              Omple aquest formulari i ens posarem en contacte amb tu per discutir les necessitats del teu equip.
            </DialogDescription>
          </DialogHeader>
          {isSubmitted ? (
            <div className="text-center py-6">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Sol·licitud enviada correctament!
              </h3>
              <p className="text-gray-600 mb-4">
                Hem rebut la teva sol·licitud i ens posarem en contacte amb tu aviat per discutir les necessitats del teu equip.
              </p>
              <Button 
                onClick={() => {
                  setIsSubmitted(false);
                  setIsContactOpen(false);
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                Tancar
              </Button>
            </div>
          ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                Nom de l'empresa *
              </label>
              <Input
                id="company"
                value={contactForm.company}
                onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                placeholder="La teva empresa"
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email de contacte *
              </label>
              <Input
                id="email"
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                placeholder="el.teu.email@empresa.com"
                required
              />
            </div>
            <div>
              <label htmlFor="users" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre d'usuaris esperats *
              </label>
              <Input
                id="users"
                value={contactForm.users}
                onChange={(e) => setContactForm({ ...contactForm, users: e.target.value })}
                placeholder="ex. 10-50 usuaris"
                required
              />
            </div>
            <div>
              <label htmlFor="requirements" className="block text-sm font-medium text-gray-700 mb-1">
                Quines són les necessitats específiques del vostre equip?
              </label>
              <Textarea
                id="requirements"
                value={contactForm.requirements}
                onChange={(e) => setContactForm({ ...contactForm, requirements: e.target.value })}
                placeholder="Descriu requisits especials que necessiteu..."
                rows={5}
              />
            </div>
          </div>
          )}
          {!isSubmitted && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsContactOpen(false)}>
              Cancel·lar
            </Button>
            <Button 
              onClick={handleContactSubmit}
              disabled={!contactForm.company || !contactForm.email || !contactForm.users || isSubmitting}
              className="bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Enviant...
                </>
              ) : (
                "Enviar sol·licitud"
              )}
            </Button>
          </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
