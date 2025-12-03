# SEO Components Documentation

Reusable, multi-language SEO components for optimal search engine optimization.

## Quick Start

```tsx
import { LandingPageSchemas, generateMetadata, SEOPresets } from '@/components/seo';
```

## Components

### 1. LandingPageSchemas

Comprehensive JSON-LD schemas for landing pages (Organization, Software, FAQ, WebPage).

**Usage:**

```tsx
'use client';

import { LandingPageSchemas, defaultFAQs } from '@/components/seo';
import { useParams } from 'next/navigation';

export default function HomePage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ca';

  return (
    <div>
      <LandingPageSchemas faqs={defaultFAQs[locale]} />
      {/* Rest of your page */}
    </div>
  );
}
```

**Custom FAQs:**

```tsx
<LandingPageSchemas
  faqs={[
    {
      question: "Com funciona?",
      answer: "Explicació detallada..."
    }
  ]}
/>
```

---

### 2. JsonLd Component

Generic JSON-LD component for custom schemas.

**Usage:**

```tsx
import { JsonLd, generateProductSchema } from '@/components/seo';

const productSchema = generateProductSchema({
  name: "Transcriu Pro",
  description: "Plan professional",
  brand: "Transcriu",
  offers: {
    price: "9.99",
    priceCurrency: "EUR"
  }
});

<JsonLd data={productSchema} />
```

**Available Schema Generators:**

- `generateOrganizationSchema()` - Company/organization info
- `generateSoftwareApplicationSchema()` - Software product
- `generateFAQSchema()` - FAQ pages
- `generateProductSchema()` - Products/services
- `generateBreadcrumbSchema()` - Navigation breadcrumbs
- `generateWebPageSchema()` - Individual pages

---

### 3. Metadata Generation

Generate comprehensive Next.js metadata with SEO presets.

**Usage in Page Metadata (Server Component):**

```tsx
import { generateMetadata, SEOPresets } from '@/components/seo';

export async function generateMetadata({ params }: { params: { locale: string } }) {
  return generateMetadata({
    ...SEOPresets.homepage(params.locale),
    canonical: `/${params.locale}`,
  });
}
```

**Custom Metadata:**

```tsx
export const metadata = generateMetadata({
  title: "Custom Page Title",
  description: "Custom description with CTA",
  keywords: ["keyword1", "keyword2"],
  locale: "ca",
  canonical: "/custom-page",
  alternateLocales: [
    { locale: 'ca', url: '/ca/custom-page' },
    { locale: 'es', url: '/es/custom-page' },
    { locale: 'en', url: '/en/custom-page' }
  ]
});
```

---

### 4. Hreflang Tags

Multi-language SEO support with hreflang tags.

**Automatic Usage (Already in layout.tsx):**

```tsx
alternates: {
  canonical: `${baseUrl}/ca`,
  languages: {
    'ca': `${baseUrl}/ca`,
    'es': `${baseUrl}/es`,
    'en': `${baseUrl}/en`,
    'x-default': `${baseUrl}/ca`,
  },
}
```

**For Individual Pages:**

```tsx
import { generatePageHreflang } from '@/components/seo';

export const metadata = {
  ...generatePageHreflang({
    currentLocale: 'ca',
    path: '/pricing',
    availableLocales: ['ca', 'es', 'en']
  })
};
```

---

## SEO Presets

Pre-configured metadata for common pages.

### Available Presets:

1. **Homepage** - `SEOPresets.homepage(locale)`
2. **Pricing** - `SEOPresets.pricing(locale)`
3. **Blog** - `SEOPresets.blog(locale)`

**Example:**

```tsx
import { generateMetadata, SEOPresets } from '@/components/seo';

export const metadata = generateMetadata({
  ...SEOPresets.pricing('ca'),
  canonical: '/ca/pricing',
});
```

---

## Multi-Language Support

All components support Catalan, Spanish, and English.

**Supported Locales:**
- `ca` - Catalan (default)
- `es` - Spanish
- `en` - English

**Example:**

```tsx
const locale = params.locale || 'ca';

<LandingPageSchemas faqs={defaultFAQs[locale]} />
```

---

## Best Practices

### 1. Use on Every Page

