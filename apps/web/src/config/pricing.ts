/**
 * Pricing configuration — single source of truth for all plan data.
 *
 * Pricing model: minute-based. Each plan grants a monthly allowance of
 * transcription minutes. Going over the cap blocks new uploads until the
 * next billing cycle (or upgrade) — see usage tracking in the backend.
 *
 * Plan IDs (`free`, `basic`, `pro`, `studio`) are positioned by audio volume.
 * Feature set is identical across all paid tiers — the only differentiator is
 * the monthly minute budget (and seat count on `studio`).
 */

export type PlanId = 'free' | 'basic' | 'pro' | 'studio';
export type BillingPeriod = 'monthly' | 'yearly';

export interface PlanConfig {
  id: PlanId;
  name: { ca: string; es: string; en: string };
  description: { ca: string; es: string; en: string };
  pricing: {
    monthly: number; // €/month
    yearly: number;  // €/year (total — divide by 12 for /mo equivalent)
  };
  perUser: boolean;
  users: { min: number; max: number };
  limits: {
    minutesPerMonth: number | null;
  };
  features: { ca: string[]; es: string[]; en: string[] };
  stripePriceIds: {
    monthly: string | null;
    yearly: string | null;
  };
  highlighted?: boolean;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    name: { ca: 'Prova', es: 'Prueba', en: 'Trial' },
    description: {
      ca: 'Per a provar la plataforma',
      es: 'Para probar la plataforma',
      en: 'For trying out the platform',
    },
    pricing: { monthly: 0, yearly: 0 },
    perUser: false,
    users: { min: 1, max: 1 },
    limits: {
      minutesPerMonth: 10,
    },
    features: {
      ca: [
        '10 min de transcripció / mes',
        'Identificació de parlants (diarització)',
        'Exportar PDF, DOCX i TXT',
        'Editor avançat',
        'Plantilles de resum clínic amb IA',
        'Glossari personalitzat',
      ],
      es: [
        '10 min de transcripción / mes',
        'Identificación de hablantes (diarización)',
        'Exportar PDF, DOCX y TXT',
        'Editor avanzado',
        'Plantillas de resumen clínico con IA',
        'Glosario personalizado',
      ],
      en: [
        '10 min of transcription / month',
        'Speaker diarization',
        'Export PDF, DOCX and TXT',
        'Advanced editor',
        'AI-generated clinical summary templates',
        'Custom vocabulary glossary',
      ],
    },
    stripePriceIds: { monthly: null, yearly: null },
  },

  // Bàsic — part-time / casual use, ~10 h/mo of audio.
  basic: {
    id: 'basic',
    name: { ca: 'Bàsic', es: 'Básico', en: 'Basic' },
    description: {
      ca: 'Per a ús casual i pràctica privada inicial',
      es: 'Para uso casual y práctica privada inicial',
      en: 'For casual use and early private practice',
    },
    pricing: { monthly: 9, yearly: 84 }, // €7/mo annual → ~22% discount
    perUser: false,
    users: { min: 1, max: 200 },
    limits: {
      minutesPerMonth: 600,
    },
    features: {
      ca: [
        '10 hores (600 min) de transcripció / mes',
        'Usuaris il·limitats compartint el mateix límit',
        'Identificació de parlants (diarització)',
        'Exportar PDF, DOCX i TXT',
        'Editor avançat',
        'Plantilles de resum clínic amb IA',
        'Glossari personalitzat',
      ],
      es: [
        '10 horas (600 min) de transcripción / mes',
        'Usuarios ilimitados compartiendo el mismo límite',
        'Identificación de hablantes (diarización)',
        'Exportar PDF, DOCX y TXT',
        'Editor avanzado',
        'Plantillas de resumen clínico con IA',
        'Glosario personalizado',
      ],
      en: [
        '10 hours (600 min) of transcription / month',
        'Unlimited users sharing the same allowance',
        'Speaker diarization',
        'Export PDF, DOCX and TXT',
        'Advanced editor',
        'AI-generated clinical summary templates',
        'Custom vocabulary glossary',
      ],
    },
    stripePriceIds: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC_MONTHLY || null,
      yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC_YEARLY || null,
    },
  },

  // Pro — full-time logopeda, ~50 h/mo of audio. Most popular tier.
  pro: {
    id: 'pro',
    name: { ca: 'Pro', es: 'Pro', en: 'Pro' },
    description: {
      ca: 'Per a logopedes a temps complet',
      es: 'Para logopedas a tiempo completo',
      en: 'For full-time speech therapists',
    },
    pricing: { monthly: 19, yearly: 180 }, // €15/mo annual → ~21% discount
    perUser: false,
    users: { min: 1, max: 200 },
    limits: {
      minutesPerMonth: 3000,
    },
    features: {
      ca: [
        '50 hores (3.000 min) de transcripció / mes',
        'Usuaris il·limitats compartint el mateix límit',
        'Identificació de parlants (diarització)',
        'Exportar PDF, DOCX i TXT',
        'Editor avançat',
        'Plantilles de resum clínic amb IA',
        'Glossari personalitzat',
      ],
      es: [
        '50 horas (3.000 min) de transcripción / mes',
        'Usuarios ilimitados compartiendo el mismo límite',
        'Identificación de hablantes (diarización)',
        'Exportar PDF, DOCX y TXT',
        'Editor avanzado',
        'Plantillas de resumen clínico con IA',
        'Glosario personalizado',
      ],
      en: [
        '50 hours (3,000 min) of transcription / month',
        'Unlimited users sharing the same allowance',
        'Speaker diarization',
        'Export PDF, DOCX and TXT',
        'Advanced editor',
        'AI-generated clinical summary templates',
        'Custom vocabulary glossary',
      ],
    },
    stripePriceIds: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY || null,
      yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY || null,
    },
    highlighted: true,
  },

  // Estudi — clinic / power user, ~150 h/mo of audio. Unlimited seats sharing pool
  // (with a 200-seat safety cap to prevent abuse).
  studio: {
    id: 'studio',
    name: { ca: 'Estudi', es: 'Estudio', en: 'Studio' },
    description: {
      ca: 'Per a clíniques i equips petits',
      es: 'Para clínicas y equipos pequeños',
      en: 'For clinics and small teams',
    },
    pricing: { monthly: 49, yearly: 468 }, // €39/mo annual → ~20% discount
    perUser: false,
    users: { min: 1, max: 200 },
    limits: {
      minutesPerMonth: 9000,
    },
    features: {
      ca: [
        '150 hores (9.000 min) de transcripció / mes',
        'Usuaris il·limitats compartint el mateix límit',
        'Identificació de parlants (diarització)',
        'Exportar PDF, DOCX i TXT',
        'Editor avançat',
        'Plantilles de resum clínic amb IA',
        'Glossari personalitzat',
      ],
      es: [
        '150 horas (9.000 min) de transcripción / mes',
        'Usuarios ilimitados compartiendo el mismo límite',
        'Identificación de hablantes (diarización)',
        'Exportar PDF, DOCX y TXT',
        'Editor avanzado',
        'Plantillas de resumen clínico con IA',
        'Glosario personalizado',
      ],
      en: [
        '150 hours (9,000 min) of transcription / month',
        'Unlimited users sharing the same allowance',
        'Speaker diarization',
        'Export PDF, DOCX and TXT',
        'Advanced editor',
        'AI-generated clinical summary templates',
        'Custom vocabulary glossary',
      ],
    },
    stripePriceIds: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_STUDIO_MONTHLY || null,
      yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_STUDIO_YEARLY || null,
    },
  },
};

