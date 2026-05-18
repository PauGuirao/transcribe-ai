// Region data index - aggregates all regional city data
import { CityData } from '../../types';
import { catalunyaCities } from './catalunya';
import { madridCities } from './madrid';
import { andaluciaCities } from './andalucia';
import { valenciaCities } from './valencia';

// Aggregate all cities from all regions
export const allCities: Record<string, CityData> = {
  ...catalunyaCities,
  ...madridCities,
  ...andaluciaCities,
  ...valenciaCities,
};

// Export individual region data for granular access
export const regions = {
  catalunya: catalunyaCities,
  madrid: madridCities,
  andalucia: andaluciaCities,
  valencia: valenciaCities,
};

// Get all city slugs
export function getAllCitySlugs(): string[] {
  return Object.keys(allCities);
}

// Get cities by tier
export function getCitiesByTier(tier: 1 | 2 | 3): CityData[] {
  return Object.values(allCities).filter(city => city.tier === tier);
}

// Get cities by autonomous community
export function getCitiesByAutonomousCommunity(community: string): CityData[] {
  return Object.values(allCities).filter(
    city => city.localInfo.autonomousCommunity === community
  );
}

// Get cities that have content for a specific locale
export function getCitiesWithLocale(locale: 'ca' | 'es' | 'en'): CityData[] {
  return Object.values(allCities).filter(
    city => city.content[locale] !== undefined
  );
}

// Get city by slug
export function getCityBySlug(slug: string): CityData | undefined {
  return allCities[slug];
}

export {
  catalunyaCities,
  madridCities,
  andaluciaCities,
  valenciaCities,
};
