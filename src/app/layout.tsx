import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from '@/contexts/AuthContext';
import "./globals.css";

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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://transcriu.app"),
  title: {
    default: "Transcriu – Transcripció d'Àudio amb IA",
    template: "%s | Transcriu",
  },
  description: "Transcriu àudios i sessions de logopèdia de forma ràpida i precisa amb IA. Comparteix amb el teu equip i estalvia temps.",
  keywords: [
    "transcripció",
    "àudio",
    "IA",
    "logopèdia",
    "català",
    "equip",
    "subtítols",
    "dictat",
    "educació",
    "sanitat",
  ],
  applicationName: "Transcriu",
  authors: [{ name: "Transcriu" }],
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
    shortcut: "/logo.png",
  },
  openGraph: {
    title: "Transcriu – Transcripció d'Àudio amb IA",
    description: "Transcriu àudios i sessions de logopèdia de forma ràpida i precisa. Pla individual i grupal.",
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://transcriu.com",
    siteName: "Transcriu",
    locale: "ca_ES",
    type: "website",
    images: [
      {
        url: "/window.svg",
        width: 1200,
        height: 630,
        alt: "Transcriu – Transcripció d'Àudio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Transcriu – Transcripció d'Àudio amb IA",
    description: "Transcriu àudios i sessions de logopèdia de forma ràpida i precisa.",
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
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ca" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full overflow-hidden`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
