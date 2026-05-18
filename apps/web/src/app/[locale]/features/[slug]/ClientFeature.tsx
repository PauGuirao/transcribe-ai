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
import { useStartCheckout } from "@/hooks/useStartCheckout";
import {
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Quote,
  Sparkles,
  ArrowRight,
} from "lucide-react";

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

interface ClientFeatureProps {
  feature: {
    heroTitle: string;
    heroDescription: string;
    icon?: string;
    h2Sections?: H2Section[];
    faqs?: FAQ[];
    testimonials?: Testimonial[];
    relatedFeatures?: string[];
  };
}

export default function ClientFeature({ feature }: ClientFeatureProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { startCheckout, loading: checkoutLoading } = useStartCheckout();
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
- Necessitats específiques del vostre equip: ${
            contactForm.requirements || "No especificat"
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
        {/* Hero Section with Icon */}
        {feature.icon ? (
          <section className="py-2">
            <div className="max-w-7xl mx-auto md:px-6">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 md:p-10 p-6 pb-10">
                <div className="flex items-start gap-6 mb-8">
                  <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-4xl md:text-5xl shadow-lg">
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-gray-900 leading-tight mb-4">
                      {feature.heroTitle}
                    </h1>
                    <p className="text-lg text-gray-600 leading-relaxed">
                      {feature.heroDescription}
                    </p>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="max-w-md">
                  <Button
                    onClick={handlePrimaryAction}
                    disabled={authLoading || loading}
                    size="lg"
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 rounded-lg font-semibold text-base transition-all shadow-md hover:shadow-lg"
                  >
                    {authLoading || loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Preparant...
                      </>
                    ) : user ? (
                      "Comença a utilitzar aquesta funcionalitat →"
                    ) : (
                      "Prova gratuïtament →"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <Hero
            title={feature.heroTitle}
            description={feature.heroDescription}
          />
        )}

        {/* Content Sections */}
        {feature.h2Sections && feature.h2Sections.length > 0 && (
          <section className="my-16 space-y-12">
            {feature.h2Sections.map((section, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl shadow-lg border border-gray-200 p-8"
              >
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
                      <div
                        key={i}
                        className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100"
                      >
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
                        <div
                          key={i}
                          className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm"
                        >
                          <ArrowRight className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                          <span className="text-gray-700 text-sm">
                            {useCase}
                          </span>
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
        {feature.testimonials && feature.testimonials.length > 0 && (
          <section className="my-16">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                Què diuen els professionals
              </h2>
              <p className="text-lg text-gray-600">
                Més de 1.200 logopedes confien en Transcriu
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {feature.testimonials.map((testimonial, idx) => (
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
                    <svg
                      key={i}
                      className="w-4 h-4 text-green-500 fill-current"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  4.9/5 · 200+ ressenyes
                </span>
              </div>
            </div>
          </section>
        )}

        {/* How It Works Section */}
        <HowItWorks />

        {/* Features Section */}
        <Features />

        {/* FAQs Section */}
        {feature.faqs && feature.faqs.length > 0 && (
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
              {feature.faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <button
                    onClick={() =>
                      setExpandedFaq(expandedFaq === idx ? null : idx)
                    }
                    className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-semibold text-gray-900 pr-4 text-base">
                      {faq.question}
                    </span>
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        expandedFaq === idx ? "bg-blue-100" : "bg-gray-100"
                      }`}
                    >
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

        {/* Related Features */}
        {feature.relatedFeatures && feature.relatedFeatures.length > 0 && (
          <section className="my-16">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Funcionalitats relacionades
              </h2>
              <p className="text-gray-600">
                Descobreix més característiques de Transcriu
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {feature.relatedFeatures.map((relatedFeature, idx) => (
                <Link
                  key={idx}
                  href={`/features/${relatedFeature}`}
                  className="px-5 py-2.5 bg-white border-2 border-gray-200 rounded-lg text-gray-700 hover:bg-blue-50 hover:border-blue-500 hover:text-blue-700 transition-all font-medium shadow-sm hover:shadow-md"
                >
                  {relatedFeature
                    .replace(/-/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Pricing Section */}
        <Pricing
          authLoading={authLoading}
          loading={checkoutLoading}
          onPrimaryAction={startCheckout}
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
                  placeholder="La teva empresa"
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
                  placeholder="el.teu.email@empresa.com"
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
                  placeholder="ex. 10-50 usuaris"
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
                  placeholder="Descriu requisits especials que necessiteu..."
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
                  disabled={
                    !contactForm.company ||
                    !contactForm.email ||
                    !contactForm.users ||
                    isSubmitting
                  }
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
