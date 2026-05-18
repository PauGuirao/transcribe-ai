import React from 'react';

interface JsonLdProps {
  data: object;
}

/**
 * Reusable JSON-LD structured data component for SEO
 * Renders schema markup that search engines can understand
 *
 * @example
 * <JsonLd data={{
 *   "@context": "https://schema.org",
 *   "@type": "Organization",
 *   name: "Transcriu"
 * }} />
 */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// Reusable schema generators

export interface OrganizationSchemaProps {
  name: string;
  url: string;
  logo: string;
  description: string;
  sameAs?: string[]; // Social media profiles
  contactPoint?: {
    telephone: string;
    contactType: string;
    availableLanguage: string[];
  };
}

export function generateOrganizationSchema(props: OrganizationSchemaProps) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: props.name,
    url: props.url,
    logo: props.logo,
    description: props.description,
    ...(props.sameAs && { sameAs: props.sameAs }),
    ...(props.contactPoint && { contactPoint: props.contactPoint }),
  };
}

export interface SoftwareApplicationSchemaProps {
  name: string;
  description: string;
  url: string;
  applicationCategory: string;
  operatingSystem: string;
  offers?: {
    price: string;
    priceCurrency: string;
    priceValidUntil?: string;
  };
  aggregateRating?: {
    ratingValue: number;
    ratingCount: number;
    bestRating?: number;
  };
  author?: {
    name: string;
    url: string;
  };
}

export function generateSoftwareApplicationSchema(props: SoftwareApplicationSchemaProps) {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: props.name,
    description: props.description,
    url: props.url,
    applicationCategory: props.applicationCategory,
    operatingSystem: props.operatingSystem,
  };

  if (props.offers) {
    schema.offers = {
      "@type": "Offer",
      price: props.offers.price,
      priceCurrency: props.offers.priceCurrency,
      ...(props.offers.priceValidUntil && { priceValidUntil: props.offers.priceValidUntil }),
    };
  }

  if (props.aggregateRating) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: props.aggregateRating.ratingValue,
      ratingCount: props.aggregateRating.ratingCount,
      bestRating: props.aggregateRating.bestRating || 5,
    };
  }

  if (props.author) {
    schema.author = {
      "@type": "Organization",
      name: props.author.name,
      url: props.author.url,
    };
  }

  return schema;
}

export interface FAQSchemaProps {
  faqs: Array<{
    question: string;
    answer: string;
  }>;
}

export function generateFAQSchema(props: FAQSchemaProps) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: props.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export interface ProductSchemaProps {
  name: string;
  description: string;
  image?: string;
  brand?: string;
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
  };
  offers?: {
    price: string;
    priceCurrency: string;
    availability?: string;
    url?: string;
  };
}

export function generateProductSchema(props: ProductSchemaProps) {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: props.name,
    description: props.description,
  };

  if (props.image) {
    schema.image = props.image;
  }

  if (props.brand) {
    schema.brand = {
      "@type": "Brand",
      name: props.brand,
    };
  }

  if (props.aggregateRating) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: props.aggregateRating.ratingValue,
      reviewCount: props.aggregateRating.reviewCount,
      bestRating: 5,
    };
  }

  if (props.offers) {
    schema.offers = {
      "@type": "Offer",
      price: props.offers.price,
      priceCurrency: props.offers.priceCurrency,
      availability: props.offers.availability || "https://schema.org/InStock",
      ...(props.offers.url && { url: props.offers.url }),
    };
  }

  return schema;
}

export interface BreadcrumbSchemaProps {
  items: Array<{
    name: string;
    url: string;
  }>;
}

export function generateBreadcrumbSchema(props: BreadcrumbSchemaProps) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: props.items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export interface HowToSchemaProps {
  name: string;
  description: string;
  totalTime?: string; // ISO 8601, e.g. "PT5M"
  image?: string;
  steps: Array<{
    name: string;
    text: string;
    image?: string;
    url?: string;
  }>;
}

