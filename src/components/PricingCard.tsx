"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

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
};

export function PricingCard({ plan, authLoading, loading, onPrimaryAction, onContactClick, orgCallsPrimaryAction = false }: PricingCardProps) {
  const [numberOfUsers, setNumberOfUsers] = useState(10);
  const [showTooltip, setShowTooltip] = useState(false);

  const calculatePricePerUser = (N: number) => {
    if (N <= 0) return 10;
    const base = 10; // €
    const minFraction = 0.65; // minimum = 6.5 €
    const discountFraction = 1 - minFraction; // 0.35
    const rate = 0.02; // speed of discount curve
    return base * (minFraction + discountFraction * Math.exp(-rate * (N - 1)));
  };

  return (
    <div
      className={`rounded-3xl p-8 relative flex flex-col h-full ${
        plan.highlighted
          ? "bg-white text-gray-900 shadow-2xl shadow-blue-500/25 border-2 border-blue-400"
          : "bg-white border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300"
      }`}
    >
      {plan.highlighted && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-blue-400 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
            Més Popular
          </div>
        </div>
      )}

      <div className="text-left">
        <h3 className={`text-2xl font-bold mb-2 ${plan.highlighted ? "text-gray-900" : "text-gray-900"}`}>
          {plan.name}
        </h3>
        <div className="mb-4">
          {plan.key === "group" ? (
            <div className="space-y-3">
              <div>
                <span className="text-5xl font-bold text-gray-900">
                  {Math.floor(calculatePricePerUser(numberOfUsers))}.00€
                </span>
                <span className="text-md text-gray-600"> /mes/usuari</span>
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
                    onChange={(e) => setNumberOfUsers(parseInt(e.target.value))}
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
                      {numberOfUsers} usuaris
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-800"></div>
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-md text-gray-500 mt-1">
                  <span>Usuaris</span>
                  <span className="font-bold text-md text-gray-800">{numberOfUsers}</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              <span className={`text-5xl font-bold ${plan.highlighted ? "text-gray-900" : "text-gray-900"}`}>
                {plan.price}
              </span>
              {plan.price !== "Personalitzat" && (
                <span className={`text-md ${plan.highlighted ? "text-gray-600" : "text-gray-600"}`}>
                  /mes
                </span>
              )}
            </>
          )}
        </div>
        <p className={`mb-8 text-md text-left ${plan.highlighted ? "text-gray-600" : "text-gray-600"}`}>
          {plan.description}
        </p>
      </div>

      <ul className="space-y-4 mb-8 flex-grow">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <CheckCircle2 className={`h-5 w-5 mt-0.5 flex-shrink-0 ${plan.highlighted ? "text-blue-500" : "text-blue-500"}`} />
            <span className={`text-sm leading-relaxed ${plan.highlighted ? "text-gray-700" : "text-gray-700"}`}>
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-auto">
        {plan.key === "group" && !orgCallsPrimaryAction ? (
          <Button
            onClick={onContactClick}
            className={`w-full py-6 rounded-lg font-semibold text-lg transition-all duration-200 ${
              plan.highlighted
                ? "bg-blue-500 text-white hover:bg-blue-600 shadow-lg hover:shadow-xl"
                : "bg-blue-500 text-white hover:bg-blue-600 shadow-lg hover:shadow-xl"
            }`}
          >
            Contacta amb vendes
          </Button>
        ) : (
          <Button
            onClick={() =>
              orgCallsPrimaryAction && plan.key === "group"
                ? onPrimaryAction({ users: numberOfUsers })
                : onPrimaryAction()
            }
            disabled={authLoading || loading}
            className={`w-full py-6 rounded-lg font-semibold text-lg transition-all duration-200 ${
              plan.highlighted
                ? "bg-blue-500 text-white hover:bg-blue-600 shadow-lg hover:shadow-xl"
                : "bg-blue-500 text-white hover:bg-blue-600 shadow-lg hover:shadow-xl"
            }`}
          >
            {plan.key === "free" ? "Comença gratis" : "Començar"}
          </Button>
        )}
      </div>
    </div>
  );
}