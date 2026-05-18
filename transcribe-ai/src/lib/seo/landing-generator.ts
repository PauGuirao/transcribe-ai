// Landing page content generator
// Combines city data with templates to generate full landing page content

import {
  Locale,
  CityData,
  LandingPageData,
  LocaleContent,
  Testimonial,
} from './types';
import { getTemplate } from './templates';
import { allCities, getCityBySlug } from './data/regions';
import { getSpecialtyBySlug, getSpecialtyName } from './data/specialties';

// Default testimonials to use when city doesn't have specific ones
const defaultTestimonials: Record<Locale, Testimonial[]> = {
  ca: [
    {
      name: 'Maria García',
      role: 'Logopeda clínica',
      text: 'Transcriu m\'ha permès estalviar més de 2 hores diàries en documentació. Ara puc dedicar més temps als meus pacients.',
    },
    {
      name: 'Joan Martí',
      role: 'Logopeda escolar',
      text: 'La precisió del català és impressionant. Reconeix perfectament el vocabulari tècnic de logopèdia.',
    },
    {
      name: 'Laura Puig',
      role: 'Logopeda en centre privat',
      text: 'L\'exportació a PDF és fantàstica per als informes. Els meus pacients reben documentació professional.',
    },
  ],
  es: [
    {
      name: 'María García',
      role: 'Logopeda clínica',
      text: 'Transcriu me ha permitido ahorrar más de 2 horas diarias en documentación. Ahora puedo dedicar más tiempo a mis pacientes.',
    },
    {
      name: 'Juan Martín',
      role: 'Logopeda escolar',
      text: 'La precisión es impresionante. Reconoce perfectamente el vocabulario técnico de logopedia.',
    },
    {
      name: 'Laura Pérez',
      role: 'Logopeda en centro privado',
      text: 'La exportación a PDF es fantástica para los informes. Mis pacientes reciben documentación profesional.',
    },
  ],
  en: [
    {
      name: 'Maria Garcia',
      role: 'Clinical Speech Therapist',
      text: 'Transcriu has allowed me to save over 2 hours daily on documentation. Now I can dedicate more time to my patients.',
    },
    {
      name: 'John Martin',
      role: 'School Speech Therapist',
      text: 'The accuracy is impressive. It perfectly recognizes speech therapy technical vocabulary.',
    },
    {
      name: 'Laura Peters',
      role: 'Private Practice Speech Therapist',
      text: 'The PDF export is fantastic for reports. My patients receive professional documentation.',
    },
  ],
};

export interface GenerateLandingOptions {
  citySlug: string;
  locale: Locale;
  specialty?: string;
}

/**
 * Generate full landing page data for a city/locale/specialty combination
 */
export function generateLandingData(options: GenerateLandingOptions): LandingPageData | null {
  const { citySlug, locale, specialty } = options;

  const city = getCityBySlug(citySlug);
  if (!city) {
    return null;
  }

  const template = getTemplate(locale);
  const cityContent = city.content[locale];
  const specialtyData = specialty ? getSpecialtyBySlug(specialty) : undefined;
  const specialtyName = specialty ? getSpecialtyName(specialty, locale) : undefined;

  // Build the landing page data
  const landingData: LandingPageData = {
    // Use custom content if available, otherwise generate from template
    heroTitle: cityContent?.heroTitle || template.heroTitle(city.localInfo.city, specialtyName),
    heroDescription: cityContent?.heroDescription || template.heroDescription(
      city.localInfo.city,
      city.localInfo.population,
      city.localInfo.speechTherapists
    ),

    // H2 sections - use custom if available, otherwise generate
    h2Sections: cityContent?.h2Sections || template.h2Sections(
      city.localInfo.city,
      city.localInfo,
      specialtyName
    ),

    // FAQs - use custom if available, otherwise generate
    faqs: cityContent?.faqs || template.faqs(city.localInfo.city, specialtyName),

    // Testimonials
    testimonials: city.testimonials || defaultTestimonials[locale],

    // Local info
    localInfo: city.localInfo,

    // Related services/cities
    relatedServices: generateRelatedServices(city, locale, specialty),
  };

  return landingData;
}

