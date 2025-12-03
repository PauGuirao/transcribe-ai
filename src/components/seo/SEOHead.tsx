import { Metadata } from 'next';

export interface SEOHeadProps {
  title: string;
  description: string;
  keywords?: string[];
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  locale?: string;
  alternateLocales?: Array<{
    locale: string;
    url: string;
  }>;
  noindex?: boolean;
  structuredData?: object[];
}

/**
 * Generates comprehensive metadata for Next.js pages
 * Supports multi-language, Open Graph, Twitter Cards, and more
 *
 * @example
 * export const metadata = generateMetadata({
 *   title: "Transcriu - AI Transcription for Catalan",
 *   description: "Professional transcription service...",
 *   keywords: ["transcription", "catalan", "AI"],
 *   locale: "ca"
 * });
 */
export function generateMetadata(props: SEOHeadProps): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.transcriu.com';
  const canonicalUrl = props.canonical ? `${baseUrl}${props.canonical}` : baseUrl;
  const imageUrl = props.ogImage || `${baseUrl}/window.svg`;

  const metadata: Metadata = {
    title: props.title,
    description: props.description,
    ...(props.keywords && props.keywords.length > 0 && { keywords: props.keywords }),

    // Open Graph
    openGraph: {
      title: props.title,
      description: props.description,
      url: canonicalUrl,
      siteName: 'Transcriu',
      locale: props.locale || 'ca_ES',
      type: props.ogType || 'website',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: props.title,
        },
      ],
    },

    // Twitter
    twitter: {
      card: 'summary_large_image',
      title: props.title,
      description: props.description,
      images: [imageUrl],
    },

    // Robots
    robots: props.noindex ? {
      index: false,
      follow: false,
    } : {
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

    // Canonical
    alternates: {
      canonical: canonicalUrl,
      ...(props.alternateLocales && {
        languages: props.alternateLocales.reduce((acc, alt) => {
          acc[alt.locale] = `${baseUrl}${alt.url}`;
          return acc;
        }, {} as Record<string, string>)
      })
    },
  };

  return metadata;
}

/**
 * Pre-configured metadata for common page types
 */
export const SEOPresets = {
  homepage: (locale: string = 'ca'): Partial<SEOHeadProps> => ({
    title: locale === 'ca'
      ? 'Transcriu – Plataforma de Transcripció IA per a Logopedes'
      : locale === 'es'
        ? 'Transcriu – Plataforma de Transcripción IA para Logopedas'
        : 'Transcriu – AI Transcription Platform for Speech Therapists',
    description: locale === 'ca'
      ? 'Transcriu sessions de logopèdia amb IA en català. 98% precisió. Estalvia 5h/setmana en documentació. Prova gratuïta sense targeta.'
      : locale === 'es'
        ? 'Transcribe sesiones de logopedia con IA en catalán. 98% precisión. Ahorra 5h/semana en documentación. Prueba gratis sin tarjeta.'
        : 'Transcribe speech therapy sessions with AI in Catalan. 98% accuracy. Save 5h/week on documentation. Free trial, no card required.',
    keywords: locale === 'ca'
      ? [
        // Core service keywords
        'transcripció àudio català',
        'transcripció sessions logopèdia',
        'software transcripció logopedes',
        'transcripció automàtica català',
        'transcriure sessions teràpia',

        // Problem-solution keywords
        'documentar sessions logopèdia',
        'transcripció mèdica català',
        'transcripció clínica',
        'gestió pacients logopèdia',

        // Feature-specific
        'compartir transcripcions equip',
        'exportar transcripcions PDF',
        'transcripció temps real català',
        'identificació interlocutors',

        // Long-tail keywords
        'com transcriure sessions logopèdia',
        'millor software transcripció català',
        'transcripció professional logopedes',
        'alternativa otter català',

        // Location-based
        'transcripció catalunya',
        'logopèdia barcelona',
        'transcripció mèdica espanya',

        // Technology
        'IA transcripció',
        'intel·ligència artificial logopèdia',
        'reconeixement veu català',
      ]
      : locale === 'es'
        ? [
          'transcripción audio catalán',
          'transcripción sesiones logopedia',
          'software transcripción logopedas',
          'transcripción automática catalán',
          'transcribir sesiones terapia',
          'documentar sesiones logopedia',
          'transcripción médica catalán',
          'transcripción clínica',
          'compartir transcripciones equipo',
          'exportar transcripciones PDF',
          'transcripción tiempo real catalán',
          'IA transcripción',
          'reconocimiento voz catalán',
        ]
        : [
          'catalan transcription',
          'speech therapy transcription',
          'AI transcription catalan',
          'medical transcription spain',
          'logopedia documentation',
          'catalan speech recognition',
          'therapy session transcription',
          'clinical transcription software',
        ],
    ogType: 'website' as const,
  }),

  pricing: (locale: string = 'ca'): Partial<SEOHeadProps> => ({
    title: locale === 'ca'
      ? 'Preus – Plans per a Logopedes i Equips | Transcriu'
      : locale === 'es'
        ? 'Precios – Planes para Logopedas y Equipos | Transcriu'
        : 'Pricing – Plans for Speech Therapists & Teams | Transcriu',
    description: locale === 'ca'
      ? 'Plans flexibles per a logopedes individuals i equips. Des de 9.99€/mes. Prova gratuïta de 14 dies. Cancel·la en qualsevol moment.'
      : locale === 'es'
        ? 'Planes flexibles para logopedas individuales y equipos. Desde 9.99€/mes. Prueba gratuita de 14 días. Cancela en cualquier momento.'
        : 'Flexible plans for individual speech therapists and teams. From €9.99/month. 14-day free trial. Cancel anytime.',
    keywords: locale === 'ca'
      ? ['preus transcripció', 'cost software logopèdia', 'pla transcriu', 'preu transcripció català']
      : locale === 'es'
        ? ['precios transcripción', 'coste software logopedia', 'plan transcriu', 'precio transcripción catalán']
        : ['transcription pricing', 'speech therapy software cost', 'transcriu plans'],
  }),

  blog: (locale: string = 'ca'): Partial<SEOHeadProps> => ({
    title: locale === 'ca'
      ? 'Blog – Recursos i Guies per a Logopedes | Transcriu'
      : locale === 'es'
        ? 'Blog – Recursos y Guías para Logopedas | Transcriu'
        : 'Blog – Resources & Guides for Speech Therapists | Transcriu',
    description: locale === 'ca'
      ? 'Articles, guies i consells sobre logopèdia, transcripció i gestió de sessions. Millora la teva pràctica professional.'
      : locale === 'es'
        ? 'Artículos, guías y consejos sobre logopedia, transcripción y gestión de sesiones. Mejora tu práctica profesional.'
        : 'Articles, guides and tips on speech therapy, transcription and session management. Improve your professional practice.',
  }),
};
