import type { Metadata } from "next";
import PrivacyClient from "./privacy-client";
import { generatePageHreflang, localeMapping } from "@/components/seo/HreflangTags";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.transcriu.com";

type LocaleCode = "ca" | "es" | "en";

const privacySeo: Record<LocaleCode, { title: string; description: string }> = {
  ca: {
    title: "Política de privacitat | Transcriu",
    description:
      "Com Transcriu recull, processa i protegeix les teves dades. Compliment RGPD, encriptació d'extrem a extrem i drets de l'usuari sobre les seves transcripcions.",
  },
  es: {
    title: "Política de privacidad | Transcriu",
    description:
      "Cómo Transcriu recoge, procesa y protege tus datos. Cumplimiento RGPD, cifrado de extremo a extremo y derechos del usuario sobre sus transcripciones.",
  },
  en: {
    title: "Privacy policy | Transcriu",
    description:
      "How Transcriu collects, processes and protects your data. GDPR compliance, end-to-end encryption and user rights over their transcriptions.",
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
  const seo = privacySeo[lc];

  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: `${BASE_URL}/${lc}/privacy`,
      siteName: "Transcriu",
      locale: localeMapping[lc],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
    alternates: generatePageHreflang({ currentLocale: lc, path: "/privacy" }),
  };
}

export default function PrivacyPage() {
  return <PrivacyClient />;
}
