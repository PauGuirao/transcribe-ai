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
import { Pricing } from "@/components/Pricing";
import { type PlanId, type BillingPeriod } from "@/config/pricing";

type UpgradePopupProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function UpgradePopup({ isOpen, onClose }: UpgradePopupProps) {
  const router = useRouter();

  const handlePlanSelect = (planId: PlanId, period: BillingPeriod, users?: number) => {
    // Close the dialog
    onClose();

    // Redirect to payment with plan details
    const params = new URLSearchParams({
      plan: planId,
      period: period,
      ...(users && { users: users.toString() }),
    });
    router.push(`/payment?${params.toString()}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[1200px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Funcionalitat limitada</DialogTitle>
          <DialogDescription>
            Estàs al pla gratuït. Per transcriure sense límits, tria un pla de pagament.
          </DialogDescription>
        </DialogHeader>

        <Pricing
          authLoading={false}
          loading={false}
          onPrimaryAction={handlePlanSelect}
        />
      </DialogContent>
    </Dialog>
  );
}
