'use client';

import { useEffect } from 'react';
import { JsonLd, generateOrganizationSchema, generateSoftwareApplicationSchema, generateFAQSchema, generateWebPageSchema } from './JsonLd';
import { useParams } from 'next/navigation';

interface LandingPageSchemasProps {
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
}

/**
 * Comprehensive JSON-LD schemas for landing page SEO
 * Includes Organization, SoftwareApplication, FAQ, and WebPage schemas
 */
export function LandingPageSchemas({ faqs }: LandingPageSchemasProps) {
  const params = useParams();
  const locale = (params?.locale as string) || 'ca';
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.transcriu.com';

  // Organization Schema
  const organizationSchema = generateOrganizationSchema({
    name: 'Transcriu',
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    description: locale === 'ca'
      ? 'Plataforma professional de transcripció amb IA per a logopedes. Transcriu sessions de teràpia del llenguatge amb alta precisió en català.'
      : locale === 'es'
      ? 'Plataforma profesional de transcripción con IA para logopedas. Transcribe sesiones de terapia del lenguaje con alta precisión en catalán.'
      : 'Professional AI transcription platform for speech therapists. Transcribe language therapy sessions with high accuracy in Catalan.',
    sameAs: [
      // Add your social media profiles here when available
      // 'https://www.linkedin.com/company/transcriu',
      // 'https://twitter.com/transcriu',
      // 'https://www.facebook.com/transcriu'
    ],
  });

  // Software Application Schema
  const softwareSchema = generateSoftwareApplicationSchema({
    name: 'Transcriu',
    description: locale === 'ca'
      ? 'Plataforma de transcripció automàtica amb IA especialitzada en català per a logopedes. Transcriu sessions de teràpia, comparteix amb el teu equip i exporta en múltiples formats.'
      : locale === 'es'
      ? 'Plataforma de transcripción automática con IA especializada en catalán para logopedas. Transcribe sesiones de terapia, comparte con tu equipo y exporta en múltiples formatos.'
      : 'Automatic AI transcription platform specialized in Catalan for speech therapists. Transcribe therapy sessions, share with your team and export in multiple formats.',
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

  // WebPage Schema
  const webPageSchema = generateWebPageSchema({
    name: locale === 'ca'
      ? 'Transcriu – Transcripció IA per a Logopedes'
      : locale === 'es'
      ? 'Transcriu – Transcripción IA para Logopedas'
      : 'Transcriu – AI Transcription for Speech Therapists',
    description: locale === 'ca'
      ? 'Transcriu sessions de logopèdia amb IA en català. 98% precisió. Estalvia 5h/setmana en documentació.'
      : locale === 'es'
      ? 'Transcribe sesiones de logopedia con IA en catalán. 98% precisión. Ahorra 5h/semana en documentación.'
      : 'Transcribe speech therapy sessions with AI in Catalan. 98% accuracy. Save 5h/week on documentation.',
    url: `${baseUrl}/${locale}`,
    inLanguage: locale === 'ca' ? 'ca-ES' : locale === 'es' ? 'es-ES' : 'en-US',
    isPartOf: {
      name: 'Transcriu',
      url: baseUrl,
    },
  });

  // FAQ Schema (if FAQs are provided)
  const faqSchema = faqs && faqs.length > 0 ? generateFAQSchema({ faqs }) : null;

  return (
    <>
      <JsonLd data={organizationSchema} />
      <JsonLd data={softwareSchema} />
      <JsonLd data={webPageSchema} />
      {faqSchema && <JsonLd data={faqSchema} />}
    </>
  );
}

/**
 * Default FAQ data for different locales
 */
export const defaultFAQs = {
  ca: [
    {
      question: "Com funciona la transcripció automàtica?",
      answer: "Transcriu utilitza intel·ligència artificial avançada especialitzada en català per convertir àudio en text amb una precisió del 98%. Simplement puja el teu arxiu d'àudio i en segons obtindràs una transcripció completa amb identificació d'interlocutors."
    },
    {
      question: "Quin format d'àudio accepteu?",
      answer: "Acceptem tots els formats d'àudio més comuns: MP3, WAV, M4A, FLAC, OGG i més. La mida màxima del fitxer és de 500MB per a usuaris individuals i sense límit per a equips."
    },
    {
      question: "Puc compartir transcripcions amb el meu equip?",
      answer: "Sí! Amb el pla Equip pots crear grups, compartir transcripcions amb col·legues, assignar pacients i col·laborar en temps real. Perfecte per a clíniques i centres educatius."
    },
    {
      question: "Les meves dades estan segures?",
      answer: "Absolutament. Totes les transcripcions s'emmagatzemen de forma segura amb xifratge end-to-end. Complim amb el RGPD i les dades mèdiques mai es comparteixen amb tercers. Tens control total sobre qui pot veure les teves transcripcions."
    },
    {
      question: "Puc provar Transcriu gratuïtament?",
      answer: "Sí! Oferim una prova gratuïta de 14 dies sense necessitat de targeta de crèdit. Podràs transcriure fins a 120 minuts d'àudio per veure com funciona la plataforma."
    },
  ],
  es: [
    {
      question: "¿Cómo funciona la transcripción automática?",
      answer: "Transcriu utiliza inteligencia artificial avanzada especializada en catalán para convertir audio en texto con una precisión del 98%. Simplemente sube tu archivo de audio y en segundos obtendrás una transcripción completa con identificación de interlocutores."
    },
    {
      question: "¿Qué formato de audio aceptáis?",
      answer: "Aceptamos todos los formatos de audio más comunes: MP3, WAV, M4A, FLAC, OGG y más. El tamaño máximo del archivo es de 500MB para usuarios individuales y sin límite para equipos."
    },
    {
      question: "¿Puedo compartir transcripciones con mi equipo?",
      answer: "¡Sí! Con el plan Equipo puedes crear grupos, compartir transcripciones con colegas, asignar pacientes y colaborar en tiempo real. Perfecto para clínicas y centros educativos."
    },
    {
      question: "¿Mis datos están seguros?",
      answer: "Absolutamente. Todas las transcripciones se almacenan de forma segura con cifrado end-to-end. Cumplimos con el RGPD y los datos médicos nunca se comparten con terceros. Tienes control total sobre quién puede ver tus transcripciones."
    },
    {
      question: "¿Puedo probar Transcriu gratuitamente?",
      answer: "¡Sí! Ofrecemos una prueba gratuita de 14 días sin necesidad de tarjeta de crédito. Podrás transcribir hasta 120 minutos de audio para ver cómo funciona la plataforma."
    },
  ],
  en: [
    {
      question: "How does automatic transcription work?",
      answer: "Transcriu uses advanced artificial intelligence specialized in Catalan to convert audio to text with 98% accuracy. Simply upload your audio file and in seconds you'll get a complete transcription with speaker identification."
    },
    {
      question: "What audio format do you accept?",
      answer: "We accept all common audio formats: MP3, WAV, M4A, FLAC, OGG and more. The maximum file size is 500MB for individual users and unlimited for teams."
    },
    {
      question: "Can I share transcriptions with my team?",
      answer: "Yes! With the Team plan you can create groups, share transcriptions with colleagues, assign patients and collaborate in real-time. Perfect for clinics and educational centers."
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. All transcriptions are stored securely with end-to-end encryption. We comply with GDPR and medical data is never shared with third parties. You have full control over who can see your transcriptions."
    },
    {
      question: "Can I try Transcriu for free?",
      answer: "Yes! We offer a 14-day free trial with no credit card required. You can transcribe up to 120 minutes of audio to see how the platform works."
    },
  ],
};
