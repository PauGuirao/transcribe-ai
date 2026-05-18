import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ClientLanding from "./ClientLanding";
import {
  generateLandingData,
  generateLandingMetadata,
  getAllLandingParams,
  parseLandingSlug,
  Locale,
} from "@/lib/seo";

const BASE_URL = "https://www.transcriu.com";

// Generate all static params for pre-rendering
export async function generateStaticParams() {
  const params = getAllLandingParams();
  return params.map(({ slug }) => ({ slug }));
}

// Generate metadata for the page
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const validLocale = (["ca", "es", "en"].includes(locale) ? locale : "es") as Locale;

  const { citySlug, specialty } = parseLandingSlug(slug);

  const metadata = generateLandingMetadata({
    citySlug,
    locale: validLocale,
    specialty,
  });

  if (!metadata) {
    return {};
  }

  return {
    title: metadata.title,
    description: metadata.description,
    keywords: metadata.keywords,
    openGraph: {
      title: metadata.title,
      description: metadata.description,
      type: "website",
      url: `${BASE_URL}/${locale}/logopedia/${slug}`,
      images: [`${BASE_URL}/og-image.png`],
    },
    twitter: {
      card: "summary_large_image",
      title: metadata.title,
      description: metadata.description,
      images: [`${BASE_URL}/og-image.png`],
    },
    alternates: {
      canonical: `${BASE_URL}/${locale}/logopedia/${slug}`,
      languages: {
        ca: `${BASE_URL}/ca/logopedia/${slug}`,
        es: `${BASE_URL}/es/logopedia/${slug}`,
        en: `${BASE_URL}/en/logopedia/${slug}`,
      },
    },
  };
}

interface LandingPageProps {
  params: Promise<{ slug: string; locale: string }>;
}

export default async function LandingPage({ params }: LandingPageProps) {
  const { slug, locale } = await params;
  const validLocale = (["ca", "es", "en"].includes(locale) ? locale : "es") as Locale;

  const { citySlug, specialty } = parseLandingSlug(slug);

  const landingData = generateLandingData({
    citySlug,
    locale: validLocale,
    specialty,
  });

  if (!landingData) {
    notFound();
  }

  return <ClientLanding landing={landingData} />;
}