/* ----------------------------- Helpers ------------------------------- */

export function getPlan(planId: PlanId): PlanConfig {
  return PLANS[planId];
}

export function getAllPlans(): PlanConfig[] {
  return Object.values(PLANS);
}

export function getPlanPrice(planId: PlanId, period: BillingPeriod, users: number = 1): number {
  const plan = PLANS[planId];
  const base = period === 'monthly' ? plan.pricing.monthly : plan.pricing.yearly;
  return plan.perUser ? base * users : base;
}

export function getMonthlyEquivalent(planId: PlanId, period: BillingPeriod): number {
  const plan = PLANS[planId];
  if (period === 'monthly') return plan.pricing.monthly;
  return Math.round((plan.pricing.yearly / 12) * 100) / 100;
}

export function getYearlyDiscount(planId: PlanId): number {
  const plan = PLANS[planId];
  if (plan.pricing.monthly === 0) return 0;
  const monthlyTotal = plan.pricing.monthly * 12;
  const yearlyTotal = plan.pricing.yearly;
  return Math.round((1 - yearlyTotal / monthlyTotal) * 100);
}

export function validateUserCount(planId: PlanId, users: number): { valid: boolean; message?: string } {
  const plan = PLANS[planId];
  if (users < plan.users.min) {
    return { valid: false, message: `Mínim ${plan.users.min} usuaris per aquest pla` };
  }
  if (users > plan.users.max) {
    return { valid: false, message: `Màxim ${plan.users.max} usuaris per aquest pla` };
  }
  return { valid: true };
}

export function getStripePriceId(planId: PlanId, period: BillingPeriod): string | null {
  return PLANS[planId].stripePriceIds[period];
}

/** Format a monthly minute allowance for display: "60 min", "10 h", "150 h". */
export function formatMinutesAllowance(minutes: number | null, locale: 'ca' | 'es' | 'en' = 'ca'): string {
  if (minutes === null) return locale === 'en' ? 'Unlimited' : locale === 'es' ? 'Ilimitado' : 'Il·limitat';
  if (minutes < 120) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `${hours} h`;
}
