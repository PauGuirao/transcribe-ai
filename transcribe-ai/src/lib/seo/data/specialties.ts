// Specialty/condition data for programmatic SEO
import { SpecialtyData, Locale } from '../types';

export const specialties: Record<string, SpecialtyData> = {
  dislexia: {
    slug: 'dislexia',
    name: {
      ca: 'Dislèxia',
      es: 'Dislexia',
      en: 'Dyslexia',
    },
    description: {
      ca: 'Trastorn de l\'aprenentatge que afecta la lectura i l\'escriptura.',
      es: 'Trastorno del aprendizaje que afecta la lectura y la escritura.',
      en: 'Learning disorder that affects reading and writing.',
    },
    keywords: {
      ca: ['dislèxia', 'logopeda dislèxia', 'tractament dislèxia', 'trastorn lectura'],
      es: ['dislexia', 'logopeda dislexia', 'tratamiento dislexia', 'trastorno lectura'],
      en: ['dyslexia', 'dyslexia therapy', 'dyslexia treatment', 'reading disorder'],
    },
    relatedSpecialties: ['trastorns-aprenentatge', 'disgrafia'],
  },

  afasia: {
    slug: 'afasia',
    name: {
      ca: 'Afàsia',
      es: 'Afasia',
      en: 'Aphasia',
    },
    description: {
      ca: 'Trastorn del llenguatge causat per dany cerebral, sovint després d\'un ictus.',
      es: 'Trastorno del lenguaje causado por daño cerebral, a menudo después de un ictus.',
      en: 'Language disorder caused by brain damage, often after a stroke.',
    },
    keywords: {
      ca: ['afàsia', 'logopeda afàsia', 'rehabilitació afàsia', 'ictus llenguatge'],
      es: ['afasia', 'logopeda afasia', 'rehabilitación afasia', 'ictus lenguaje'],
      en: ['aphasia', 'aphasia therapy', 'aphasia rehabilitation', 'stroke language'],
    },
    relatedSpecialties: ['disfagia', 'parkinson'],
  },

  tartamudez: {
    slug: 'tartamudez',
    name: {
      ca: 'Tartamudesa',
      es: 'Tartamudez',
      en: 'Stuttering',
    },
    description: {
      ca: 'Trastorn de la fluïdesa de la parla caracteritzat per repeticions i bloquejos.',
      es: 'Trastorno de la fluidez del habla caracterizado por repeticiones y bloqueos.',
      en: 'Speech fluency disorder characterized by repetitions and blocks.',
    },
    keywords: {
      ca: ['tartamudesa', 'quequeig', 'logopeda tartamudesa', 'fluïdesa parla'],
      es: ['tartamudez', 'tartamudeo', 'logopeda tartamudez', 'fluidez habla'],
      en: ['stuttering', 'stammering', 'stuttering therapy', 'speech fluency'],
    },
    relatedSpecialties: ['trastorns-parla'],
  },

  autismo: {
    slug: 'autismo',
    name: {
      ca: 'TEA (Autisme)',
      es: 'TEA (Autismo)',
      en: 'ASD (Autism)',
    },
    description: {
      ca: 'Trastorn de l\'Espectre Autista que afecta la comunicació i la interacció social.',
      es: 'Trastorno del Espectro Autista que afecta la comunicación y la interacción social.',
      en: 'Autism Spectrum Disorder affecting communication and social interaction.',
    },
    keywords: {
      ca: ['tea', 'autisme', 'logopeda tea', 'comunicació autisme'],
      es: ['tea', 'autismo', 'logopeda tea', 'comunicación autismo'],
      en: ['asd', 'autism', 'autism speech therapy', 'autism communication'],
    },
    relatedSpecialties: ['trastorns-llenguatge'],
  },

  disfagia: {
    slug: 'disfagia',
    name: {
      ca: 'Disfàgia',
      es: 'Disfagia',
      en: 'Dysphagia',
    },
    description: {
      ca: 'Dificultat per empassar aliments o líquids.',
      es: 'Dificultad para tragar alimentos o líquidos.',
      en: 'Difficulty swallowing food or liquids.',
    },
    keywords: {
      ca: ['disfàgia', 'logopeda disfàgia', 'deglució', 'problemes empassar'],
      es: ['disfagia', 'logopeda disfagia', 'deglución', 'problemas tragar'],
      en: ['dysphagia', 'swallowing therapy', 'swallowing disorder', 'deglutition'],
    },
    relatedSpecialties: ['afasia', 'parkinson'],
  },

  voz: {
    slug: 'voz',
    name: {
      ca: 'Trastorns de la Veu',
      es: 'Trastornos de la Voz',
      en: 'Voice Disorders',
    },
    description: {
      ca: 'Alteracions en la qualitat, to o volum de la veu.',
      es: 'Alteraciones en la calidad, tono o volumen de la voz.',
      en: 'Alterations in voice quality, pitch, or volume.',
    },
    keywords: {
      ca: ['trastorns veu', 'logopeda veu', 'disfonia', 'rehabilitació vocal'],
      es: ['trastornos voz', 'logopeda voz', 'disfonía', 'rehabilitación vocal'],
      en: ['voice disorders', 'voice therapy', 'dysphonia', 'vocal rehabilitation'],
    },
    relatedSpecialties: [],
  },

  parkinson: {
    slug: 'parkinson',
    name: {
      ca: 'Parkinson',
      es: 'Parkinson',
      en: 'Parkinson\'s',
    },
    description: {
      ca: 'Malaltia neurodegenerativa que afecta la parla i la deglució.',
      es: 'Enfermedad neurodegenerativa que afecta el habla y la deglución.',
      en: 'Neurodegenerative disease affecting speech and swallowing.',
    },
    keywords: {
      ca: ['parkinson', 'logopeda parkinson', 'parla parkinson', 'deglució parkinson'],
      es: ['parkinson', 'logopeda parkinson', 'habla parkinson', 'deglución parkinson'],
      en: ['parkinsons', 'parkinsons speech therapy', 'parkinsons swallowing'],
    },
    relatedSpecialties: ['disfagia', 'afasia'],
  },

  'trastorns-llenguatge': {
    slug: 'trastorns-llenguatge',
    name: {
      ca: 'Trastorns del Llenguatge',
      es: 'Trastornos del Lenguaje',
      en: 'Language Disorders',
    },
    description: {
      ca: 'Dificultats en la comprensió o producció del llenguatge.',
      es: 'Dificultades en la comprensión o producción del lenguaje.',
      en: 'Difficulties in understanding or producing language.',
    },
    keywords: {
      ca: ['trastorns llenguatge', 'logopeda llenguatge', 'retard llenguatge'],
      es: ['trastornos lenguaje', 'logopeda lenguaje', 'retraso lenguaje'],
      en: ['language disorders', 'language therapy', 'language delay'],
    },
    relatedSpecialties: ['autismo', 'dislexia'],
  },
};

// Get all specialty slugs
export function getAllSpecialtySlugs(): string[] {
  return Object.keys(specialties);
}

// Get specialty by slug
export function getSpecialtyBySlug(slug: string): SpecialtyData | undefined {
  return specialties[slug];
}

// Get specialty name for locale
export function getSpecialtyName(slug: string, locale: Locale): string {
  const specialty = specialties[slug];
  return specialty?.name[locale] || specialty?.name.es || slug;
}

export default specialties;
