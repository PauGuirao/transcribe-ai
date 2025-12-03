"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  AlertTriangle,
  Mail,
  Loader2,
  CheckCircle
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";

export default function HelpPage() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    problemType: ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
          name: user?.user_metadata?.full_name || user?.email || "Usuari",
          email: user?.email || "",
          subject: `[Transcriu Support] ${formData.subject}`,
          message: `
Tipus de problema: ${formData.problemType}
Usuari: ${user?.user_metadata?.full_name || user?.email || "Usuari"} (${user?.email})

Descripció del problema:
${formData.description}

---
Informació de l'usuari:
- Email: ${user?.email || 'No disponible'}
- Nom: ${user?.user_metadata?.full_name || 'No disponible'}
- Data: ${new Date().toLocaleString('ca-ES')}
          `,
        }),
      });

      if (response.ok) {
        setIsSubmitted(true);
        setFormData({
          subject: "",
          description: "",
          problemType: ""
        });
      } else {
        throw new Error("Error en enviar el formulari");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Hi ha hagut un error en enviar el teu informe. Si us plau, torna-ho a intentar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-8 pt-14 max-w-5xl mx-auto">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Centre d'Ajuda</h1>
            <p className="text-muted-foreground">
              Troba respostes a les teves preguntes i obté suport tècnic
            </p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="space-y-8">
            {/* Form Section */}
            <div>
              {isSubmitted ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-6" />
                  <h3 className="text-2xl font-semibold text-green-700 mb-3">
                    Informe enviat correctament!
                  </h3>
                  <p className="text-muted-foreground mb-6 text-lg">
                    Hem rebut el teu informe i el nostre equip et respondrà en un termini de 24-48 hores laborables.
                  </p>
                  <Button 
                    onClick={() => setIsSubmitted(false)}
                    variant="outline"
                    size="lg"
                  >
                    Enviar un altre informe
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="problemType" className="text-base font-medium">Tipus de problema *</Label>
                      <select
                        id="problemType"
                        name="problemType"
                        value={formData.problemType}
                        onChange={handleInputChange}
                        required
                        className="flex h-12 w-full rounded-lg border border-input bg-background px-4 py-3 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Selecciona el tipus de problema</option>
                        <option value="transcription">Errors de transcripció</option>
                        <option value="upload">Problemes de càrrega d'arxius</option>
                        <option value="billing">Errors de facturació</option>
                        <option value="account">Problemes d'accés al compte</option>
                        <option value="performance">Problemes de rendiment</option>
                        <option value="other">Altre</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject" className="text-base font-medium">Assumpte *</Label>
                      <Input
                        id="subject"
                        name="subject"
                        type="text"
                        placeholder="Resum breu del problema"
                        value={formData.subject}
                        onChange={handleInputChange}
                        required
                        className="h-12 text-base"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-base font-medium">Descripció detallada *</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Descriu el problema en detall. Inclou els passos per reproduir l'error, captures de pantalla si és possible, i qualsevol informació addicional que pugui ser útil."
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                      rows={12}
                      className="text-base resize-none min-h-[300px]"
                    />
                  </div>

                  <div className="pt-4">
                    <Button 
                      type="submit"
                      className="w-full h-14 text-base"
                      variant="default"
                      size="lg"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                          Enviant informe...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-3 h-6 w-6" />
                          Enviar Informe
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}