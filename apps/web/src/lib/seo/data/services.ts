// Service types for programmatic SEO
import { Locale } from '../types';

export interface ServiceData {
  slug: string;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  keywords: Record<Locale, string[]>;
  actionVerb: Record<Locale, string>; // For hero titles: "Transcriu [actionVerb] a Barcelona"
}

export const services: Record<string, ServiceData> = {
  sessions: {
    slug: 'sessions',
    name: {
      ca: 'Sessions de logopèdia',
      es: 'Sesiones de logopedia',
      en: 'Speech therapy sessions',
    },
    description: {
      ca: 'Transcripció de sessions de teràpia del llenguatge',
      es: 'Transcripción de sesiones de terapia del lenguaje',
      en: 'Transcription of language therapy sessions',
    },
    keywords: {
      ca: ['sessions logopèdia', 'transcriure sessions', 'documentar sessions'],
      es: ['sesiones logopedia', 'transcribir sesiones', 'documentar sesiones'],
      en: ['speech therapy sessions', 'transcribe sessions', 'document sessions'],
    },
    actionVerb: {
      ca: 'sessions de logopèdia',
      es: 'sesiones de logopedia',
      en: 'speech therapy sessions',
    },
  },

  avaluacions: {
    slug: 'avaluacions',
    name: {
      ca: 'Avaluacions logopèdiques',
      es: 'Evaluaciones logopédicas',
      en: 'Speech therapy evaluations',
    },
    description: {
      ca: 'Documentació d\'avaluacions i diagnòstics logopèdics',
      es: 'Documentación de evaluaciones y diagnósticos logopédicos',
      en: 'Documentation of speech therapy evaluations and diagnostics',
    },
    keywords: {
      ca: ['avaluacions logopèdia', 'diagnòstic logopèdic', 'avaluació inicial'],
      es: ['evaluaciones logopedia', 'diagnóstico logopédico', 'evaluación inicial'],
      en: ['speech therapy evaluation', 'speech assessment', 'initial evaluation'],
    },
    actionVerb: {
      ca: 'avaluacions logopèdiques',
      es: 'evaluaciones logopédicas',
      en: 'speech therapy evaluations',
    },
  },

  informes: {
    slug: 'informes',
    name: {
      ca: 'Informes de logopèdia',
      es: 'Informes de logopedia',
      en: 'Speech therapy reports',
    },
    description: {
      ca: 'Creació d\'informes clínics a partir de gravacions',
      es: 'Creación de informes clínicos a partir de grabaciones',
      en: 'Creation of clinical reports from recordings',
    },
    keywords: {
      ca: ['informes logopèdia', 'informe clínic', 'documentació clínica'],
      es: ['informes logopedia', 'informe clínico', 'documentación clínica'],
      en: ['speech therapy reports', 'clinical report', 'clinical documentation'],
    },
    actionVerb: {
      ca: 'informes de logopèdia',
      es: 'informes de logopedia',
      en: 'speech therapy reports',
    },
  },

  seguiment: {
    slug: 'seguiment',
    name: {
      ca: 'Seguiment de pacients',
      es: 'Seguimiento de pacientes',
      en: 'Patient follow-up',
    },
    description: {
      ca: 'Registre i seguiment de l\'evolució dels pacients',
      es: 'Registro y seguimiento de la evolución de los pacientes',
      en: 'Recording and tracking patient progress',
    },
    keywords: {
      ca: ['seguiment pacients', 'evolució pacient', 'historial logopèdia'],
      es: ['seguimiento pacientes', 'evolución paciente', 'historial logopedia'],
      en: ['patient follow-up', 'patient progress', 'speech therapy history'],
    },
    actionVerb: {
      ca: 'seguiment de pacients',
      es: 'seguimiento de pacientes',
      en: 'patient follow-up',
    },
  },

  terapia: {
    slug: 'terapia',
    name: {
      ca: 'Teràpia del llenguatge',
      es: 'Terapia del lenguaje',
      en: 'Language therapy',
    },
    description: {
      ca: 'Documentació de sessions de teràpia del llenguatge',
      es: 'Documentación de sesiones de terapia del lenguaje',
      en: 'Documentation of language therapy sessions',
    },
    keywords: {
      ca: ['teràpia llenguatge', 'teràpia logopèdica', 'sessions teràpia'],
      es: ['terapia lenguaje', 'terapia logopédica', 'sesiones terapia'],
      en: ['language therapy', 'speech therapy', 'therapy sessions'],
    },
    actionVerb: {
      ca: 'sessions de teràpia',
      es: 'sesiones de terapia',
      en: 'therapy sessions',
    },
  },

  consultes: {
    slug: 'consultes',
    name: {
      ca: 'Consultes logopèdiques',
      es: 'Consultas logopédicas',
      en: 'Speech therapy consultations',
    },
    description: {
      ca: 'Registre de consultes i visites de logopèdia',
      es: 'Registro de consultas y visitas de logopedia',
      en: 'Recording of speech therapy consultations and visits',
    },
    keywords: {
      ca: ['consultes logopèdia', 'visites logopeda', 'registre consultes'],
      es: ['consultas logopedia', 'visitas logopeda', 'registro consultas'],
      en: ['speech therapy consultations', 'speech therapist visits', 'consultation records'],
    },
    actionVerb: {
      ca: 'consultes logopèdiques',
      es: 'consultas logopédicas',
      en: 'speech therapy consultations',
    },
  },
};

// Get all service slugs
export function getAllServiceSlugs(): string[] {
  return Object.keys(services);
}

// Get service by slug
export function getServiceBySlug(slug: string): ServiceData | undefined {
  return services[slug];
}

// Get service name for locale
export function getServiceName(slug: string, locale: Locale): string {
  const service = services[slug];
  return service?.name[locale] || service?.name.es || slug;
}

// Get service action verb for locale
export function getServiceActionVerb(slug: string, locale: Locale): string {
  const service = services[slug];
  return service?.actionVerb[locale] || service?.actionVerb.es || slug;
}

export default services;
