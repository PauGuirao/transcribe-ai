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
