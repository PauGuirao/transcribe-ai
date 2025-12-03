"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Features } from "@/components/Features";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Pricing } from "@/components/Pricing";
import { CheckCircle2, Loader2, ChevronDown, ChevronUp, Quote, MapPin, Building2, Users, ArrowRight, Sparkles } from "lucide-react";

interface H2Section {
  title: string;
  content?: string;
  points?: string[];
  useCases?: string[];
}

interface FAQ {
  question: string;
  answer: string;
}

interface Testimonial {
  name: string;
  role: string;
  text: string;
  image?: string;
}

interface LocalInfo {
  city?: string;
  province?: string;
  region?: string;
  population?: string;
  speechTherapists?: string;
  hospitals?: string[];
  neighborhoods?: string[];
}

interface ClientLandingProps {
  landing: {
    heroTitle: string;
    heroDescription: string;
    h2Sections?: H2Section[];
    faqs?: FAQ[];
    testimonials?: Testimonial[];
    localInfo?: LocalInfo;
    relatedServices?: string[];
  };
}

export default function ClientLanding({ landing }: ClientLandingProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
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
          subject:
            "[Transcriu Enterprise] Sol·licitud d'informació - Pla Organització",
          message: `
Nova sol·licitud per al pla Organització:

Detalls de l'empresa:
- Nom de l'empresa: ${contactForm.company}
- Email de contacte: ${contactForm.email}
- Nombre d'usuaris esperats: ${contactForm.users}
- Necessitats específiques del vostre equip: ${contactForm.requirements || "No especificat"
            }

---
Informació de la sol·licitud:
- Data: ${new Date().toLocaleString("ca-ES")}
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
      alert(
        "Hi ha hagut un error en enviar la teva sol·licitud. Si us plau, torna-ho a intentar."
      );
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
        <Hero title={landing.heroTitle} description={landing.heroDescription} />

        {/* Local Info Section */}
        {landing.localInfo && (
          <section className="my-12">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
              <div className="grid md:grid-cols-3 gap-8 mb-6">
                {landing.localInfo.city && (
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Localització</h3>
                      <p className="text-gray-700 font-medium">
                        {landing.localInfo.city}
                        {landing.localInfo.province && `, ${landing.localInfo.province}`}
                      </p>
                      {landing.localInfo.population && (
                        <p className="text-sm text-gray-600 mt-1">
                          {landing.localInfo.population} habitants
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {landing.localInfo.speechTherapists && (
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Users className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Professionals</h3>
                      <p className="text-gray-700 font-medium">{landing.localInfo.speechTherapists} logopedes</p>
                      <p className="text-sm text-gray-600 mt-1">Col·legiats actius</p>
                    </div>
                  </div>
                )}

                {landing.localInfo.hospitals && landing.localInfo.hospitals.length > 0 && (
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Hospitals</h3>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {landing.localInfo.hospitals.slice(0, 3).map((hospital, idx) => (
                          <li key={idx} className="flex items-center gap-1">
                            <div className="w-1 h-1 bg-purple-600 rounded-full"></div>
                            {hospital}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {landing.localInfo.neighborhoods && landing.localInfo.neighborhoods.length > 0 && (
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-gray-600" />
                    Zones on treballem
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {landing.localInfo.neighborhoods.map((neighborhood, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm text-gray-700 font-medium border border-gray-200"
                      >
                        {neighborhood}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Unique Content Sections */}
        {landing.h2Sections && landing.h2Sections.length > 0 && (
          <section className="my-16 space-y-12">
            {landing.h2Sections.map((section, idx) => (
              <div key={idx} className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
                  {section.title}
                </h2>

                {section.content && (
                  <p className="text-base md:text-lg text-gray-700 leading-relaxed mb-6">
                    {section.content}
                  </p>
                )}

                {section.points && section.points.length > 0 && (
                  <div className="grid md:grid-cols-2 gap-4">
                    {section.points.map((point, i) => (
                      <div key={i} className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 text-sm">{point}</span>
                      </div>
                    ))}
                  </div>
                )}

                {section.useCases && section.useCases.length > 0 && (
                  <div className="mt-6 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-lg">
                      <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      Casos d'ús
                    </h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      {section.useCases.map((useCase, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm">
                          <ArrowRight className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                          <span className="text-gray-700 text-sm">{useCase}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Testimonials Section */}
        {landing.testimonials && landing.testimonials.length > 0 && (
          <section className="my-16">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                Què diuen els professionals
              </h2>
              <p className="text-lg text-gray-600">
                Més de 500 logopedes confien en Transcriu
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {landing.testimonials.map((testimonial, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 flex flex-col"
                >
                  <div className="mb-4">
                    <Quote className="h-10 w-10 text-blue-500 opacity-30" />
                  </div>

                  <p className="text-gray-700 leading-relaxed mb-6 flex-grow">
                    "{testimonial.text}"
                  </p>

                  <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                    <div className="flex-shrink-0">
                      {testimonial.image ? (
                        <img
                          src={testimonial.image}
                          alt={testimonial.name}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                          {testimonial.name.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="flex-grow min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {testimonial.name}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {testimonial.role}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full border border-green-200">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-green-500 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm font-medium text-gray-700">4.9/5 · 200+ ressenyes</span>
              </div>
            </div>
          </section>
        )}

        {/* How It Works Section */}
        <HowItWorks />

        {/* Features Section */}
        <Features />

        {/* FAQs Section */}
        {landing.faqs && landing.faqs.length > 0 && (
          <section className="my-16">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                Preguntes Freqüents
              </h2>
              <p className="text-lg text-gray-600">
                Respostes a les preguntes més comunes
              </p>
            </div>
            <div className="max-w-3xl mx-auto space-y-3">
              {landing.faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-semibold text-gray-900 pr-4 text-base">
                      {faq.question}
                    </span>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${expandedFaq === idx ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                      {expandedFaq === idx ? (
                        <ChevronUp className="h-5 w-5 text-blue-600" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-600" />
                      )}
                    </div>
                  </button>
                  {expandedFaq === idx && (
                    <div className="px-6 pb-5 text-gray-700 leading-relaxed bg-gray-50 border-t border-gray-100">
                      <p className="pt-4">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Related Services */}
        {landing.relatedServices && landing.relatedServices.length > 0 && (
          <section className="my-16">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Serveis relacionats
              </h2>
              <p className="text-gray-600">Descobreix més solucions per a logopedes</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {landing.relatedServices.map((service, idx) => (
                <Link
                  key={idx}
                  href={`/logopedia/${service}`}
                  className="px-5 py-2.5 bg-white border-2 border-gray-200 rounded-lg text-gray-700 hover:bg-blue-50 hover:border-blue-500 hover:text-blue-700 transition-all font-medium shadow-sm hover:shadow-md"
                >
                  {service.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Pricing Section */}
        <Pricing
          authLoading={authLoading}
          loading={loading}
          onPrimaryAction={handlePrimaryAction}
          onContactClick={() => setIsContactOpen(true)}
        />
      </main>

      {/* Contact Sales Dialog */}
      <Dialog open={isContactOpen} onOpenChange={setIsContactOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contacta per a solucions d'empresa</DialogTitle>
            <DialogDescription>
              Omple aquest formulari i ens posarem en contacte amb tu per
              discutir les necessitats del teu equip.
            </DialogDescription>
          </DialogHeader>
          {isSubmitted ? (
            <div className="text-center py-6">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Sol·licitud enviada correctament!
              </h3>
              <p className="text-gray-600 mb-4">
                Hem rebut la teva sol·licitud i ens posarem en contacte amb tu
                aviat per discutir les necessitats del teu equip.
              </p>
              <Button
                onClick={() => {
                  setIsSubmitted(false);
                  setIsContactOpen(false);
                }}
                className="bg-gray-900 hover:bg-gray-800 text-white"
              >
                Tancar
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="company"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Nom de l'empresa *
                </label>
                <Input
                  id="company"
                  placeholder="Ex: Teide Educació"
                  value={contactForm.company}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, company: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email de contacte *
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Ex: equip@empresa.cat"
                  value={contactForm.email}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, email: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="users"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Nombre d'usuaris *
                </label>
                <Input
                  id="users"
                  placeholder="Ex: 25"
                  value={contactForm.users}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, users: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="requirements"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Necessitats específiques
                </label>
                <Textarea
                  id="requirements"
                  placeholder="Ex: permisos per coordinadors, exportació a DOCX i signatura SSO amb Entra ID"
                  value={contactForm.requirements}
                  onChange={(e) =>
                    setContactForm({
                      ...contactForm,
                      requirements: e.target.value,
                    })
                  }
                  rows={4}
                />
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  onClick={handleContactSubmit}
                  disabled={isSubmitting}
                  className="bg-gray-900 hover:bg-gray-800 text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviant...
                    </>
                  ) : (
                    "Enviar sol·licitud"
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}