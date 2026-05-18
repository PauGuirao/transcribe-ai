"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Minus } from "lucide-react";
import { useTranslations } from 'next-intl';
import { type PlanConfig, type BillingPeriod, getMonthlyEquivalent } from "@/config/pricing";

// Legacy type alias for backwards compatibility with team page
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

  // Calculate display price
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
      className={`rounded-2xl p-6 relative flex flex-col h-full transition-all duration-300 ${
        plan.highlighted
          ? "bg-white shadow-xl shadow-blue-500/20 border-2 border-blue-500 scale-[1.02]"
          : "bg-white border border-gray-200 hover:border-blue-300 hover:shadow-lg"
      }`}
    >
      {/* Popular badge */}
      {plan.highlighted && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
            {t('mostPopular')}
          </div>
        </div>
      )}

      {/* Plan name and description */}
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-900 mb-1">
          {plan.name[locale]}
        </h3>
        <p className="text-sm text-gray-500">
          {plan.description[locale]}
        </p>
      </div>

      {/* Price */}
      <div className="mb-6">
        {isFreePlan ? (
          <div className="flex items-baseline">
            <span className="text-4xl font-bold text-gray-900">0</span>
            <span className="text-xl font-bold text-gray-900">€</span>
            <span className="text-gray-500 ml-1">/{t('month')}</span>
          </div>
        ) : (
          <>
            <div className="flex items-baseline">
              <span className="text-4xl font-bold text-gray-900">{monthlyPrice}</span>
              <span className="text-xl font-bold text-gray-900">€</span>
              <span className="text-gray-500 ml-1">
                {plan.perUser ? `/${t('userMonth')}` : `/${t('month')}`}
              </span>
            </div>
            {billingPeriod === 'yearly' && (
              <p className="text-sm text-green-600 mt-1">
                {t('billedYearly')}: {totalPrice}€/{t('year')}
              </p>
            )}
          </>
        )}
      </div>

      {/* User count input for team/org plans */}
      {needsUserInput && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('numberOfUsers')}
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setUserCount(Math.max(plan.users.min, userCount - 1))}
              disabled={userCount <= plan.users.min}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Minus className="w-4 h-4" />
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
              className="w-16 h-10 text-center border border-gray-300 rounded-lg font-semibold"
            />
            <button
              onClick={() => setUserCount(Math.min(plan.users.max, userCount + 1))}
              disabled={userCount >= plan.users.max}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-lg">+</span>
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {plan.users.min}-{plan.users.max} {t('users')}
          </p>
          {plan.perUser && (
            <p className="text-sm font-medium text-gray-900 mt-2">
              Total: {billingPeriod === 'monthly'
                ? `${plan.pricing.monthly * userCount}€/${t('month')}`
                : `${plan.pricing.yearly * userCount}€/${t('year')}`
              }
            </p>
          )}
        </div>
      )}

      {/* Features list */}
      <ul className="space-y-3 mb-6 flex-1">
        {plan.features[locale].map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <Button
        disabled={authLoading || loading}
        onClick={handleSelect}
        className={`w-full ${
          plan.highlighted
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : isFreePlan
            ? 'bg-gray-100 hover:bg-gray-200 text-gray-900'
            : 'bg-gray-900 hover:bg-gray-800 text-white'
        }`}
        variant={isFreePlan ? "outline" : "default"}
      >
        {loading ? t('loading') : isFreePlan ? t('startFree') : t('subscribe')}
      </Button>
    </div>
  );
}
