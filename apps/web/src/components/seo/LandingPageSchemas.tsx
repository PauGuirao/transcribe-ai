'use client';

import { JsonLd, generateOrganizationSchema, generateSoftwareApplicationSchema, generateFAQSchema, generateWebPageSchema, generateHowToSchema, generateWebSiteSchema, generateBreadcrumbSchema } from './JsonLd';
import { useParams } from 'next/navigation';

interface LandingPageSchemasProps {
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
}

/**
 * Comprehensive JSON-LD schemas for landing page SEO.
 * Renders Organization, SoftwareApplication, WebPage, HowTo and FAQ schemas.
 *
 * NOTE: aggregateRating is intentionally omitted. Per Google's structured-data
 * policy, aggregateRating must reflect real reviews collected on-site. Add it
 * back only once we ship a real review system.
 */
export function LandingPageSchemas({ faqs }: LandingPageSchemasProps) {
  const params = useParams();
  const locale = (params?.locale as string) || 'es';
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.transcriu.com';

  const orgDescription =
    locale === 'ca'
      ? 'Plataforma de transcripció amb IA: passa àudio a text en català, castellà i anglès amb un 98% de precisió. Per a logopedes, periodistes, investigadors i podcasters.'
      : locale === 'en'
      ? 'AI transcription platform: turn audio into text in Spanish, Catalan and English with 98% accuracy. Built for clinicians, journalists, researchers and podcasters.'
      : 'Plataforma de transcripción con IA: pasa audio a texto en español, catalán e inglés con un 98% de precisión. Para logopedas, periodistas, investigadores y podcasters.';

  const organizationSchema = generateOrganizationSchema({
    name: 'Transcriu',
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    description: orgDescription,
    sameAs: [
      'https://www.linkedin.com/company/transcriu',
      'https://twitter.com/transcriu',
      'https://www.instagram.com/transcriu',
    ],
  });

  const softwareSchema = generateSoftwareApplicationSchema({
    name: 'Transcriu',
    description:
      locale === 'ca'
        ? 'Transcriu àudio a text amb IA. Sube MP3, WAV o notes de veu i obtén una transcripció amb identificació d\'interlocutors, llesta per editar, exportar (PDF, DOCX, TXT) i compartir.'
        : locale === 'en'
        ? 'Transcribe audio to text with AI. Upload MP3, WAV or voice notes and get a transcript with speaker identification, ready to edit, export (PDF, DOCX, TXT) and share.'
        : 'Transcribe audio a texto con IA. Sube MP3, WAV o notas de voz y obtén una transcripción con identificación de interlocutores, lista para editar, exportar (PDF, DOCX, TXT) y compartir.',
    url: baseUrl,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, Windows, macOS, Linux, iOS, Android',
    offers: {
      price: '9.99',
      priceCurrency: 'EUR',
    },
    author: {
      name: 'Transcriu',
      url: baseUrl,
    },
  });

  const webPageSchema = generateWebPageSchema({
    name:
      locale === 'ca'
        ? 'Transcriure àudio a text amb IA | Transcriu'
        : locale === 'en'
        ? 'Transcribe audio to text with AI | Transcriu'
        : 'Transcribir audio a texto con IA | Transcriu',
    description:
      locale === 'ca'
        ? 'Passa àudio a text amb IA: 98% de precisió en català i castellà. Puja MP3, WAV o notes de veu i obtén la transcripció en segons.'
        : locale === 'en'
        ? 'Turn audio into text with AI: 98% accuracy across Spanish, Catalan and English. Upload an MP3, WAV or voice note and get a transcript in seconds.'
        : 'Pasa audio a texto con IA: 98% de precisión en español y catalán. Sube MP3, WAV o notas de voz y obtén la transcripción en segundos.',
    url: `${baseUrl}/${locale}`,
    inLanguage: locale === 'ca' ? 'ca-ES' : locale === 'en' ? 'en-US' : 'es-ES',
    isPartOf: {
      name: 'Transcriu',
      url: baseUrl,
    },
  });

  const howToSchema = generateHowToSchema({
    name:
      locale === 'ca'
        ? 'Com transcriure un àudio a text amb Transcriu'
        : locale === 'en'
        ? 'How to transcribe audio to text with Transcriu'
        : 'Cómo transcribir un audio a texto con Transcriu',
    description:
      locale === 'ca'
        ? 'Tres passos per passar un àudio (MP3, WAV, nota de veu) a text amb IA.'
        : locale === 'en'
        ? 'Three steps to turn an audio file (MP3, WAV, voice note) into text with AI.'
        : 'Tres pasos para pasar un audio (MP3, WAV, nota de voz) a texto con IA.',
    totalTime: 'PT3M',
    steps:
      locale === 'ca'
        ? [
            { name: 'Puja l\'àudio', text: 'Arrossega el fitxer MP3, WAV, M4A o OGG, o enganxa una nota de veu. Suporta fitxers fins a 500 MB.' },
            { name: 'Transcriu amb IA', text: 'La IA transcriu l\'àudio en segons amb un 98% de precisió i identifica els interlocutors automàticament.' },
            { name: 'Edita, exporta i comparteix', text: 'Revisa la transcripció a l\'editor i exporta-la en PDF, DOCX o TXT, o comparteix-la amb el teu equip.' },
          ]
        : locale === 'en'
        ? [
            { name: 'Upload the audio', text: 'Drag and drop your MP3, WAV, M4A or OGG file, or paste a voice note. Supports files up to 500 MB.' },
            { name: 'Transcribe with AI', text: 'The AI transcribes your audio in seconds with 98% accuracy and identifies speakers automatically.' },
            { name: 'Edit, export and share', text: 'Review the transcript in the editor and export it as PDF, DOCX or TXT, or share it with your team.' },
          ]
        : [
            { name: 'Sube el audio', text: 'Arrastra tu archivo MP3, WAV, M4A u OGG, o pega una nota de voz. Soporta archivos de hasta 500 MB.' },
            { name: 'Transcribe con IA', text: 'La IA transcribe tu audio en segundos con un 98% de precisión e identifica a los interlocutores automáticamente.' },
            { name: 'Edita, exporta y comparte', text: 'Revisa la transcripción en el editor y expórtala como PDF, DOCX o TXT, o compártela con tu equipo.' },
          ],
  });

  const faqSchema = faqs && faqs.length > 0 ? generateFAQSchema({ faqs }) : null;

  const webSiteSchema = generateWebSiteSchema({
    name: 'Transcriu',
    url: baseUrl,
    inLanguage: ['ca-ES', 'es-ES', 'en-US'],
    searchUrlTemplate: `${baseUrl}/${locale}/blog?q={search_term_string}`,
  });

  const breadcrumbSchema = generateBreadcrumbSchema({
    items: [
      {
        name: locale === 'ca' ? 'Inici' : locale === 'en' ? 'Home' : 'Inicio',
        url: `${baseUrl}/${locale}`,
      },
    ],
  });

  return (
    <>
      <JsonLd data={organizationSchema} />
      <JsonLd data={webSiteSchema} />
      <JsonLd data={softwareSchema} />
      <JsonLd data={webPageSchema} />
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={howToSchema} />
      {faqSchema && <JsonLd data={faqSchema} />}
    </>
  );
}

