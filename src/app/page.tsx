"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Features } from "@/components/Features";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
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
    name: "Individual",
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
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [numberOfUsers, setNumberOfUsers] = useState(10);
  const [showTooltip, setShowTooltip] = useState(false);
  const [contactForm, setContactForm] = useState({
    company: "",
    email: "",
    users: "",
    requirements: "",
  });

  // Pricing formula for organization plan
  const calculatePricePerUser = (N: number) => {
    if (N <= 0) return 10;
    const base = 10; // €
    const minFraction = 0.65; // minimum = 6.5 €
    const discountFraction = 1 - minFraction; // 0.35
    const rate = 0.02; // speed of discount curve
    return base * (minFraction + discountFraction * Math.exp(-rate * (N - 1)));
  };

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
    <div className="min-h-screen bg-gray-20">
      <div id="nav-sentinel" className="h-1" />
      <Navbar onContactClick={() => setIsContactOpen(true)} />
      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl px-6 pb-24 pt-4">
        {/* Hero Section */}
        <Hero />

        {/* How It Works Section */}
        <HowItWorks />

        {/* Features Section */}
        <Features />
        
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
                    ? "bg-white text-gray-900 shadow-2xl shadow-blue-500/25 border-2 border-blue-400"
                    : "bg-white border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-blue-400 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                      Més Popular
                    </div>
                  </div>
                )}
                
                <div className="text-left">
                  <h3 className={`text-2xl font-bold mb-2 ${plan.highlighted ? "text-gray-900" : "text-gray-900"}`}>
                    {plan.name}
                  </h3>
                  <div className="mb-4">
                    {plan.key === "org" ? (
                      <div className="space-y-3">
                        <div>
                          <span className="text-5xl font-bold text-gray-900">
                            {Math.floor(calculatePricePerUser(numberOfUsers))}.00€
                          </span>
                          <span className="text-md text-gray-600"> /mes/usuari</span>
                        </div>
                        <div className="pt-2">
                           <div className="relative">
                             <input
                               id="users-slider"
                               type="range"
                               min="5"
                               max="100"
                               step="5"
                               value={numberOfUsers}
                               onChange={(e) => setNumberOfUsers(parseInt(e.target.value))}
                               onMouseDown={() => setShowTooltip(true)}
                               onMouseUp={() => setShowTooltip(false)}
                               onTouchStart={() => setShowTooltip(true)}
                               onTouchEnd={() => setShowTooltip(false)}
                               className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                             />
                             {/* Tooltip */}
                             {showTooltip && (
                               <div 
                                 className="absolute -top-6 bg-blue-500 text-white px-2 py-1 rounded text-sm font-bold pointer-events-none transform -translate-x-1/2"
                                 style={{
                                   left: `${((numberOfUsers - 5) / (100 - 5)) * 100}%`
                                 }}
                               >
                                 {numberOfUsers} usuaris
                                 <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-800"></div>
                               </div>
                             )}
                           </div>
                           <div className="flex justify-between text-md text-gray-500 mt-1">
                             <span>Usuaris</span>
                             <span className="font-bold text-md text-gray-800">{numberOfUsers}</span>
                           </div>
                         </div>
                      </div>
                    ) : (
                      <>
                        <span className={`text-5xl font-bold ${plan.highlighted ? "text-gray-900" : "text-gray-900"}`}>
                          {plan.price}
                        </span>
                        {plan.price !== "Personalitzat" && (
                          <span className={`text-md ${plan.highlighted ? "text-gray-600" : "text-gray-600"}`}>
                            /mes
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <p className={`mb-8 text-md text-left ${plan.highlighted ? "text-gray-600" : "text-gray-600"}`}>
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-4 mb-8 flex-grow">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle2 className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                        plan.highlighted ? "text-blue-500" : "text-blue-500"
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
                          ? "bg-blue-500 text-white hover:bg-blue-600 shadow-lg hover:shadow-xl"
                          : "bg-blue-500 text-white hover:bg-blue-600 shadow-lg hover:shadow-xl"
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
                          ? "bg-blue-500 text-white hover:bg-blue-600 shadow-lg hover:shadow-xl"
                          : "bg-blue-500 text-white hover:bg-blue-600 shadow-lg hover:shadow-xl"
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
                className="bg-blue-500 hover:bg-blue-600 text-white"
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
              className="bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50"
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

      {/* Footer */}
      <Footer />
    </div>
  );
}
