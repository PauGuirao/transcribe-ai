"use client";

import { PricingCard, type PricingPlan } from "@/components/PricingCard";
import { useTranslations } from 'next-intl';

type PricingProps = {
  authLoading: boolean;
  loading: boolean;
  onPrimaryAction: () => void;
  onContactClick: () => void;
};

export function Pricing({ authLoading, loading, onPrimaryAction, onContactClick }: PricingProps) {
  const t = useTranslations('pricing');

  const plans: PricingPlan[] = [
    {
      key: "paid",
      name: t('individual.name'),
      price: t('individual.price'),
      description: t('individual.description'),
      features: t.raw('individual.features') as string[],
      highlighted: true,
    },
    {
      key: "group",
      name: t('group.name'),
      price: t('group.price'),
      description: t('group.description'),
      features: t.raw('group.features') as string[],
      highlighted: false,
    },
  ];

  return (
    <section id="pricing" className="py-20">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          {t('title')}
        </h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          {t('subtitle')}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
        {plans.map((plan) => (
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