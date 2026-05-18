import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ClientFeature from "./ClientFeature";
import featuresJson from "../features.json";
import {
  JsonLd,
  generateBreadcrumbSchema,
  generateFAQSchema,
} from "@/components/seo/JsonLd";

const BASE_URL = "https://www.transcriu.com";

// Features content registry
const features = featuresJson as Record<
  string,
  {
    title: string;
    metaDescription: string;
    heroTitle: string;
    heroDescription: string;
    icon?: string;
    keywords?: string[];
    h2Sections?: Array<{
      title: string;
      content?: string;
      points?: string[];
      useCases?: string[];
    }>;
    faqs?: Array<{
      question: string;
      answer: string;
    }>;
    testimonials?: Array<{
      name: string;
      role: string;
      text: string;
      image?: string;
    }>;
    relatedFeatures?: string[];
  }
>;

export async function generateStaticParams() {
  return Object.keys(features).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const feature = features[slug as keyof typeof features];
  if (!feature) return {};

  const title = feature.title;
  const description = feature.metaDescription;
  const baseUrl = "https://www.transcriu.com";

  return {
    title,
    description,
    keywords: feature.keywords,
    openGraph: {
      title,
      description,
      type: "website",
      url: `${baseUrl}/${locale}/features/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: `${baseUrl}/${locale}/features/${slug}`,
      languages: {
        'ca': `${baseUrl}/ca/features/${slug}`,
        'es': `${baseUrl}/es/features/${slug}`,
        'en': `${baseUrl}/en/features/${slug}`,
      },
    },
  };
}

interface FeaturePageProps {
  params: Promise<{ slug: string; locale: string }>;
}

export default async function FeaturePage({ params }: FeaturePageProps) {
  const { slug, locale } = await params;
  const feature = features[slug as keyof typeof features];

  if (!feature) {
    notFound();
  }

  const validLocale = ["ca", "es", "en"].includes(locale) ? locale : "ca";
  const pageUrl = `${BASE_URL}/${validLocale}/features/${slug}`;

  const breadcrumbSchema = generateBreadcrumbSchema({
    items: [
      {
        name:
          validLocale === "ca" ? "Inici" : validLocale === "en" ? "Home" : "Inicio",
        url: `${BASE_URL}/${validLocale}`,
      },
      {
        name:
          validLocale === "ca"
            ? "Funcionalitats"
            : validLocale === "en"
            ? "Features"
            : "Funcionalidades",
        url: `${BASE_URL}/${validLocale}/features`,
      },
      { name: feature.heroTitle || feature.title, url: pageUrl },
    ],
  });

  const faqSchema =
    feature.faqs && feature.faqs.length > 0
      ? generateFAQSchema({ faqs: feature.faqs })
      : null;

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      {faqSchema && <JsonLd data={faqSchema} />}
      <ClientFeature feature={feature} />
    </>
  );
}
