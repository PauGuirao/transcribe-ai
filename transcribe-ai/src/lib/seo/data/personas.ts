// Persona/audience types for programmatic SEO
import { Locale } from '../types';

export interface PersonaData {
  slug: string;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  keywords: Record<Locale, string[]>;
  ageRange?: string;
  commonConditions: string[]; // Links to specialties
}

export const personas: Record<string, PersonaData> = {
  nens: {
    slug: 'nens',
    name: {
      ca: 'Logopèdia infantil',
      es: 'Logopedia infantil',
      en: 'Pediatric speech therapy',
    },
    description: {
      ca: 'Transcripció de sessions de logopèdia per a nens i infants',
      es: 'Transcripción de sesiones de logopedia para niños e infantes',
      en: 'Transcription of speech therapy sessions for children',
    },
    keywords: {
      ca: ['logopèdia infantil', 'logopeda nens', 'logopèdia nens'],
      es: ['logopedia infantil', 'logopeda niños', 'logopedia niños'],
      en: ['pediatric speech therapy', 'speech therapist children', 'child speech therapy'],
    },
    ageRange: '3-12',
    commonConditions: ['dislexia', 'trastorns-llenguatge', 'tartamudez', 'autismo'],
  },

  infantil: {
    slug: 'infantil',
    name: {
      ca: 'Logopèdia infantil',
      es: 'Logopedia infantil',
      en: 'Pediatric speech therapy',
    },
    description: {
      ca: 'Transcripció de sessions de logopèdia infantil',
      es: 'Transcripción de sesiones de logopedia infantil',
      en: 'Transcription of pediatric speech therapy sessions',
    },
    keywords: {
      ca: ['logopèdia infantil', 'logopeda infantil', 'teràpia infantil'],
      es: ['logopedia infantil', 'logopeda infantil', 'terapia infantil'],
      en: ['pediatric speech therapy', 'child speech therapist', 'pediatric therapy'],
    },
    ageRange: '0-12',
    commonConditions: ['dislexia', 'trastorns-llenguatge', 'tartamudez', 'autismo'],
  },

  bebes: {
    slug: 'bebes',
    name: {
      ca: 'Logopèdia per a nadons',
      es: 'Logopedia para bebés',
      en: 'Speech therapy for babies',
    },
    description: {
      ca: 'Transcripció de sessions d\'atenció primerenca i logopèdia neonatal',
      es: 'Transcripción de sesiones de atención temprana y logopedia neonatal',
      en: 'Transcription of early intervention and neonatal speech therapy sessions',
    },
    keywords: {
      ca: ['logopèdia nadons', 'atenció primerenca', 'logopeda bebès'],
      es: ['logopedia bebés', 'atención temprana', 'logopeda bebés'],
      en: ['baby speech therapy', 'early intervention', 'infant speech therapy'],
    },
    ageRange: '0-3',
    commonConditions: ['disfagia', 'trastorns-llenguatge'],
  },

  adolescents: {
    slug: 'adolescents',
    name: {
      ca: 'Logopèdia per a adolescents',
      es: 'Logopedia para adolescentes',
      en: 'Speech therapy for adolescents',
    },
    description: {
      ca: 'Transcripció de sessions de logopèdia per a adolescents',
      es: 'Transcripción de sesiones de logopedia para adolescentes',
      en: 'Transcription of speech therapy sessions for adolescents',
    },
    keywords: {
      ca: ['logopèdia adolescents', 'logopeda joves', 'teràpia adolescents'],
      es: ['logopedia adolescentes', 'logopeda jóvenes', 'terapia adolescentes'],
      en: ['adolescent speech therapy', 'teen speech therapy', 'youth speech therapy'],
    },
    ageRange: '12-18',
    commonConditions: ['dislexia', 'tartamudez', 'voz'],
  },

  adults: {
    slug: 'adults',
    name: {
      ca: 'Logopèdia per a adults',
      es: 'Logopedia para adultos',
      en: 'Speech therapy for adults',
    },
    description: {
      ca: 'Transcripció de sessions de logopèdia per a adults',
      es: 'Transcripción de sesiones de logopedia para adultos',
      en: 'Transcription of speech therapy sessions for adults',
    },
    keywords: {
      ca: ['logopèdia adults', 'logopeda adults', 'teràpia adults'],
      es: ['logopedia adultos', 'logopeda adultos', 'terapia adultos'],
      en: ['adult speech therapy', 'speech therapist adults', 'adult therapy'],
    },
    ageRange: '18-65',
    commonConditions: ['afasia', 'disfagia', 'voz', 'tartamudez'],
  },

  'gent-gran': {
    slug: 'gent-gran',
    name: {
      ca: 'Logopèdia per a gent gran',
      es: 'Logopedia para mayores',
      en: 'Speech therapy for seniors',
    },
    description: {
      ca: 'Transcripció de sessions de logopèdia geriàtrica',
      es: 'Transcripción de sesiones de logopedia geriátrica',
      en: 'Transcription of geriatric speech therapy sessions',
    },
    keywords: {
      ca: ['logopèdia gent gran', 'logopeda geriàtric', 'logopèdia tercera edat'],
      es: ['logopedia mayores', 'logopeda geriátrico', 'logopedia tercera edad'],
      en: ['senior speech therapy', 'geriatric speech therapy', 'elderly speech therapy'],
    },
    ageRange: '65+',
    commonConditions: ['afasia', 'disfagia', 'parkinson'],
  },

  majors: {
    slug: 'majors',
    name: {
      ca: 'Logopèdia per a gent gran',
      es: 'Logopedia para mayores',
      en: 'Speech therapy for seniors',
    },
    description: {
      ca: 'Transcripció de sessions de logopèdia per a persones majors',
      es: 'Transcripción de sesiones de logopedia para personas mayores',
      en: 'Transcription of speech therapy sessions for elderly',
    },
    keywords: {
      ca: ['logopèdia majors', 'logopeda majors', 'teràpia geriàtrica'],
      es: ['logopedia mayores', 'logopeda mayores', 'terapia geriátrica'],
      en: ['senior speech therapy', 'elderly speech therapy', 'geriatric therapy'],
    },
    ageRange: '65+',
    commonConditions: ['afasia', 'disfagia', 'parkinson'],
  },
};

// Get all persona slugs
export function getAllPersonaSlugs(): string[] {
  return Object.keys(personas);
}

// Get persona by slug
export function getPersonaBySlug(slug: string): PersonaData | undefined {
  return personas[slug];
}

// Get persona name for locale
export function getPersonaName(slug: string, locale: Locale): string {
  const persona = personas[slug];
  return persona?.name[locale] || persona?.name.es || slug;
}

export default personas;
