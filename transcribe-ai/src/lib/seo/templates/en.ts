// English content templates for programmatic SEO
import { ContentTemplate, LocalInfo, H2Section, FAQ } from '../types';

export const english: ContentTemplate = {
  heroTitle: (city: string, specialty?: string) => {
    if (specialty) {
      return `${specialty} Session Transcription in ${city}`;
    }
    return `Transcription for Speech Therapists in ${city}`;
  },

  heroDescription: (city: string, population?: number, speechTherapists?: number) => {
    const parts = [`Professional transcription platform for speech therapists in ${city}, Spain.`];

    if (speechTherapists) {
      parts.push(`Over ${speechTherapists} speech therapists in the area trust digital documentation tools.`);
    }

    parts.push('98% accuracy. Free trial, no credit card required.');

    return parts.join(' ');
  },

  metaDescription: (city: string, specialty?: string) => {
    if (specialty) {
      return `Transcribe ${specialty.toLowerCase()} therapy sessions in ${city}, Spain with AI. 98% accuracy. Save 5h/week on documentation. Free trial.`;
    }
    return `Transcribe speech therapy sessions in ${city}, Spain with AI. 98% accuracy. Save 5h/week on documentation. Free trial.`;
  },

  h2Sections: (city: string, localInfo: LocalInfo, specialty?: string): H2Section[] => {
    const sections: H2Section[] = [];

    // Section 1: Local context
    sections.push({
      title: `Speech Therapy in ${city}`,
      content: generateLocalContext(city, localInfo),
    });

    // Section 2: Features/Benefits
    sections.push({
      title: `Why Speech Therapists in ${city} Choose Transcriu`,
      points: [
        'Automatic transcription with 98% accuracy',
        'Automatic speaker identification (therapist and patient)',
        'Export to PDF, Word, and plain text',
        'Specialized speech therapy vocabulary',
        'Encrypted data and secure storage',
        'Compatible with any recording device',
      ],
    });

    // Section 3: Use cases
    sections.push({
      title: 'Use Cases for Your Practice',
      useCases: [
        'Documentation of language therapy sessions',
        'Transcription of initial assessments',
        'Patient progress tracking',
        'Clinical report preparation',
        'Speech sample analysis',
        'Documentation for interdisciplinary coordination',
      ],
    });

    // Section 4: Specialty-specific (if applicable)
    if (specialty) {
      sections.push({
        title: `Specialized ${specialty} Transcription`,
        content: generateSpecialtyContent(specialty, city),
      });
    }

    return sections;
  },

  faqs: (city: string, specialty?: string): FAQ[] => {
    const faqs: FAQ[] = [
      {
        question: `How does Transcriu work for speech therapists in ${city}?`,
        answer: `Transcriu is an automatic transcription platform designed specifically for speech therapists. Simply upload your session audio and within minutes you'll receive an accurate transcription with speaker identification and specialized vocabulary.`,
      },
      {
        question: 'What languages does Transcriu support?',
        answer: 'Transcriu supports Spanish, Catalan, and English with high accuracy. This makes it ideal for speech therapists working in Spain with diverse patient populations.',
      },
      {
        question: 'Is patient data secure?',
        answer: 'Absolutely. All data is encrypted in transit and at rest. We comply with GDPR and healthcare data protection regulations. Audio files can be automatically deleted after transcription.',
      },
      {
        question: 'Can I try Transcriu for free?',
        answer: 'Yes, we offer a free trial without requiring a credit card. You can transcribe your first sessions and see how Transcriu can help you save time on documentation.',
      },
      {
        question: 'What export formats are available?',
        answer: 'You can export transcriptions to PDF, Microsoft Word (DOCX), and plain text. You can also copy the text directly to paste into your clinical reports.',
      },
      {
        question: 'Is Transcriu suitable for international speech therapists working in Spain?',
        answer: 'Yes, Transcriu is perfect for international speech therapists. The platform supports multiple languages and the interface is available in English, making it easy to document sessions regardless of your native language.',
      },
    ];

    if (specialty) {
      faqs.push({
        question: `Does Transcriu work well for ${specialty.toLowerCase()} sessions?`,
        answer: `Yes, Transcriu is optimized for all types of speech therapy sessions, including ${specialty.toLowerCase()}. The specialized vocabulary and speaker identification make documenting these sessions efficient and accurate.`,
      });
    }

    return faqs;
  },
};

function generateLocalContext(city: string, localInfo: LocalInfo): string {
  const parts: string[] = [];

  parts.push(`${city} is one of the most important cities in ${localInfo.autonomousCommunity} for speech therapy services.`);

  if (localInfo.population) {
    parts.push(`With a population of ${localInfo.population.toLocaleString('en-US')} inhabitants, the demand for speech therapy services is significant.`);
  }

  if (localInfo.speechTherapists) {
    parts.push(`The city has approximately ${localInfo.speechTherapists} registered speech therapists.`);
  }

  parts.push('Transcriu helps professionals in the area optimize their documentation time, allowing them to focus more on patient care.');

  return parts.join(' ');
}

function generateSpecialtyContent(specialty: string, city: string): string {
  const specialtyContent: Record<string, string> = {
    'Dyslexia': `Dyslexia is one of the most common conditions treated by speech therapists in ${city}. Transcriu facilitates documentation of intervention sessions, allowing accurate recording of patient progress and strategies used.`,
    'Aphasia': `Aphasia requires detailed tracking of language recovery. With Transcriu, speech therapists in ${city} can precisely document each rehabilitation session, facilitating analysis of patient progress.`,
    'Stuttering': `Stuttering treatment in ${city} requires accurate recording of therapy sessions. Transcriu captures interventions and patient progress with automatic speaker identification.`,
    'Autism': `Speech therapy intervention for ASD (Autism Spectrum Disorder) in ${city} involves structured sessions that benefit from precise documentation. Transcriu helps record every interaction and communicative progress.`,
    'ASD': `Speech therapy intervention for ASD (Autism Spectrum Disorder) in ${city} involves structured sessions that benefit from precise documentation. Transcriu helps record every interaction and communicative progress.`,
    'Dysphagia': `Dysphagia requires detailed evaluations and follow-ups. Speech therapists in ${city} can use Transcriu to document swallowing therapy sessions, recording observations and progress efficiently.`,
    'Voice': `Voice disorders are common in ${city}, especially among professionals who use their voice as a work tool. Transcriu facilitates documentation of vocal rehabilitation sessions and progress tracking.`,
  };

  return specialtyContent[specialty] || `Transcribing ${specialty.toLowerCase()} sessions in ${city} is now easier with Transcriu. Our AI technology captures every detail of the session for complete documentation.`;
}

export default english;
