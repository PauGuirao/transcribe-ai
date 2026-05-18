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
import {
  JsonLd,
  generateBreadcrumbSchema,
  generateServiceSchema,
} from "@/components/seo/JsonLd";

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
    },
    twitter: {
      card: "summary_large_image",
      title: metadata.title,
      description: metadata.description,
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

  const pageUrl = `${BASE_URL}/${validLocale}/logopedia/${slug}`;
  const cityName =
    (landingData as { city?: string; cityName?: string }).cityName ||
    (landingData as { city?: string }).city ||
    citySlug;

  const breadcrumbSchema = generateBreadcrumbSchema({
    items: [
      {
        name: validLocale === "ca" ? "Inici" : validLocale === "en" ? "Home" : "Inicio",
        url: `${BASE_URL}/${validLocale}`,
      },
      { name: "Logopedia", url: `${BASE_URL}/${validLocale}/logopedia` },
      { name: String(cityName), url: pageUrl },
    ],
  });

  const serviceName =
    validLocale === "ca"
      ? `Transcripció amb IA per a logopedes a ${cityName}`
      : validLocale === "en"
      ? `AI transcription for speech therapists in ${cityName}`
      : `Transcripción con IA para logopedas en ${cityName}`;

  const serviceDescription =
    validLocale === "ca"
      ? `Transcripció automàtica de sessions clíniques i informes amb IA per a logopedes a ${cityName}. 98% de precisió en català i castellà.`
      : validLocale === "en"
      ? `Automated AI transcription of clinical sessions and reports for speech therapists in ${cityName}. 98% accuracy in Spanish, Catalan and English.`
      : `Transcripción automática de sesiones clínicas e informes con IA para logopedas en ${cityName}. 98% de precisión en español y catalán.`;

  const serviceSchema = generateServiceSchema({
    name: serviceName,
    description: serviceDescription,
    url: pageUrl,
    providerName: "Transcriu",
    providerUrl: BASE_URL,
    serviceType:
      validLocale === "en" ? "Speech therapy transcription" : "Transcripción para logopedia",
    areaServed: String(cityName),
    audience:
      validLocale === "en" ? "Speech-language pathologists" : "Logopedas",
    offers: { price: "9.99", priceCurrency: "EUR" },
  });

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={serviceSchema} />
      <ClientLanding landing={landingData} />
    </>
  );
}