Add appropriate schemas to every public page for better SEO.

```tsx
// Blog post
<JsonLd data={generateWebPageSchema({...})} />

// Product page
<JsonLd data={generateProductSchema({...})} />
```

### 2. Keep Schemas Updated

Update schemas when content changes:

```tsx
// Update prices
const productSchema = generateProductSchema({
  // ... latest pricing
});
```

### 3. Validate Your Schemas

Use [Google's Rich Results Test](https://search.google.com/test/rich-results) to validate:

1. Copy page URL
2. Test with Google tool
3. Fix any warnings

### 4. Monitor Search Console

Track performance in Google Search Console:
- Impressions
- Click-through rate
- Rich results status

---

## Examples

### Complete Blog Post Page

```tsx
import { JsonLd, generateWebPageSchema, generateBreadcrumbSchema } from '@/components/seo';

export default function BlogPost({ post }) {
  const webPageSchema = generateWebPageSchema({
    name: post.title,
    description: post.excerpt,
    url: `https://transcriu.com/blog/${post.slug}`,
    inLanguage: 'ca-ES'
  });

  const breadcrumbSchema = generateBreadcrumbSchema({
    items: [
      { name: 'Inici', url: 'https://transcriu.com' },
      { name: 'Blog', url: 'https://transcriu.com/blog' },
      { name: post.title, url: `https://transcriu.com/blog/${post.slug}` }
    ]
  });

  return (
    <>
      <JsonLd data={webPageSchema} />
      <JsonLd data={breadcrumbSchema} />
      {/* Post content */}
    </>
  );
}
```

### Product/Service Page

```tsx
import { JsonLd, generateProductSchema } from '@/components/seo';

const productSchema = generateProductSchema({
  name: "Transcriu Pro",
  description: "Transcripció professional amb equip il·limitat",
  brand: "Transcriu",
  image: "https://transcriu.com/images/pro-plan.png",
  aggregateRating: {
    ratingValue: 4.8,
    reviewCount: 127
  },
  offers: {
    price: "9.99",
    priceCurrency: "EUR",
    availability: "https://schema.org/InStock",
    url: "https://transcriu.com/pricing"
  }
});

<JsonLd data={productSchema} />
```

---

## Troubleshooting

### Schema Not Appearing

**Check:**
1. Component is client-side (`'use client'`)
2. Schema is rendered in JSX
3. No JavaScript errors in console

### Validation Errors

**Common Issues:**
- Missing required fields (check TypeScript types)
- Invalid URLs (must be absolute)
- Incorrect date formats

### Performance

**Tips:**
- Schemas are lightweight (< 5KB)
- No runtime performance impact
- Renders as static JSON

---

## Migration Guide

### From Old Metadata

**Before:**
```tsx
export const metadata = {
  title: "My Page",
  description: "Description"
};
```

**After:**
```tsx
import { generateMetadata } from '@/components/seo';

export const metadata = generateMetadata({
  title: "My Page - Better SEO",
  description: "Description with CTA. Click here!",
  keywords: ["specific", "long-tail", "keywords"],
  locale: "ca"
});
```

---

## Advanced Usage

### Dynamic Schemas

```tsx
'use client';

import { JsonLd, generateFAQSchema } from '@/components/seo';
import { useTranslations } from 'next-intl';

export function DynamicFAQ() {
  const t = useTranslations('faq');
  const questions = t.raw('questions') as Array<{question: string, answer: string}>;

  const faqSchema = generateFAQSchema({ faqs: questions });

  return <JsonLd data={faqSchema} />;
}
```

### Combining Multiple Schemas

```tsx
<>
  <JsonLd data={organizationSchema} />
  <JsonLd data={productSchema} />
  <JsonLd data={breadcrumbSchema} />
  <JsonLd data={faqSchema} />
</>
```

---

## Resources

- [Google Search Central](https://developers.google.com/search)
- [Schema.org Documentation](https://schema.org/)
- [Rich Results Test](https://search.google.com/test/rich-results)
- [Structured Data Testing Tool](https://validator.schema.org/)

---

## Support

For questions or issues, check:
1. This documentation
2. TypeScript types in components
3. Google Search Console
4. Schema.org specifications
