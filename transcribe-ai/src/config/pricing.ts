/**
 * Pricing configuration - Single source of truth for all pricing data
 */

export type PlanId = 'free' | 'individual' | 'team' | 'organization';
export type BillingPeriod = 'monthly' | 'yearly';

export interface PlanConfig {
  id: PlanId;
  name: {
    ca: string;
    es: string;
    en: string;
  };
  description: {
    ca: string;
    es: string;
    en: string;
  };
  pricing: {
    monthly: number;
    yearly: number; // Total per year
  };
  perUser: boolean; // If true, price is per user
  users: {
    min: number;
    max: number;
  };
  limits: {
    minutesPerMonth: number | null; // null = unlimited
    diarization: boolean;
    exports: boolean;
    advancedEditor: boolean;
    teamManagement: boolean;
    sharedLibrary: boolean;
    prioritySupport: boolean;
    centralizedBilling: boolean;
  };
  features: {
    ca: string[];
    es: string[];
    en: string[];
  };
  stripePriceIds: {
    monthly: string | null;
    yearly: string | null;
  };
  highlighted?: boolean;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    name: {
      ca: 'Gratuït',
      es: 'Gratuito',
      en: 'Free',
    },
    description: {
      ca: 'Perfecte per provar la plataforma',
      es: 'Perfecto para probar la plataforma',
      en: 'Perfect for trying the platform',
    },
    pricing: {
      monthly: 0,
      yearly: 0,
    },
    perUser: false,
    users: {
      min: 1,
      max: 1,
    },
    limits: {
      minutesPerMonth: 60,
      diarization: false,
      exports: false,
      advancedEditor: false,
      teamManagement: false,
      sharedLibrary: false,
      prioritySupport: false,
      centralizedBilling: false,
    },
    features: {
      ca: [
        '60 minuts de transcripció/mes',
        'Transcripció bàsica',
        'Exportar TXT',
        '1 usuari',
      ],
      es: [
        '60 minutos de transcripción/mes',
        'Transcripción básica',
        'Exportar TXT',
        '1 usuario',
      ],
      en: [
        '60 minutes transcription/month',
        'Basic transcription',
        'Export TXT',
        '1 user',
      ],
    },
    stripePriceIds: {
      monthly: null,
      yearly: null,
    },
  },
  individual: {
    id: 'individual',
    name: {
      ca: 'Individual',
      es: 'Individual',
      en: 'Individual',
    },
    description: {
      ca: 'Per a professionals independents',
      es: 'Para profesionales independientes',
      en: 'For independent professionals',
    },
    pricing: {
      monthly: 9,
      yearly: 86,
    },
    perUser: false,
    users: {
      min: 1,
      max: 1,
    },
    limits: {
      minutesPerMonth: null,
      diarization: true,
      exports: true,
      advancedEditor: true,
      teamManagement: false,
      sharedLibrary: false,
      prioritySupport: true,
      centralizedBilling: false,
    },
    features: {
      ca: [
        'Transcripcions il·limitades',
        'Diarització (identificació de parlants)',
        'Exportar PDF, DOCX, TXT',
        'Editor avançat',
        'Suport prioritari',
      ],
      es: [
        'Transcripciones ilimitadas',
        'Diarización (identificación de hablantes)',
        'Exportar PDF, DOCX, TXT',
        'Editor avanzado',
        'Soporte prioritario',
      ],
      en: [
        'Unlimited transcriptions',
        'Diarization (speaker identification)',
        'Export PDF, DOCX, TXT',
        'Advanced editor',
        'Priority support',
      ],
    },
    stripePriceIds: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_INDIVIDUAL_MONTHLY || null,
      yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_INDIVIDUAL_YEARLY || null,
    },
    highlighted: true,
  },
  team: {
    id: 'team',
    name: {
      ca: 'Equip',
      es: 'Equipo',
      en: 'Team',
    },
    description: {
      ca: 'Per a petits equips i clíniques',
      es: 'Para pequeños equipos y clínicas',
      en: 'For small teams and clinics',
    },
    pricing: {
      monthly: 7,
      yearly: 67,
    },
    perUser: true,
    users: {
      min: 3,
      max: 10,
    },
    limits: {
      minutesPerMonth: null,
      diarization: true,
      exports: true,
      advancedEditor: true,
      teamManagement: true,
      sharedLibrary: true,
      prioritySupport: true,
      centralizedBilling: false,
    },
    features: {
      ca: [
        'Tot d\'Individual inclòs',
        '3-10 usuaris',
        'Gestió d\'equip',
        'Biblioteca compartida',
        'Permisos per rol',
      ],
      es: [
        'Todo de Individual incluido',
        '3-10 usuarios',
        'Gestión de equipo',
        'Biblioteca compartida',
        'Permisos por rol',
      ],
      en: [
        'Everything in Individual',
        '3-10 users',
        'Team management',
        'Shared library',
        'Role-based permissions',
      ],
    },
    stripePriceIds: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_TEAM_MONTHLY || null,
      yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_TEAM_YEARLY || null,
    },
  },
  organization: {
    id: 'organization',
    name: {
      ca: 'Organització',
      es: 'Organización',
      en: 'Organization',
    },
    description: {
      ca: 'Per a grans equips i institucions',
      es: 'Para grandes equipos e instituciones',
      en: 'For large teams and institutions',
    },
    pricing: {
      monthly: 6,
      yearly: 58,
    },
    perUser: true,
    users: {
      min: 11,
      max: 50,
    },
    limits: {
      minutesPerMonth: null,
      diarization: true,
      exports: true,
      advancedEditor: true,
      teamManagement: true,
      sharedLibrary: true,
      prioritySupport: true,
      centralizedBilling: true,
    },
    features: {
      ca: [
        'Tot d\'Equip inclòs',
        '11-50 usuaris',
        'Facturació centralitzada',
        'Millor preu per usuari',
        'Onboarding personalitzat',
      ],
      es: [
        'Todo de Equipo incluido',
        '11-50 usuarios',
        'Facturación centralizada',
        'Mejor precio por usuario',
        'Onboarding personalizado',
      ],
      en: [
        'Everything in Team',
        '11-50 users',
        'Centralized billing',
        'Best price per user',
        'Personalized onboarding',
      ],
    },
    stripePriceIds: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ORG_MONTHLY || null,
      yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ORG_YEARLY || null,
    },
  },
};

