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

export function Pricing({ authLoading, loading, onPrimaryAction, onContactClick }: PricingProps) {
  const t = useTranslations('pricing');
  const params = useParams();
  const locale = (params?.locale as 'ca' | 'es' | 'en') || 'ca';
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');

  const planOrder: PlanId[] = ['free', 'individual', 'team', 'organization'];

  return (
    <section id="pricing" className="py-20">
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          {t('title')}
        </h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          {t('subtitle')}
        </p>

        {/* Billing Period Toggle */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              billingPeriod === 'monthly'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('monthly')}
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              billingPeriod === 'yearly'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('yearly')}
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              billingPeriod === 'yearly'
                ? 'bg-green-400 text-green-900'
                : 'bg-green-100 text-green-700'
            }`}>
              -20%
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
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