/**
 * Generate metadata for a landing page
 */
export function generateLandingMetadata(options: GenerateLandingOptions) {
  const { citySlug, locale, specialty } = options;

  const city = getCityBySlug(citySlug);
  if (!city) {
    return null;
  }

  const template = getTemplate(locale);
  const cityContent = city.content[locale];
  const specialtyData = specialty ? getSpecialtyBySlug(specialty) : undefined;
  const specialtyName = specialty ? getSpecialtyName(specialty, locale) : undefined;

  const title = cityContent?.title || template.heroTitle(city.localInfo.city, specialtyName);
  const description = cityContent?.metaDescription || template.metaDescription(city.localInfo.city, specialtyName);
  const keywords = cityContent?.keywords || specialtyData?.keywords[locale] || [];

  return {
    title: `${title} | Transcriu`,
    description,
    keywords,
  };
}

/**
 * Generate related services links
 */
function generateRelatedServices(city: CityData, locale: Locale, currentSpecialty?: string): string[] {
  const related: string[] = [];

  // Add related cities
  if (city.relatedCities) {
    related.push(...city.relatedCities.slice(0, 3));
  }

  // Add specialties for this city (excluding current)
  if (city.specialties) {
    const otherSpecialties = city.specialties
      .filter(s => s !== currentSpecialty)
      .slice(0, 3)
      .map(s => `${s}-${city.slug}`);
    related.push(...otherSpecialties);
  }

  return related;
}

/**
 * Get all valid landing page combinations for static generation
 */
export function getAllLandingParams(): Array<{ slug: string; locale: Locale }> {
  const params: Array<{ slug: string; locale: Locale }> = [];
  const locales: Locale[] = ['ca', 'es', 'en'];

  for (const [citySlug, cityData] of Object.entries(allCities)) {
    for (const locale of locales) {
      // Only generate pages for locales that make sense for this city
      if (shouldGenerateForLocale(cityData, locale)) {
        // Base city page
        params.push({ slug: citySlug, locale });

        // Specialty pages for tier 1 cities
        if (cityData.tier === 1 && cityData.specialties) {
          for (const specialty of cityData.specialties) {
            params.push({ slug: `${specialty}-${citySlug}`, locale });
          }
        }
      }
    }
  }

  return params;
}

/**
 * Determine if a page should be generated for a specific locale
 */
function shouldGenerateForLocale(city: CityData, locale: Locale): boolean {
  const community = city.localInfo.autonomousCommunity;

  // Spanish is always available
  if (locale === 'es') return true;

  // Catalan for Catalan-speaking regions
  if (locale === 'ca') {
    return ['Catalunya', 'Comunitat Valenciana', 'Illes Balears'].includes(community);
  }

  // English for tier 1 cities and tourist areas
  if (locale === 'en') {
    if (city.tier === 1) return true;
    // Also for tourist-heavy areas
    const touristCities = ['marbella', 'benidorm', 'torrevieja', 'palma', 'ibiza'];
    return touristCities.includes(city.slug);
  }

  return false;
}

/**
 * Parse a landing page slug to extract city and specialty
 */
export function parseLandingSlug(slug: string): { citySlug: string; specialty?: string } {
  // Check if it's a specialty-city combination (e.g., "dislexia-barcelona")
  const parts = slug.split('-');

  // Try to find a matching city by progressively joining parts from the end
  for (let i = 1; i < parts.length; i++) {
    const potentialCity = parts.slice(i).join('-');
    const potentialSpecialty = parts.slice(0, i).join('-');

    if (getCityBySlug(potentialCity)) {
      return {
        citySlug: potentialCity,
        specialty: getSpecialtyBySlug(potentialSpecialty) ? potentialSpecialty : undefined,
      };
    }
  }

  // If no specialty match, assume it's just a city
  return { citySlug: slug };
}

const landingGenerator = {
  generateLandingData,
  generateLandingMetadata,
  getAllLandingParams,
  parseLandingSlug,
};

export default landingGenerator;
