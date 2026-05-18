// Types for Programmatic SEO Landing Pages

export type Locale = 'ca' | 'es' | 'en';

export interface LocaleContent {
  title: string;
  metaDescription: string;
  heroTitle: string;
  heroDescription: string;
  h2Sections?: H2Section[];
  faqs?: FAQ[];
  keywords?: string[];
}

export interface H2Section {
  title: string;
  content?: string;
  points?: string[];
  useCases?: string[];
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface Testimonial {
  name: string;
  role: string;
  text: string;
  image?: string;
  city?: string;
}

export interface LocalInfo {
  city: string;
  province: string;
  region: string;
  autonomousCommunity: string;
  population: number;
  coordinates?: { lat: number; lng: number };
  speechTherapists?: number;
  hospitals?: string[];
  neighborhoods?: string[];
}

export interface CityData {
  slug: string;
  localInfo: LocalInfo;
  content: Partial<Record<Locale, LocaleContent>>;
  testimonials?: Testimonial[];
  relatedCities?: string[];
  specialties?: string[];
  tier: 1 | 2 | 3; // For content prioritization
}

export interface RegionData {
  slug: string;
  name: Record<Locale, string>;
  autonomousCommunity: string;
  cities: Record<string, CityData>;
}

export interface SpecialtyData {
  slug: string;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  keywords: Record<Locale, string[]>;
  relatedSpecialties?: string[];
}

// Template types for content generation
export interface ContentTemplate {
  heroTitle: (city: string, specialty?: string) => string;
  heroDescription: (city: string, population?: number, speechTherapists?: number) => string;
  h2Sections: (city: string, localInfo: LocalInfo, specialty?: string) => H2Section[];
  faqs: (city: string, specialty?: string) => FAQ[];
  metaDescription: (city: string, specialty?: string) => string;
}

// Landing page props (what gets passed to the component)
export interface LandingPageData {
  heroTitle: string;
  heroDescription: string;
  h2Sections?: H2Section[];
  faqs?: FAQ[];
  testimonials?: Testimonial[];
  localInfo?: LocalInfo;
  relatedServices?: string[];
}
