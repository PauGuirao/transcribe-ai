"use client";

import { useState } from "react";
import { Minus, Plus, Clock } from "lucide-react";
import { useTranslations } from 'next-intl';
import { type PlanConfig, type BillingPeriod, getMonthlyEquivalent, formatMinutesAllowance } from "@/config/pricing";

export type PricingPlan = {
  key: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted: boolean;
};

type PricingCardProps = {
  plan: PlanConfig;
  locale: 'ca' | 'es' | 'en';
  billingPeriod: BillingPeriod;
  authLoading: boolean;
  loading: boolean;
  onSelect: (users?: number) => void;
};

function CheckIcon() {
  return (
    <svg className="mt-0.5 size-4 shrink-0 text-emerald-600" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 10.5l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PricingCard({
  plan,
  locale,
  billingPeriod,
  authLoading,
  loading,
  onSelect,
}: PricingCardProps) {
  const t = useTranslations('pricing');
  const [userCount, setUserCount] = useState(plan.users.min);

  const isFreePlan = plan.id === 'free';
  const needsUserInput = plan.perUser && plan.users.max > plan.users.min;

  const monthlyPrice = billingPeriod === 'monthly'
    ? plan.pricing.monthly
    : getMonthlyEquivalent(plan.id, 'yearly');

  const totalPrice = plan.perUser
    ? (billingPeriod === 'monthly' ? plan.pricing.monthly * userCount : plan.pricing.yearly * userCount)
    : (billingPeriod === 'monthly' ? plan.pricing.monthly : plan.pricing.yearly);

  const handleSelect = () => {
    if (plan.perUser) {
      onSelect(userCount);
    } else {
      onSelect();
    }
  };

  return (
    <div
      className={`relative flex h-full flex-col rounded-2xl border bg-white p-6 transition-shadow ${
        plan.highlighted
          ? "border-neutral-900 shadow-lg"
          : "border-neutral-200 hover:shadow-md"
      }`}
    >
      {plan.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-1 text-[11px] font-medium text-white">
            <span className="inline-flex size-1.5 rounded-full bg-emerald-400" />
            {t('mostPopular')}
          </span>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-neutral-900">
          {plan.name[locale]}
        </h3>
        <p className="mt-1 text-sm text-neutral-500">
          {plan.description[locale]}
        </p>
      </div>

      <div className="mt-6">
        {isFreePlan ? (
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-semibold tracking-tight text-neutral-900">0€</span>
            <span className="text-sm text-neutral-500">/{t('month')}</span>
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-semibold tracking-tight text-neutral-900">{monthlyPrice}€</span>
              <span className="text-sm text-neutral-500">
                {plan.perUser ? `/${t('userMonth')}` : `/${t('month')}`}
              </span>
            </div>
            {billingPeriod === 'yearly' && (
              <p className="mt-1 text-xs text-emerald-600">
                {t('billedYearly')}: {totalPrice}€/{t('year')}
              </p>
            )}
          </>
        )}
      </div>

      <div className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-700">
        <Clock className="size-3.5 text-neutral-500" />
        {formatMinutesAllowance(plan.limits.minutesPerMonth, locale)} {locale === 'en' ? '/ month' : locale === 'es' ? '/ mes' : '/ mes'}
      </div>

      {needsUserInput && (
        <div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <label className="block text-xs font-medium text-neutral-700">
            {t('numberOfUsers')}
          </label>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => setUserCount(Math.max(plan.users.min, userCount - 1))}
              disabled={userCount <= plan.users.min}
              className="flex size-8 items-center justify-center rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 disabled:opacity-50"
            >
              <Minus className="size-3.5" />
            </button>
            <input
              type="number"
              min={plan.users.min}
              max={plan.users.max}
              value={userCount}
              onChange={(e) => {
                const val = parseInt(e.target.value) || plan.users.min;
                setUserCount(Math.min(Math.max(val, plan.users.min), plan.users.max));
              }}
              className="h-8 w-14 rounded-md border border-neutral-200 bg-white text-center text-sm font-medium"
            />
            <button
              onClick={() => setUserCount(Math.min(plan.users.max, userCount + 1))}
              disabled={userCount >= plan.users.max}
              className="flex size-8 items-center justify-center rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 disabled:opacity-50"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
          {plan.perUser && (
            <p className="mt-2 text-xs font-medium text-neutral-900">
              {billingPeriod === 'monthly'
                ? `${plan.pricing.monthly * userCount}€/${t('month')}`
                : `${plan.pricing.yearly * userCount}€/${t('year')}`}
            </p>
          )}
        </div>
      )}

      <ul className="mt-6 flex-1 space-y-3">
        {plan.features[locale].map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm text-neutral-700">
            <CheckIcon />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        disabled={authLoading || loading}
        onClick={handleSelect}
        className={`mt-8 inline-flex h-10 w-full items-center justify-center rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${
          plan.highlighted
            ? "bg-neutral-900 text-white hover:bg-neutral-800"
            : isFreePlan
            ? "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50"
            : "bg-neutral-900 text-white hover:bg-neutral-800"
        }`}
      >
        {loading ? t('loading') : isFreePlan ? t('startFree') : t('subscribe')}
      </button>
    </div>
  );
}
