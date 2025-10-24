"use client";

import { useState } from "react";
import { PricingCard, type PricingPlan } from "@/components/PricingCard";

type PricingProps = {
  authLoading: boolean;
  loading: boolean;
  onPrimaryAction: () => void;
  onContactClick: () => void;
};

const initialPlans: PricingPlan[] = [
  {
    key: "paid",
    name: "Individual",
    price: "7€",
    description: "Transcripcions il·limitades per a professionals.",
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
    key: "group",
    name: "Grupal",
    price: "Personalitzat",
    description:
      "Solucions escalables per a equips i necessitats personalitzades",
    features: [
      "Usuaris il·limitats per a l'equip",
      "Gestió centralitzada d'usuaris i permisos",
      "Suport dedicat",
      "Descomptes per volum",
      "Funcionalitats personalitzades",
      "Formació i onboarding per a l'equip",
    ],
    highlighted: false,
  },
];

export function Pricing({ authLoading, loading, onPrimaryAction, onContactClick }: PricingProps) {
  return (
    <section id="pricing" className="py-20">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Plans per a cada necessitat
        </h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Comença gratis i escala segons les teves necessitats professionals
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
        {initialPlans.map((plan) => (
          <PricingCard
            key={plan.key}
            plan={plan}
            authLoading={authLoading}
            loading={loading}
            onPrimaryAction={onPrimaryAction}
            onContactClick={onContactClick}
          />
        ))}
      </div>
    </section>
  );
}