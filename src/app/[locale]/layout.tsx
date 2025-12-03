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
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2563eb",
};

// Base URL for the site
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.transcriu.com";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Transcriu – Plataforma de Transcripció IA per a Logopedes",
    template: "%s | Transcriu",
  },
  description: "Transcriu sessions de logopèdia amb IA en català. 98% precisió. Estalvia 5h/setmana en documentació. Prova gratuïta sense targeta.",
  keywords: [
    // Core service keywords
    "transcripció àudio català",
    "transcripció sessions logopèdia",
    "software transcripció logopedes",
    "transcripció automàtica català",
    "transcriure sessions teràpia",

    // Problem-solution keywords
    "documentar sessions logopèdia",
    "transcripció mèdica català",
    "transcripció clínica",
    "gestió pacients logopèdia",

    // Feature-specific
    "compartir transcripcions equip",
    "exportar transcripcions PDF",
    "transcripció temps real català",
    "identificació interlocutors",

    // Long-tail keywords
    "com transcriure sessions logopèdia",
    "millor software transcripció català",
    "transcripció professional logopedes",
    "alternativa otter català",

    // Location-based
    "transcripció catalunya",
    "logopèdia barcelona",
    "transcripció mèdica espanya",

    // Technology
    "IA transcripció",
    "intel·ligència artificial logopèdia",
    "reconeixement veu català",
  ],
  applicationName: "Transcriu",
  authors: [{ name: "Transcriu" }],
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
    shortcut: "/logo.png",
  },
  openGraph: {
    title: "Transcriu – Plataforma de Transcripció IA per a Logopedes",
    description: "Transcriu sessions de logopèdia amb IA en català. 98% precisió. Estalvia 5h/setmana en documentació.",
    url: baseUrl,
    siteName: "Transcriu",
    locale: "ca_ES",
    type: "website",
    images: [
      {
        url: "/window.svg",
        width: 1200,
        height: 630,
        alt: "Transcriu – Plataforma de Transcripció per a Logopedes",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Transcriu – Transcripció d'Àudio amb IA",
    description: "Transcriu àudios i sessions de logopèdia amb 98% precisió. Prova gratuïta.",
    images: ["/window.svg"],
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
  themeColor: "#2563eb",
  referrer: "origin-when-cross-origin",
  alternates: {
    canonical: `${baseUrl}/ca`,
    languages: {
      'ca': `${baseUrl}/ca`,
      'es': `${baseUrl}/es`,
      'en': `${baseUrl}/en`,
      'x-default': `${baseUrl}/ca`,
    },
  },
};

const locales = ['ca', 'es', 'en'];

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
