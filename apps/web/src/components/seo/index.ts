/**
 * SEO Components Index
 *
 * Centralized export for all SEO-related components and utilities
 * Use these reusable components throughout your application for consistent SEO
 *
 * @example
 * import { JsonLd, generateMetadata, LandingPageSchemas } from '@/components/seo';
 */

// JSON-LD Schema components
export {
  JsonLd,
  generateOrganizationSchema,
  generateSoftwareApplicationSchema,
  generateFAQSchema,
  generateProductSchema,
  generateBreadcrumbSchema,
  generateWebPageSchema,
  type OrganizationSchemaProps,
  type SoftwareApplicationSchemaProps,
  type FAQSchemaProps,
  type ProductSchemaProps,
  type BreadcrumbSchemaProps,
  type WebPageSchemaProps,
} from './JsonLd';

// Metadata generation utilities
export {
  generateMetadata,
  SEOPresets,
  type SEOHeadProps,
} from './SEOHead';

// Hreflang utilities
export {
  generateHreflangAlternates,
  generatePageHreflang,
  localeMapping,
  type HreflangTag,
  type HreflangTagsProps,
} from './HreflangTags';

// Pre-built schema collections
export {
  LandingPageSchemas,
  defaultFAQs,
} from './LandingPageSchemas';
