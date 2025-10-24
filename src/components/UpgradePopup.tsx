"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PricingCard, type PricingPlan } from "@/components/PricingCard";

type UpgradePopupProps = {
  isOpen: boolean;
  onClose: () => void;
};

const plans: PricingPlan[] = [
  {
    key: "paid",
    name: "Pro",
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
    description: "Solucions escalables per a equips",
    features: [
      "Usuaris il·limitats per a l'equip",
      "Gestió centralitzada d'usuaris i permisos",
      "Suport dedicat",
      "Descomptes per volum",
    ],
    highlighted: false,
  },
];

export default function UpgradePopup({ isOpen, onClose }: UpgradePopupProps) {
  const router = useRouter();

  const handlePrimaryAction = () => {
    router.push("/payment");
  };

  const handleContactClick = () => {
    router.push("/payment");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[900px] max-w-[900px] w-[50vw]">
        <DialogHeader>
          <DialogTitle>Funcionalitat limitada</DialogTitle>
          <DialogDescription>
            Estàs al pla gratuït. Per transcriure, cal un pla de pagament. Tria una opció:
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          {plans.map((plan) => (
            <PricingCard
              key={plan.key}
              plan={plan}
              authLoading={false}
              loading={false}
              onPrimaryAction={(opts) => handlePrimaryAction()}
              onContactClick={handleContactClick}
              orgCallsPrimaryAction={plan.key === "group"}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}