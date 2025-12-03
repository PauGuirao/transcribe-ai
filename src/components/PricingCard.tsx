"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from 'next-intl';

export type PricingPlan = {
  key: "free" | "paid" | "group";
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted: boolean;
};

type PricingCardProps = {
  plan: PricingPlan;
  authLoading: boolean;
  loading: boolean;
  onPrimaryAction: (opts?: { users?: number }) => void;
  onContactClick: () => void;
  orgCallsPrimaryAction?: boolean; // when true, org button will call onPrimaryAction instead of contact
  // NEW: allow parent to control/observe users selection
  initialUsers?: number;
  onUsersChange?: (users: number) => void;
};

export function PricingCard({ plan, authLoading, loading, onPrimaryAction, onContactClick, orgCallsPrimaryAction = false, initialUsers, onUsersChange }: PricingCardProps) {
  const t = useTranslations('pricing');
  const [numberOfUsers, setNumberOfUsers] = useState(initialUsers ?? 10);
  const [showTooltip, setShowTooltip] = useState(false);

  const calculatePricePerUser = (N: number) => {
    if (N <= 0) return 7;
    const base = 7; // €
    const minFraction = 0.45; // minimum = 4.5 €
    const discountFraction = 1 - minFraction; // 0.25
    const rate = 0.02; // speed of discount curve
    return base * (minFraction + discountFraction * Math.exp(-rate * (N - 1)));
  };

  return (
    <div
      className={`rounded-3xl p-8 relative flex flex-col h-full ${plan.highlighted
          ? "bg-white text-gray-900 shadow-2xl shadow-blue-500/25 border-2 border-blue-400"
          : "bg-white border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300"
        }`}
    >
      {plan.highlighted && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-blue-400 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
            {t('mostPopular')}
          </div>
        </div>
      )}

      <div className="text-left flex flex-col h-full">
        <h3 className={`text-2xl font-bold mb-2 ${plan.highlighted ? "text-gray-900" : "text-gray-900"}`}>
          {plan.name}
        </h3>
        <div className="mb-4 flex-1">
          {plan.key === "group" ? (
            <div className="space-y-3">
              <div>
                <span className="text-5xl font-bold text-gray-900">
                  {Math.floor(calculatePricePerUser(numberOfUsers))}.00€
                </span>
                <span className="text-md text-gray-600">{t('perMonthPerUser')}</span>
              </div>
              <div className="pt-2">
                <div className="relative">
                  <input
                    id="users-slider"
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={numberOfUsers}
                    onChange={(e) => {
                      const n = parseInt(e.target.value);
                      setNumberOfUsers(n);
                      onUsersChange?.(n);
                    }}
                    onMouseDown={() => setShowTooltip(true)}
                    onMouseUp={() => setShowTooltip(false)}
                    onTouchStart={() => setShowTooltip(true)}
                    onTouchEnd={() => setShowTooltip(false)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  {showTooltip && (
                    <div
                      className="absolute -top-6 bg-blue-500 text-white px-2 py-1 rounded text-sm font-bold pointer-events-none transform -translate-x-1/2"
                      style={{
                        left: `${((numberOfUsers - 5) / (100 - 5)) * 100}%`,
                      }}
                    >
                      {numberOfUsers} {t('users').toLowerCase()}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-800"></div>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2 text-md text-gray-600">
                  <span>{t('users')}</span>
                  <span className="font-bold">{numberOfUsers}</span>
                </div>
              </div>

              {/* Features list */}
              <ul className="mt-4 space-y-2">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* Actions */}
              <div className="mt-6 flex gap-3">
                <Button
                  disabled={authLoading || loading}
                  onClick={() => onPrimaryAction?.({ users: numberOfUsers })}
                  className="flex-1"
                >
                  {loading ? t('loading') : t('continue')}
                </Button>
                {!orgCallsPrimaryAction && (
                  <Button variant="outline" onClick={onContactClick}>
                    {t('contact')}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            // Non-group pricing UI (unchanged)
            <div className="space-y-3 flex flex-col h-full">
              <div>
                <span className="text-5xl font-bold text-gray-900">{plan.price}</span>
                <span className="text-md text-gray-600">{t('perMonth')}</span>
                <p className="text-sm mt-4 text-gray-600">{plan.description}</p>
              </div>
              <ul className="mt-4 space-y-3">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex gap-3 mt-auto">
                <Button disabled={authLoading || loading} onClick={() => onPrimaryAction?.()} className="flex-1">
                  {loading ? t('loading') : t('continue')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}