export function generateHowToSchema(props: HowToSchemaProps) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: props.name,
    description: props.description,
    step: props.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
      ...(s.image && { image: s.image }),
      ...(s.url && { url: s.url }),
    })),
  };
  if (props.totalTime) schema.totalTime = props.totalTime;
  if (props.image) schema.image = props.image;
  return schema;
}

export interface ItemListSchemaProps {
  name: string;
  items: Array<{
    position: number;
    name: string;
    url: string;
    description?: string;
  }>;
}

export function generateItemListSchema(props: ItemListSchemaProps) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: props.name,
    itemListElement: props.items.map((item) => ({
      "@type": "ListItem",
      position: item.position,
      name: item.name,
      url: item.url,
      ...(item.description && { description: item.description }),
    })),
  };
}

export interface WebSiteSchemaProps {
  name: string;
  url: string;
  alternateName?: string;
  inLanguage?: string[];
  searchUrlTemplate?: string;
}

export function generateWebSiteSchema(props: WebSiteSchemaProps) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: props.name,
    url: props.url,
  };
  if (props.alternateName) schema.alternateName = props.alternateName;
  if (props.inLanguage) schema.inLanguage = props.inLanguage;
  if (props.searchUrlTemplate) {
    schema.potentialAction = {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: props.searchUrlTemplate,
      },
      "query-input": "required name=search_term_string",
    };
  }
  return schema;
}

export interface ArticleSchemaProps {
  headline: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  authorName: string;
  authorUrl?: string;
  publisherName: string;
  publisherLogo: string;
  image?: string | string[];
  inLanguage?: string;
  keywords?: string[];
}

export function generateArticleSchema(props: ArticleSchemaProps) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: props.headline,
    description: props.description,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": props.url,
    },
    datePublished: props.datePublished,
    dateModified: props.dateModified || props.datePublished,
    author: {
      "@type": "Person",
      name: props.authorName,
      ...(props.authorUrl && { url: props.authorUrl }),
    },
    publisher: {
      "@type": "Organization",
      name: props.publisherName,
      logo: {
        "@type": "ImageObject",
        url: props.publisherLogo,
      },
    },
  };
  if (props.image) schema.image = Array.isArray(props.image) ? props.image : [props.image];
  if (props.inLanguage) schema.inLanguage = props.inLanguage;
  if (props.keywords && props.keywords.length > 0) schema.keywords = props.keywords.join(", ");
  return schema;
}

export interface ServiceSchemaProps {
  name: string;
  description: string;
  url: string;
  providerName: string;
  providerUrl: string;
  serviceType?: string;
  areaServed?: string | string[];
  audience?: string;
  offers?: {
    price: string;
    priceCurrency: string;
  };
}

export function generateServiceSchema(props: ServiceSchemaProps) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: props.name,
    description: props.description,
    url: props.url,
    provider: {
      "@type": "Organization",
      name: props.providerName,
      url: props.providerUrl,
    },
  };
  if (props.serviceType) schema.serviceType = props.serviceType;
  if (props.areaServed) schema.areaServed = props.areaServed;
  if (props.audience) {
    schema.audience = {
      "@type": "Audience",
      audienceType: props.audience,
    };
  }
  if (props.offers) {
    schema.offers = {
      "@type": "Offer",
      price: props.offers.price,
      priceCurrency: props.offers.priceCurrency,
    };
  }
  return schema;
}

export interface WebPageSchemaProps {
  name: string;
  description: string;
  url: string;
  inLanguage: string;
  isPartOf?: {
    name: string;
    url: string;
  };
}

export function generateWebPageSchema(props: WebPageSchemaProps) {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: props.name,
    description: props.description,
    url: props.url,
    inLanguage: props.inLanguage,
  };

  if (props.isPartOf) {
    schema.isPartOf = {
      "@type": "WebSite",
      name: props.isPartOf.name,
      url: props.isPartOf.url,
    };
  }

  return schema;
}
