import type { Metadata } from "next";
import TermsClient from "./terms-client";
import { generatePageHreflang, localeMapping } from "@/components/seo/HreflangTags";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.transcriu.com";

type LocaleCode = "ca" | "es" | "en";

const termsSeo: Record<LocaleCode, { title: string; description: string }> = {
  ca: {
    title: "Termes i condicions | Transcriu",
    description:
      "Termes del servei Transcriu: ús acceptable, condicions de facturació, propietat del contingut transcrit i limitacions de responsabilitat.",
  },
  es: {
    title: "Términos y condiciones | Transcriu",
    description:
      "Términos del servicio Transcriu: uso aceptable, condiciones de facturación, propiedad del contenido transcrito y limitaciones de responsabilidad.",
  },
  en: {
    title: "Terms and conditions | Transcriu",
    description:
      "Transcriu terms of service: acceptable use, billing terms, ownership of transcribed content and limitations of liability.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const lc: LocaleCode =
    locale === "ca" || locale === "en" ? locale : "es";
  const seo = termsSeo[lc];

  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: `${BASE_URL}/${lc}/terms`,
      siteName: "Transcriu",
      locale: localeMapping[lc],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
    alternates: generatePageHreflang({ currentLocale: lc, path: "/terms" }),
  };
}

export default function TermsPage() {
  return <TermsClient />;
}
