"use client";

import { useState } from "react";
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
import { CheckCircle2, Loader2 } from "lucide-react";

interface ClientLandingProps {
  landing: {
    heroTitle: string;
    heroDescription: string;
  };
}

export default function ClientLanding({ landing }: ClientLandingProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
        {/* Hero Section */}
        <Hero title={landing.heroTitle} description={landing.heroDescription} />
        {/* How It Works Section */}
        <HowItWorks />
        {/* Features Section */}
        <Features />
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
                className="bg-blue-500 hover:bg-blue-600 text-white"
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
                  className="bg-blue-500 hover:bg-blue-600 text-white"
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