// Helper functions
export function getPlan(planId: PlanId): PlanConfig {
  return PLANS[planId];
}

export function getAllPlans(): PlanConfig[] {
  return Object.values(PLANS);
}

export function getPlanPrice(planId: PlanId, period: BillingPeriod, users: number = 1): number {
  const plan = PLANS[planId];
  const basePrice = period === 'monthly' ? plan.pricing.monthly : plan.pricing.yearly;

  if (plan.perUser) {
    return basePrice * users;
  }
  return basePrice;
}

export function getMonthlyEquivalent(planId: PlanId, period: BillingPeriod): number {
  const plan = PLANS[planId];
  if (period === 'monthly') {
    return plan.pricing.monthly;
  }
  return Math.round((plan.pricing.yearly / 12) * 100) / 100;
}

export function getYearlyDiscount(planId: PlanId): number {
  const plan = PLANS[planId];
  const monthlyTotal = plan.pricing.monthly * 12;
  const yearlyTotal = plan.pricing.yearly;
  return Math.round((1 - yearlyTotal / monthlyTotal) * 100);
}

export function validateUserCount(planId: PlanId, users: number): { valid: boolean; message?: string } {
  const plan = PLANS[planId];

  if (users < plan.users.min) {
    return {
      valid: false,
      message: `Mínim ${plan.users.min} usuaris per aquest pla`
    };
  }

  if (users > plan.users.max) {
    return {
      valid: false,
      message: `Màxim ${plan.users.max} usuaris per aquest pla`
    };
  }

  return { valid: true };
}

export function getStripePriceId(planId: PlanId, period: BillingPeriod): string | null {
  const plan = PLANS[planId];
  return plan.stripePriceIds[period];
}
