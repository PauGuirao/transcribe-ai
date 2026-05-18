import type { Metadata } from "next";
import PricingClient from "./pricing-client";
import { generatePageHreflang, localeMapping } from "@/components/seo/HreflangTags";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.transcriu.com";

type LocaleCode = "ca" | "es" | "en";

const pricingSeo: Record<LocaleCode, { title: string; description: string }> = {
  ca: {
    title: "Preus i plans | Transcriu",
    description:
      "Plans flexibles per a logopedes i equips clínics. Prova gratis sense targeta i passa a un pla de pagament quan necessitis més minuts, més usuaris o més funcionalitats.",
  },
  es: {
    title: "Precios y planes | Transcriu",
    description:
      "Planes flexibles para logopedas y equipos clínicos. Prueba gratis sin tarjeta y pasa a un plan de pago cuando necesites más minutos, más usuarios o más funcionalidades.",
  },
  en: {
    title: "Pricing and plans | Transcriu",
    description:
      "Flexible plans for speech therapists and clinical teams. Free trial with no card required, upgrade when you need more minutes, more users or more features.",
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
  const seo = pricingSeo[lc];

  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: `${BASE_URL}/${lc}/pricing`,
      siteName: "Transcriu",
      locale: localeMapping[lc],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
    alternates: generatePageHreflang({
      currentLocale: lc,
      path: "/pricing",
    }),
  };
}

export default function PricingPage() {
  return <PricingClient />;
}
