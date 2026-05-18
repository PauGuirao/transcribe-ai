"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
import { HowItWorks } from "@/components/HowItWorks";
import { Features } from "@/components/Features";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Pricing } from "@/components/Pricing";
import { useStartCheckout } from "@/hooks/useStartCheckout";
import {
  CheckCircle2,
  Loader2,
  Plus,
  Minus,
  ArrowRight,
  Sparkles,
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

function SectionBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm">
      <span className="inline-flex size-1.5 rounded-full bg-indigo-500" />
      {label}
    </span>
  );
}

export default function ClientFeature({ feature }: ClientFeatureProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { startCheckout, loading: checkoutLoading } = useStartCheckout();
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
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
    <div className="min-h-screen bg-white">
      <div id="nav-sentinel" className="h-1" />
      <Navbar onContactClick={() => setIsContactOpen(true)} />

      <main>
        {/* Hero */}
        <section className="relative isolate overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 -z-10 bg-grid-lines bg-grid-fade"
            aria-hidden="true"
          />

          <div className="mx-auto max-w-4xl px-6 pt-20 pb-16 text-center sm:pt-28">
            {feature.icon && (
              <div className="mb-8 flex justify-center">
                <div className="flex size-16 items-center justify-center rounded-2xl border border-neutral-200 bg-white text-4xl shadow-sm">
                  {feature.icon}
                </div>
              </div>
            )}
            <h1 className="text-4xl font-normal tracking-tight text-neutral-900 sm:text-5xl md:text-6xl">
              {feature.heroTitle}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-neutral-600 sm:text-lg">
              {feature.heroDescription}
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                onClick={handlePrimaryAction}
                disabled={authLoading || loading}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-neutral-900 px-6 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-60 sm:w-auto"
              >
                {authLoading || loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Preparant...
                  </>
                ) : user ? (
                  "Anar al dashboard"
                ) : (
                  "Prova gratuïtament"
                )}
              </button>
              <Link
                href="/features"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-6 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50 sm:w-auto"
              >
                Veure totes les funcionalitats
              </Link>
            </div>
          </div>
        </section>

        {/* Content Sections */}
        {feature.h2Sections && feature.h2Sections.length > 0 && (
          <section className="mx-auto max-w-5xl px-6 py-24">
            <div className="mx-auto max-w-2xl text-center">
              <SectionBadge label="Detalls" />
              <h2 className="mt-4 text-3xl font-normal tracking-tight text-neutral-900 sm:text-4xl">
                Com funciona aquesta funcionalitat
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-neutral-600">
                Tot el que necessites saber per aprofitar-la al màxim.
              </p>
            </div>

            <div className="mt-20 flex flex-col gap-24">
              {feature.h2Sections.map((section, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 items-start gap-12 md:grid-cols-2"
                >
                  <div className={idx % 2 === 1 ? "md:order-2" : ""}>
                    <SectionBadge label={`0${idx + 1}`} />
                    <h3 className="mt-4 text-2xl font-normal tracking-tight text-neutral-900 sm:text-3xl">
                      {section.title}
                    </h3>
                    {section.content && (
                      <p className="mt-4 text-base leading-relaxed text-neutral-600">
                        {section.content}
                      </p>
                    )}
                    {section.points && section.points.length > 0 && (
                      <ul className="mt-6 flex flex-col gap-3 text-sm text-neutral-700">
                        {section.points.map((point, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <svg
                              className="mt-0.5 size-4 shrink-0 text-emerald-600"
                              viewBox="0 0 20 20"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M5 10.5l3 3 7-7"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className={idx % 2 === 1 ? "md:order-1" : ""}>
                    {section.useCases && section.useCases.length > 0 ? (
                      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
                          <Sparkles className="size-4 text-indigo-500" />
                          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                            Casos d'ús
                          </span>
                        </div>
                        <ul className="mt-4 flex flex-col gap-2.5">
                          {section.useCases.map((useCase, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2.5 rounded-lg border border-neutral-200 bg-neutral-50/50 px-3 py-2.5 text-sm text-neutral-700"
                            >
                              <ArrowRight className="mt-0.5 size-4 shrink-0 text-neutral-400" />
                              <span>{useCase}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-8">
                        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                          <span className="inline-flex size-1.5 rounded-full bg-indigo-500" />
                          {section.title}
                        </div>
                        <div className="mt-6 space-y-3">
                          <div className="h-2 w-3/4 rounded-full bg-neutral-200" />
                          <div className="h-2 w-full rounded-full bg-neutral-200" />
                          <div className="h-2 w-2/3 rounded-full bg-neutral-200" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Testimonials */}
        {feature.testimonials && feature.testimonials.length > 0 && (
          <section className="mx-auto max-w-5xl px-6 py-24">
            <div className="mx-auto max-w-3xl text-center">
              <SectionBadge label="Testimonials" />
              <h2 className="mt-4 text-3xl font-normal tracking-tight text-neutral-900 sm:text-4xl">
                Què diuen els professionals
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-neutral-600">
                Més de 1.200 logopedes confien en Transcriu.
              </p>

              <blockquote className="mx-auto mt-12 max-w-2xl text-xl leading-relaxed text-neutral-800">
                "{feature.testimonials[0].text}"
              </blockquote>

              <div className="mt-8 flex items-center justify-center gap-3">
                {feature.testimonials[0].image ? (
                  <img
                    src={feature.testimonials[0].image}
                    alt={feature.testimonials[0].name}
                    className="size-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400 text-sm font-medium text-white">
                    {feature.testimonials[0].name.charAt(0)}
                  </div>
                )}
                <div className="text-left text-sm">
                  <p className="font-medium text-neutral-900">
                    {feature.testimonials[0].name}
                  </p>
                  <p className="text-neutral-500">
                    {feature.testimonials[0].role}
                  </p>
                </div>
              </div>
            </div>

            {feature.testimonials.length > 1 && (
              <div className="mt-20 grid grid-cols-1 gap-6 sm:grid-cols-3">
                {feature.testimonials.slice(1, 4).map((item, i) => (
                  <figure key={i} className="text-left">
                    <blockquote className="text-sm leading-relaxed text-neutral-700">
                      "{item.text}"
                    </blockquote>
                    <figcaption className="mt-4 flex items-center gap-3">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="size-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex size-8 items-center justify-center rounded-full bg-neutral-200 text-xs font-medium text-neutral-700">
                          {item.name.charAt(0)}
                        </div>
                      )}
                      <div className="text-xs">
                        <p className="font-medium text-neutral-900">
                          {item.name}
                        </p>
                        <p className="text-neutral-500">{item.role}</p>
                      </div>
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}

            <p className="mt-16 text-center text-xs text-neutral-500">
              4.9/5 · 200+ ressenyes de logopedes professionals
            </p>
          </section>
        )}

        {/* How It Works */}
        <HowItWorks />

        {/* Features */}
        <Features />

        {/* FAQs */}
        {feature.faqs && feature.faqs.length > 0 && (
          <section className="mx-auto max-w-3xl px-6 py-24">
            <div className="text-center">
              <SectionBadge label="FAQ" />
              <h2 className="mt-4 text-3xl font-normal tracking-tight text-neutral-900 sm:text-4xl">
                Preguntes freqüents
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-neutral-600">
                Respostes a les preguntes més comunes.
              </p>
            </div>

            <ul className="mt-12 divide-y divide-neutral-200 border-y border-neutral-200">
              {feature.faqs.map((faq, i) => {
                const open = expandedFaq === i;
                const panelId = `feature-faq-panel-${i}`;
                const buttonId = `feature-faq-button-${i}`;
                return (
                  <li key={i}>
                    <h3>
                      <button
                        id={buttonId}
                        onClick={() => setExpandedFaq(open ? null : i)}
                        aria-expanded={open}
                        aria-controls={panelId}
                        className="flex w-full items-start justify-between gap-6 py-5 text-left text-base font-medium text-neutral-900"
                      >
                        <span>{faq.question}</span>
                        <span
                          aria-hidden="true"
                          className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500"
                        >
                          {open ? (
                            <Minus className="size-3.5" />
                          ) : (
                            <Plus className="size-3.5" />
                          )}
                        </span>
                      </button>
                    </h3>
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      hidden={!open}
                      className="pb-6 pr-12 text-sm leading-relaxed text-neutral-600"
                    >
                      {faq.answer}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Related Features */}
        {feature.relatedFeatures && feature.relatedFeatures.length > 0 && (
          <section className="mx-auto max-w-5xl px-6 py-24">
            <div className="mx-auto max-w-2xl text-center">
              <SectionBadge label="Relacionades" />
              <h2 className="mt-4 text-3xl font-normal tracking-tight text-neutral-900 sm:text-4xl">
                Funcionalitats relacionades
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-neutral-600">
                Descobreix més característiques de Transcriu.
              </p>
            </div>

            <div className="mt-12 flex flex-wrap justify-center gap-2.5">
              {feature.relatedFeatures.map((relatedFeature, idx) => (
                <Link
                  key={idx}
                  href={`/features/${relatedFeature}`}
                  className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:border-neutral-300 hover:bg-neutral-50"
                >
                  {relatedFeature
                    .replace(/-/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                  <ArrowRight className="size-3.5 text-neutral-400" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Pricing */}
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