/**
 * Default FAQ data for different locales — kept for use on the homepage.
 * Questions are aligned with real "People Also Ask" queries from Google SERPs
 * (validated via DataForSEO 2026-05).
 */
export const defaultFAQs = {
  es: [
    {
      question: "¿Cómo se transcribe un audio a texto con IA?",
      answer:
        "Sube tu archivo (MP3, WAV, M4A, OGG…) o pega una nota de voz. La IA de Transcriu lo procesa en segundos con un 98% de precisión, identifica a los interlocutores automáticamente y te devuelve la transcripción lista para editar y exportar en PDF, DOCX o TXT.",
    },
    {
      question: "¿Puedo transcribir audio a texto gratis?",
      answer:
        "Sí. Transcriu ofrece una prueba gratuita sin tarjeta de crédito con hasta 120 minutos de audio para que pruebes la plataforma. Los planes de pago empiezan en 9,99 €/mes.",
    },
    {
      question: "¿Cómo transcribir una nota de voz de WhatsApp?",
      answer:
        "Descarga la nota de voz desde WhatsApp (formato .ogg o .opus), súbela a Transcriu y obtén la transcripción en segundos. También puedes reenviar varias notas de voz juntas y transcribirlas en lote.",
    },
    {
      question: "¿Qué formatos de audio acepta Transcriu?",
      answer:
        "Aceptamos los formatos más habituales: MP3, WAV, M4A, FLAC, OGG, OPUS, AAC y más. El tamaño máximo es de 500 MB por archivo en planes individuales y sin límite en planes de equipo.",
    },
    {
      question: "¿En qué idiomas funciona la transcripción?",
      answer:
        "Transcriu transcribe con alta precisión en español, catalán e inglés, y soporta más de 40 idiomas adicionales (francés, alemán, portugués, italiano, etc.). El catalán y el español son los idiomas con mejor precisión por estar especialmente afinados.",
    },
    {
      question: "¿Es seguro subir audio confidencial (sesiones clínicas, entrevistas)?",
      answer:
        "Sí. Cumplimos con el RGPD, los datos se almacenan cifrados extremo a extremo y no se comparten con terceros ni se usan para entrenar modelos. Puedes borrar tus archivos en cualquier momento.",
    },
  ],
  ca: [
    {
      question: "Com es transcriu un àudio a text amb IA?",
      answer:
        "Puja el fitxer (MP3, WAV, M4A, OGG…) o enganxa una nota de veu. La IA de Transcriu el processa en segons amb un 98% de precisió, identifica els interlocutors automàticament i et torna la transcripció a punt per editar i exportar en PDF, DOCX o TXT.",
    },
    {
      question: "Puc transcriure àudio a text gratis?",
      answer:
        "Sí. Transcriu ofereix una prova gratuïta sense targeta de crèdit amb fins a 120 minuts d'àudio per provar la plataforma. Els plans de pagament comencen a 9,99 €/mes.",
    },
    {
      question: "Com transcriure una nota de veu de WhatsApp?",
      answer:
        "Descarrega la nota de veu de WhatsApp (format .ogg o .opus), puja-la a Transcriu i obtindràs la transcripció en segons. També pots reenviar diverses notes de veu juntes i transcriure-les en lot.",
    },
    {
      question: "Quins formats d'àudio accepta Transcriu?",
      answer:
        "Acceptem els formats més habituals: MP3, WAV, M4A, FLAC, OGG, OPUS, AAC i més. La mida màxima és de 500 MB per fitxer en plans individuals i sense límit en plans d'equip.",
    },
    {
      question: "En quins idiomes funciona la transcripció?",
      answer:
        "Transcriu transcriu amb alta precisió en català, castellà i anglès, i suporta més de 40 idiomes addicionals (francès, alemany, portuguès, italià…). El català i el castellà són els idiomes amb millor precisió, perquè estan especialment afinats.",
    },
    {
      question: "És segur pujar àudio confidencial (sessions clíniques, entrevistes)?",
      answer:
        "Sí. Complim amb el RGPD, les dades s'emmagatzemen amb xifratge end-to-end i no es comparteixen amb tercers ni s'utilitzen per entrenar models. Pots eliminar els teus fitxers en qualsevol moment.",
    },
  ],
  en: [
    {
      question: "How do I transcribe audio to text with AI?",
      answer:
        "Upload your file (MP3, WAV, M4A, OGG…) or paste a voice note. Transcriu's AI processes it in seconds with 98% accuracy, identifies speakers automatically and returns a transcript ready to edit and export to PDF, DOCX or TXT.",
    },
    {
      question: "Can I transcribe audio to text for free?",
      answer:
        "Yes. Transcriu offers a free trial — no credit card required — with up to 120 minutes of audio so you can try the platform. Paid plans start at €9.99/month.",
    },
    {
      question: "How do I transcribe a WhatsApp voice note?",
      answer:
        "Download the voice note from WhatsApp (.ogg or .opus), upload it to Transcriu and you'll get the transcript in seconds. You can also forward multiple voice notes at once and transcribe them in batch.",
    },
    {
      question: "Which audio formats does Transcriu support?",
      answer:
        "We accept the most common formats: MP3, WAV, M4A, FLAC, OGG, OPUS, AAC and more. Maximum size is 500 MB per file on individual plans and unlimited on team plans.",
    },
    {
      question: "Which languages does the transcription work in?",
      answer:
        "Transcriu transcribes with high accuracy in Spanish, Catalan and English, and supports 40+ additional languages (French, German, Portuguese, Italian…). Spanish and Catalan are the most accurate, as they are specifically fine-tuned.",
    },
    {
      question: "Is it safe to upload confidential audio (clinical sessions, interviews)?",
      answer:
        "Yes. We are GDPR-compliant, data is stored with end-to-end encryption and is never shared with third parties or used to train models. You can delete your files at any time.",
    },
  ],
};

