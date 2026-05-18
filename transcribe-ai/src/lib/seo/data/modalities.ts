// Service modalities for programmatic SEO
import { Locale } from '../types';

export interface ModalityData {
  slug: string;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  keywords: Record<Locale, string[]>;
  benefits: Record<Locale, string[]>;
}

export const modalities: Record<string, ModalityData> = {
  online: {
    slug: 'online',
    name: {
      ca: 'Logopèdia online',
      es: 'Logopedia online',
      en: 'Online speech therapy',
    },
    description: {
      ca: 'Transcripció de sessions de logopèdia a distància i telemàtica',
      es: 'Transcripción de sesiones de logopedia a distancia y telemática',
      en: 'Transcription of remote and telehealth speech therapy sessions',
    },
    keywords: {
      ca: ['logopèdia online', 'logopeda online', 'telemàtica logopèdia', 'logopèdia a distància'],
      es: ['logopedia online', 'logopeda online', 'telemática logopedia', 'logopedia a distancia'],
      en: ['online speech therapy', 'telehealth speech therapy', 'remote speech therapy'],
    },
    benefits: {
      ca: [
        'Grava sessions de videoconferència fàcilment',
        'Compatible amb Zoom, Meet i altres plataformes',
        'Transcripció automàtica de sessions remotes',
        'Ideal per a seguiment de pacients a distància',
      ],
      es: [
        'Graba sesiones de videoconferencia fácilmente',
        'Compatible con Zoom, Meet y otras plataformas',
        'Transcripción automática de sesiones remotas',
        'Ideal para seguimiento de pacientes a distancia',
      ],
      en: [
        'Easily record video conference sessions',
        'Compatible with Zoom, Meet and other platforms',
        'Automatic transcription of remote sessions',
        'Ideal for remote patient follow-up',
      ],
    },
  },

  domicili: {
    slug: 'domicili',
    name: {
      ca: 'Logopèdia a domicili',
      es: 'Logopedia a domicilio',
      en: 'Home speech therapy',
    },
    description: {
      ca: 'Transcripció de sessions de logopèdia realitzades al domicili del pacient',
      es: 'Transcripción de sesiones de logopedia realizadas en el domicilio del paciente',
      en: 'Transcription of speech therapy sessions conducted at patient\'s home',
    },
    keywords: {
      ca: ['logopèdia domicili', 'logopeda a casa', 'visita domiciliària logopèdia'],
      es: ['logopedia domicilio', 'logopeda a casa', 'visita domiciliaria logopedia'],
      en: ['home speech therapy', 'home visit speech therapy', 'in-home speech therapist'],
    },
    benefits: {
      ca: [
        'Grava sessions amb el mòbil durant visites a domicili',
        'Transcripció ràpida després de cada visita',
        'Documentació professional sense ordinador',
        'Ideal per a pacients amb mobilitat reduïda',
      ],
      es: [
        'Graba sesiones con el móvil durante visitas a domicilio',
        'Transcripción rápida después de cada visita',
        'Documentación profesional sin ordenador',
        'Ideal para pacientes con movilidad reducida',
      ],
      en: [
        'Record sessions with mobile during home visits',
        'Quick transcription after each visit',
        'Professional documentation without computer',
        'Ideal for patients with reduced mobility',
      ],
    },
  },

  centre: {
    slug: 'centre',
    name: {
      ca: 'Logopèdia en centre',
      es: 'Logopedia en centro',
      en: 'Clinic-based speech therapy',
    },
    description: {
      ca: 'Transcripció de sessions de logopèdia en consulta o centre especialitzat',
      es: 'Transcripción de sesiones de logopedia en consulta o centro especializado',
      en: 'Transcription of speech therapy sessions in clinic or specialized center',
    },
    keywords: {
      ca: ['logopèdia centre', 'consulta logopèdia', 'clínica logopèdia'],
      es: ['logopedia centro', 'consulta logopedia', 'clínica logopedia'],
      en: ['speech therapy clinic', 'speech therapy center', 'clinic-based therapy'],
    },
    benefits: {
      ca: [
        'Integració amb equips de gravació professionals',
        'Documentació centralitzada de totes les sessions',
        'Fàcil compartició amb l\'equip del centre',
        'Gestió eficient de múltiples pacients',
      ],
      es: [
        'Integración con equipos de grabación profesionales',
        'Documentación centralizada de todas las sesiones',
        'Fácil compartición con el equipo del centro',
        'Gestión eficiente de múltiples pacientes',
      ],
      en: [
        'Integration with professional recording equipment',
        'Centralized documentation of all sessions',
        'Easy sharing with center team',
        'Efficient management of multiple patients',
      ],
    },
  },

  privat: {
    slug: 'privat',
    name: {
      ca: 'Logopèdia privada',
      es: 'Logopedia privada',
      en: 'Private speech therapy',
    },
    description: {
      ca: 'Transcripció de sessions de logopèdia en pràctica privada',
      es: 'Transcripción de sesiones de logopedia en práctica privada',
      en: 'Transcription of speech therapy sessions in private practice',
    },
    keywords: {
      ca: ['logopèdia privada', 'logopeda privat', 'consulta privada logopèdia'],
      es: ['logopedia privada', 'logopeda privado', 'consulta privada logopedia'],
      en: ['private speech therapy', 'private practice speech therapist', 'private consultation'],
    },
    benefits: {
      ca: [
        'Control total sobre la documentació dels pacients',
        'Personalització del format d\'informes',
        'Exportació per a assegurances i mútues',
        'Gestió independent de la pràctica',
      ],
      es: [
        'Control total sobre la documentación de los pacientes',
        'Personalización del formato de informes',
        'Exportación para seguros y mutuas',
        'Gestión independiente de la práctica',
      ],
      en: [
        'Full control over patient documentation',
        'Customization of report format',
        'Export for insurance purposes',
        'Independent practice management',
      ],
    },
  },

  urgent: {
    slug: 'urgent',
    name: {
      ca: 'Logopèdia urgent',
      es: 'Logopedia urgente',
      en: 'Urgent speech therapy',
    },
    description: {
      ca: 'Transcripció ràpida per a casos urgents de logopèdia',
      es: 'Transcripción rápida para casos urgentes de logopedia',
      en: 'Quick transcription for urgent speech therapy cases',
    },
    keywords: {
      ca: ['logopèdia urgent', 'logopeda urgent', 'atenció immediata logopèdia'],
      es: ['logopedia urgente', 'logopeda urgente', 'atención inmediata logopedia'],
      en: ['urgent speech therapy', 'emergency speech therapy', 'immediate speech therapy'],
    },
    benefits: {
      ca: [
        'Transcripció en minuts, no hores',
        'Documentació ràpida per a derivacions',
        'Ideal per a avaluacions d\'urgència',
        'Informes immediats per a altres professionals',
      ],
      es: [
        'Transcripción en minutos, no horas',
        'Documentación rápida para derivaciones',
        'Ideal para evaluaciones de urgencia',
        'Informes inmediatos para otros profesionales',
      ],
      en: [
        'Transcription in minutes, not hours',
        'Quick documentation for referrals',
        'Ideal for emergency evaluations',
        'Immediate reports for other professionals',
      ],
    },
  },
};

// Get all modality slugs
export function getAllModalitySlugs(): string[] {
  return Object.keys(modalities);
}

// Get modality by slug
export function getModalityBySlug(slug: string): ModalityData | undefined {
  return modalities[slug];
}

// Get modality name for locale
export function getModalityName(slug: string, locale: Locale): string {
  const modality = modalities[slug];
  return modality?.name[locale] || modality?.name.es || slug;
}

export default modalities;
