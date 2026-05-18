# SEO Quick Start Guide

## New Page Checklist ✅

When creating a new page, follow these steps:

### 1. Add Page Metadata (Server Component)

```tsx
// app/[locale]/your-page/page.tsx
import { generateMetadata } from '@/components/seo';

export const metadata = generateMetadata({
  title: "Your Page Title - Include Keywords",
  description: "130-160 chars with CTA. Action-oriented. Include benefit.",
  keywords: ["specific keyword 1", "long-tail keyword 2", "problem solution keyword"],
  canonical: "/your-page",
  locale: "ca", // or get from params
  alternateLocales: [
    { locale: 'ca', url: '/ca/your-page' },
    { locale: 'es', url: '/es/your-page' },
    { locale: 'en', url: '/en/your-page' }
  ]
});
```

### 2. Add JSON-LD Schema (Client Component)

```tsx
'use client';

import { JsonLd, generateWebPageSchema } from '@/components/seo';

export default function YourPage() {
  const schema = generateWebPageSchema({
    name: "Your Page Title",
    description: "Page description",
    url: "https://transcriu.com/your-page",
    inLanguage: "ca-ES"
  });

  return (
    <>
      <JsonLd data={schema} />
      {/* Your page content */}
    </>
  );
}
```

### 3. Verify Implementation

- [ ] Run `npm run dev` and check page source
- [ ] Look for `<script type="application/ld+json">` in HTML
- [ ] Test with [Rich Results Test](https://search.google.com/test/rich-results)
- [ ] Check meta tags in browser DevTools

---

## Common Page Types

### Landing Page

```tsx
import { LandingPageSchemas, defaultFAQs, generateMetadata, SEOPresets } from '@/components/seo';

export const metadata = generateMetadata(SEOPresets.homepage('ca'));

export default function LandingPage() {
  return (
    <>
      <LandingPageSchemas faqs={defaultFAQs.ca} />
      {/* Content */}
    </>
  );
}
```

### Pricing Page

```tsx
import { JsonLd, generateProductSchema, generateMetadata, SEOPresets } from '@/components/seo';

export const metadata = generateMetadata(SEOPresets.pricing('ca'));

const pricingSchema = generateProductSchema({
  name: "Transcriu Pro",
  description: "Professional plan",
  offers: { price: "9.99", priceCurrency: "EUR" }
});

<JsonLd data={pricingSchema} />
```

### Blog Post

```tsx
import { JsonLd, generateWebPageSchema, generateBreadcrumbSchema } from '@/components/seo';

const articleSchema = generateWebPageSchema({
  name: post.title,
  description: post.excerpt,
  url: `https://transcriu.com/blog/${post.slug}`,
  inLanguage: "ca-ES"
});

const breadcrumbs = generateBreadcrumbSchema({
  items: [
    { name: 'Home', url: 'https://transcriu.com' },
    { name: 'Blog', url: 'https://transcriu.com/blog' },
    { name: post.title, url: `https://transcriu.com/blog/${post.slug}` }
  ]
});

<>
  <JsonLd data={articleSchema} />
  <JsonLd data={breadcrumbs} />
</>
```

---

## SEO Best Practices

### Title Tags
- **Length**: 50-60 characters
- **Format**: "Primary Keyword - Secondary Keyword | Brand"
- **Example**: "Transcripció Sessions Logopèdia - IA en Català | Transcriu"

### Meta Descriptions
- **Length**: 150-160 characters
- **Include**: Benefit + CTA + Keywords
- **Example**: "Transcriu sessions de logopèdia amb IA. 98% precisió. Estalvia 5h/setmana. Prova gratuïta sense targeta."

### Keywords
- Use 15-25 keywords
- Mix of:
  - Short-tail (1-2 words): "transcripció català"
  - Long-tail (3+ words): "com transcriure sessions logopèdia"
  - Problem-solving: "documentar sessions teràpia"
  - Location-based: "transcripció catalunya"

### URL Structure
- **Format**: `/{locale}/{category}/{page}`
- **Example**: `/ca/pricing`, `/es/blog/article-slug`
- **Rules**:
  - Lowercase only
  - Hyphens for spaces
  - Include keywords
  - Keep short (<100 chars)

---

## Multi-Language SEO

### Setup hreflang

Already configured in main layout! For new pages:

```tsx
export const metadata = {
  alternates: {
    canonical: `https://transcriu.com/ca/your-page`,
    languages: {
      'ca': 'https://transcriu.com/ca/your-page',
      'es': 'https://transcriu.com/es/your-page',
      'en': 'https://transcriu.com/en/your-page',
      'x-default': 'https://transcriu.com/ca/your-page',
    }
  }
};
```

### Translation Keys

Add to `messages/{locale}.json`:

```json
{
  "yourPage": {
    "title": "...",
    "description": "...",
    "keywords": ["...", "..."]
  }
}
```

---

## Testing Your SEO

### 1. Local Testing
```bash
npm run dev
# Open http://localhost:3000/your-page
# View page source (Ctrl+U)
# Search for "application/ld+json"
```

### 2. Google Tools
- [Rich Results Test](https://search.google.com/test/rich-results)
- [Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)
- [PageSpeed Insights](https://pagespeed.web.dev/)

### 3. Validation
- [Schema Markup Validator](https://validator.schema.org/)
- [W3C Markup Validator](https://validator.w3.org/)

---

## Common Issues & Fixes

### Issue: Schema not showing in page source
**Fix**: Ensure component is rendered (check for errors in console)

### Issue: Validation errors
**Fix**: Check TypeScript types - all required fields must be provided

### Issue: hreflang not working
**Fix**: Verify all URLs are absolute (include https://)

### Issue: Meta description too short
**Fix**: Aim for 150-160 characters with CTA

---

## Resources

📚 [Full Documentation](./README.md)
🔧 [Schema Generators](./JsonLd.tsx)
📋 [SEO Presets](./SEOHead.tsx)
🌐 [Hreflang Utils](./HreflangTags.tsx)

---

## Need Help?

1. Check [README.md](./README.md) for detailed docs
2. Look at existing pages (homepage, pricing)
3. Review TypeScript types in components
4. Test with Google Rich Results
