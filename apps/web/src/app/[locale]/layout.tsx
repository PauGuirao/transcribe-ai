import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { AuthProvider } from '@/contexts/AuthContext';
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563eb",
};

// Base URL for the site
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.transcriu.com";

type LocaleCode = 'es' | 'ca' | 'en';

// Per-locale SEO copy. Keywords are sourced from DataForSEO research
// (Spain Spanish has the highest volume + lowest difficulty; Catalan has
// a much smaller TAM; English is a small but high-CPC vertical).
const localeSeo: Record<LocaleCode, {
  title: string;
  description: string;
  ogLocale: string;
  alternateOgLocales: string[];
  keywords: string[];
}> = {
  es: {
    title: "Transcribir audio a texto con IA gratis | Transcriu",
    description:
      "Transcribe audio a texto al instante con IA. 98% de precisión en español y catalán. Sube MP3, WAV o nota de voz de WhatsApp y obtén la transcripción en segundos. Prueba gratis sin tarjeta.",
    ogLocale: "es_ES",
    alternateOgLocales: ["ca_ES", "en_US"],
    keywords: [
      "transcribir audio a texto",
      "transcribir audio",
      "transcripción audio",
      "pasar audio a texto",
      "convertir audio a texto",
      "audio a texto online",
      "audio a texto gratis",
      "transcribir audio gratis",
      "transcripción automática",
      "transcripción con IA",
      "transcribir audio whatsapp",
      "transcribir nota de voz",
      "transcribir mp3",
      "transcribir mp3 a texto",
      "transcribir video",
      "transcribir youtube",
      "transcribir podcast",
      "transcribir entrevista",
      "transcribir reunión",
      "transcribir zoom",
      "transcribir google meet",
      "subtitulos automaticos",
      "subtitular video automaticamente",
      "transcripción logopedia",
      "transcripción para logopedas",
      "transcripción sesiones terapia",
      "informe logopedia",
    ],
  },
  ca: {
    title: "Transcriure àudio a text amb IA gratis | Transcriu",
    description:
      "Passa àudio a text al moment amb IA. 98% de precisió en català i castellà. Puja MP3, WAV o nota de veu de WhatsApp i obtén la transcripció en segons. Prova gratis sense targeta.",
    ogLocale: "ca_ES",
    alternateOgLocales: ["es_ES", "en_US"],
    keywords: [
      "transcriure àudio",
      "transcriure àudio a text",
      "passar àudio a text",
      "passar veu a text",
      "transcripció àudio",
      "transcripció veu a text",
      "transcripció instantània",
      "transcripció en català",
      "transcripció gratuïta",
      "transcripció IA",
      "transcripció automàtica",
      "transcripció nota de veu",
      "transcripció whatsapp",
      "transcripció reunió",
      "transcripció entrevista",
      "transcripció classe",
      "transcripció logopèdia",
      "informe logopèdia",
      "logopèdia infantil",
      "subtítols automàtics",
      "reconeixement de veu",
    ],
  },
  en: {
    title: "Transcribe audio to text with AI — free trial | Transcriu",
    description:
      "Transcribe audio to text instantly with AI. 98% accuracy across Spanish, Catalan and English. Upload MP3, WAV or a WhatsApp voice note and get a transcript in seconds. Free trial, no card.",
    ogLocale: "en_US",
    alternateOgLocales: ["es_ES", "ca_ES"],
    keywords: [
      "transcribe audio to text",
      "transcribe audio",
      "audio to text",
      "voice to text",
      "speech to text",
      "ai transcription",
      "ai transcription software",
      "transcribe mp3",
      "transcribe whatsapp voice note",
      "transcribe podcast",
      "transcribe interview",
      "transcribe meeting",
      "transcribe zoom",
      "transcribe google meet",
      "transcribe youtube",
      "best transcription software",
      "free transcription software",
      "ai notes for therapists",
      "ai scribe slp",
      "soap notes ai",
      "speech therapy software",
    ],
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const lc: LocaleCode = (locale === 'ca' || locale === 'en') ? locale : 'es';
  const seo = localeSeo[lc];

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: seo.title,
      template: "%s | Transcriu",
    },
    description: seo.description,
    keywords: seo.keywords,
    applicationName: "Transcriu",
    authors: [{ name: "Transcriu" }],
    icons: {
      icon: "/logo.png",
      apple: "/logo.png",
      shortcut: "/logo.png",
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: `${baseUrl}/${lc}`,
      siteName: "Transcriu",
      locale: seo.ogLocale,
      alternateLocale: seo.alternateOgLocales,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-snippet': -1,
        'max-image-preview': 'large',
        'max-video-preview': -1,
      },
    },
    referrer: "origin-when-cross-origin",
    alternates: {
      canonical: `${baseUrl}/${lc}`,
      languages: {
        'es': `${baseUrl}/es`,
        'ca': `${baseUrl}/ca`,
        'en': `${baseUrl}/en`,
        'x-default': `${baseUrl}/es`,
      },
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Providing all messages to the client side with explicit locale
  const messages = await getMessages({ locale });

  return (
    <html lang={locale} className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full overflow-hidden`}
      >
        <NextIntlClientProvider messages={messages} locale={locale}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
