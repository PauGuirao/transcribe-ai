"use client";

import { useState } from "react";
import { PricingCard } from "@/components/PricingCard";
import { PLANS, type PlanId, type BillingPeriod } from "@/config/pricing";
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';

type PricingProps = {
  authLoading: boolean;
  loading: boolean;
  onPrimaryAction: (planId: PlanId, period: BillingPeriod, users?: number) => void;
  onContactClick?: () => void;
};

export function Pricing({ authLoading, loading, onPrimaryAction }: PricingProps) {
  const t = useTranslations('pricing');
  const params = useParams();
  const locale = (params?.locale as 'ca' | 'es' | 'en') || 'es';
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');

  const planOrder: PlanId[] = ['free', 'basic', 'pro', 'studio'];

  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm">
          <span className="inline-flex size-1.5 rounded-full bg-indigo-500" />
          Pricing
        </span>
        <h2 className="mt-4 text-3xl font-normal tracking-tight text-neutral-900 sm:text-4xl">
          {t('title')}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-neutral-600">
          {t('subtitle')}
        </p>

        <div className="mt-8 inline-flex items-center rounded-full border border-neutral-200 bg-white p-1 text-sm">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`rounded-full px-4 py-1.5 font-medium transition-colors ${
              billingPeriod === 'monthly'
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            {t('monthly')}
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 font-medium transition-colors ${
              billingPeriod === 'yearly'
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            {t('yearly')}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
              billingPeriod === 'yearly'
                ? 'bg-emerald-500 text-white'
                : 'bg-emerald-50 text-emerald-700'
            }`}>
              −20%
            </span>
          </button>
        </div>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {planOrder.map((planId) => {
          const plan = PLANS[planId];
          return (
            <PricingCard
              key={planId}
              plan={plan}
              locale={locale}
              billingPeriod={billingPeriod}
              authLoading={authLoading}
              loading={loading}
              onSelect={(users) => onPrimaryAction(planId, billingPeriod, users)}
            />
          );
        })}
      </div>
    </section>
  );
}
