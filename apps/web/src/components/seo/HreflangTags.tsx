/**
 * Hreflang helpers
 * Generate Next.js `alternates` metadata for multi-language SEO with a
 * self-referencing canonical (each locale canonicalises to itself) and an
 * `x-default` pointing at the site's primary locale.
 */

const DEFAULT_LOCALES = ['ca', 'es', 'en'] as const;
const DEFAULT_X_DEFAULT_LOCALE = 'es';

/**
 * Generates hreflang metadata for Next.js with a self-referencing canonical
 * (i.e. /es/pricing canonicalises to /es/pricing, not to /ca/pricing).
 *
 * @example
 * export const metadata = {
 *   alternates: generateHreflangAlternates('/pricing', 'ca')
 * }
 */
export function generateHreflangAlternates(
  path: string,
  currentLocale: string,
  locales: readonly string[] = DEFAULT_LOCALES,
  baseUrl: string = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.transcriu.com',
  xDefaultLocale: string = DEFAULT_X_DEFAULT_LOCALE,
) {
  const canonicalLocale = locales.includes(currentLocale)
    ? currentLocale
    : locales[0];

  const languages: Record<string, string> = {};
  locales.forEach((locale) => {
    languages[locale] = `${baseUrl}/${locale}${path}`;
  });
  languages['x-default'] = `${baseUrl}/${
    locales.includes(xDefaultLocale) ? xDefaultLocale : locales[0]
  }${path}`;

  return {
    canonical: `${baseUrl}/${canonicalLocale}${path}`,
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
 * Generate full hreflang config for a page.
 *
 * @example
 * export const metadata = {
 *   alternates: generatePageHreflang({ currentLocale: 'ca', path: '/pricing' })
 * }
 */
export function generatePageHreflang({
  currentLocale,
  path,
  availableLocales = DEFAULT_LOCALES,
  baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.transcriu.com',
  xDefaultLocale = DEFAULT_X_DEFAULT_LOCALE,
}: {
  currentLocale: string;
  path: string;
  availableLocales?: readonly string[];
  baseUrl?: string;
  xDefaultLocale?: string;
}) {
  return generateHreflangAlternates(
    path,
    currentLocale,
    availableLocales,
    baseUrl,
    xDefaultLocale,
  );
}
