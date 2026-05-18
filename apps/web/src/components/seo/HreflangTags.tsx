/**
 * HreflangTags Component
 * Generates hreflang link tags for multi-language SEO
 * Helps search engines understand language/region variants of your pages
 */

export interface HreflangTag {
  locale: string;
  url: string;
}

export interface HreflangTagsProps {
  tags: HreflangTag[];
  defaultLocale?: string;
}

/**
 * Generates hreflang metadata for Next.js
 *
 * @example
 * In your page metadata:
 * export const metadata = {
 *   alternates: generateHreflangAlternates('/pricing', ['ca', 'es', 'en'])
 * }
 */
export function generateHreflangAlternates(
  path: string,
  locales: string[],
  baseUrl: string = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.transcriu.com'
) {
  const languages: Record<string, string> = {};
  const canonical = locales.includes('ca') ? `${baseUrl}/ca${path}` : `${baseUrl}/${locales[0]}${path}`;

  locales.forEach((locale) => {
    languages[locale] = `${baseUrl}/${locale}${path}`;
  });

  // Add x-default for international users
  languages['x-default'] = canonical;

  return {
    canonical,
    languages,
  };
}

/**
 * Utility to get locale mapping for common languages
 */
export const localeMapping = {
  ca: 'ca_ES', // Catalan (Spain)
  es: 'es_ES', // Spanish (Spain)
  en: 'en_US', // English (US)
} as const;

/**
 * Generate full hreflang config for a page
 *
 * @example
 * export const metadata = {
 *   ...generatePageHreflang({
 *     currentLocale: 'ca',
 *     path: '/pricing',
 *     availableLocales: ['ca', 'es', 'en']
 *   })
 * }
 */
export function generatePageHreflang({
  currentLocale,
  path,
  availableLocales,
  baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.transcriu.com',
}: {
  currentLocale: string;
  path: string;
  availableLocales: string[];
  baseUrl?: string;
}) {
  return generateHreflangAlternates(path, availableLocales, baseUrl);
}
