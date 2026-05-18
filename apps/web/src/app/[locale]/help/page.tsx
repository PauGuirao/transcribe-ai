import type { Metadata } from "next";
import HelpClient from "./help-client";
import { generatePageHreflang, localeMapping } from "@/components/seo/HreflangTags";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.transcriu.com";

type LocaleCode = "ca" | "es" | "en";

const helpSeo: Record<LocaleCode, { title: string; description: string }> = {
  ca: {
    title: "Ajuda i suport | Transcriu",
    description:
      "Contacta amb el suport de Transcriu, reporta problemes o demana ajuda amb la teva transcripció. Respondrem en menys de 24 hores feiners.",
  },
  es: {
    title: "Ayuda y soporte | Transcriu",
    description:
      "Contacta con el soporte de Transcriu, reporta problemas o pide ayuda con tu transcripción. Respondemos en menos de 24 horas laborables.",
  },
  en: {
    title: "Help and support | Transcriu",
    description:
      "Contact Transcriu support, report issues or get help with your transcription. We reply within 24 business hours.",
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
  const seo = helpSeo[lc];

  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: `${BASE_URL}/${lc}/help`,
      siteName: "Transcriu",
      locale: localeMapping[lc],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
    alternates: generatePageHreflang({ currentLocale: lc, path: "/help" }),
  };
}

export default function HelpPage() {
  return <HelpClient />;
}
