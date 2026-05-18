// Comunitat Valenciana region data
import { CityData } from '../../types';

export const valenciaCities: Record<string, CityData> = {
  valencia: {
    slug: 'valencia',
    tier: 1,
    localInfo: {
      city: 'València',
      province: 'València',
      region: 'València',
      autonomousCommunity: 'Comunitat Valenciana',
      population: 791413,
      coordinates: { lat: 39.4699, lng: -0.3763 },
      speechTherapists: 520,
      hospitals: [
        'Hospital Universitari i Politècnic La Fe',
        'Hospital Clínic Universitari',
        'Hospital General Universitari',
        'Hospital Doctor Peset',
      ],
      neighborhoods: [
        'Ciutat Vella', 'L\'Eixample', 'Extramurs', 'Campanar',
        'La Saïdia', 'El Pla del Real', 'Benimaclet', 'Rascanya',
      ],
    },
    specialties: ['dislexia', 'afasia', 'tartamudez', 'autismo', 'disfagia', 'voz'],
    relatedCities: ['alicante', 'castellon', 'elche', 'torrent'],
    content: {
      ca: {
        title: 'Transcripció per a Logopedes a València',
        metaDescription: 'Transcriu sessions de logopèdia a València amb IA. Més de 520 logopedes. 98% precisió en valencià/català. Prova gratuïta.',
        heroTitle: 'Transcripció per a Logopedes a València',
        heroDescription: 'València compta amb més de 520 logopedes col·legiats. Transcriu les teues sessions amb 98% de precisió en valencià i castellà.',
        keywords: ['logopeda valencia', 'transcripció logopèdia valencia', 'logopedia valencia'],
      },
      es: {
        title: 'Transcripción para Logopedas en Valencia',
        metaDescription: 'Transcribe sesiones de logopedia en Valencia con IA. Más de 520 logopedas. 98% precisión. Prueba gratuita.',
        heroTitle: 'Transcripción para Logopedas en Valencia',
        heroDescription: 'Valencia cuenta con más de 520 logopedas colegiados. Transcribe tus sesiones con 98% de precisión en valenciano y castellano.',
        keywords: ['logopeda valencia', 'transcripción logopedia valencia', 'logopedia valencia'],
      },
      en: {
        title: 'Transcription for Speech Therapists in Valencia',
        metaDescription: 'Transcribe speech therapy sessions in Valencia with AI. Over 520 speech therapists. 98% accuracy. Free trial.',
        heroTitle: 'Transcription for Speech Therapists in Valencia',
        heroDescription: 'Valencia has over 520 registered speech therapists. Transcribe sessions in Spanish, Valencian, and English.',
        keywords: ['speech therapist valencia', 'speech therapy valencia', 'logopeda valencia'],
      },
    },
  },

  alicante: {
    slug: 'alicante',
    tier: 1,
    localInfo: {
      city: 'Alicante',
      province: 'Alicante',
      region: 'Alacantí',
      autonomousCommunity: 'Comunitat Valenciana',
      population: 337304,
      coordinates: { lat: 38.3452, lng: -0.4810 },
      speechTherapists: 245,
      hospitals: [
        'Hospital General Universitario de Alicante',
        'Hospital Universitario San Juan de Alicante',
      ],
      neighborhoods: [
        'Centro', 'Playa de San Juan', 'Albufereta', 'Carolinas',
        'Campoamor', 'San Blas', 'Benalúa',
      ],
    },
    specialties: ['dislexia', 'afasia', 'autismo', 'disfagia'],
    relatedCities: ['valencia', 'elche', 'benidorm', 'torrevieja'],
    content: {
      es: {
        title: 'Transcripción para Logopedas en Alicante',
        metaDescription: 'Transcribe sesiones de logopedia en Alicante con IA. Más de 245 logopedas. 98% precisión. Prueba gratuita.',
        heroTitle: 'Transcripción para Logopedas en Alicante',
        heroDescription: 'Alicante cuenta con más de 245 logopedas colegiados. Transcribe tus sesiones con tecnología IA y ahorra tiempo.',
        keywords: ['logopeda alicante', 'transcripción logopedia alicante', 'logopedia alicante'],
      },
      en: {
        title: 'Transcription for Speech Therapists in Alicante',
        metaDescription: 'Transcribe speech therapy sessions in Alicante with AI. Ideal for expat speech therapists on the Costa Blanca. Free trial.',
        heroTitle: 'Transcription for Speech Therapists in Alicante',
        heroDescription: 'Alicante\'s international community benefits from multilingual speech therapy services. Transcribe sessions in Spanish and English.',
        keywords: ['speech therapist alicante', 'speech therapy costa blanca', 'logopeda alicante'],
      },
    },
  },

  elche: {
    slug: 'elche',
    tier: 2,
    localInfo: {
      city: 'Elche',
      province: 'Alicante',
      region: 'Baix Vinalopó',
      autonomousCommunity: 'Comunitat Valenciana',
      population: 234765,
      coordinates: { lat: 38.2669, lng: -0.6983 },
      speechTherapists: 85,
      hospitals: ['Hospital General Universitario de Elche'],
      neighborhoods: ['Centro', 'Altabix', 'Carrús', 'Sector V'],
    },
    specialties: ['dislexia', 'autismo', 'tartamudez'],
    relatedCities: ['alicante', 'orihuela', 'santa-pola'],
    content: {},
  },

  castellon: {
    slug: 'castellon',
    tier: 2,
    localInfo: {
      city: 'Castelló de la Plana',
      province: 'Castelló',
      region: 'Plana Alta',
      autonomousCommunity: 'Comunitat Valenciana',
      population: 171728,
      coordinates: { lat: 39.9864, lng: -0.0513 },
      speechTherapists: 78,
      hospitals: ['Hospital General Universitari de Castelló'],
      neighborhoods: ['Centro', 'Grao', 'Rafalafena', 'San Agustín'],
    },
    specialties: ['dislexia', 'autismo'],
    relatedCities: ['valencia', 'benicarlo', 'vila-real'],
    content: {},
  },

  torrent: {
    slug: 'torrent',
    tier: 2,
    localInfo: {
      city: 'Torrent',
      province: 'València',
      region: 'Horta Oest',
      autonomousCommunity: 'Comunitat Valenciana',
      population: 83962,
      coordinates: { lat: 39.4372, lng: -0.4656 },
      speechTherapists: 32,
      hospitals: ['Hospital de Torrent'],
      neighborhoods: ['Centro', 'Santa Apolonia', 'El Alter', 'Parc Central'],
    },
    specialties: ['dislexia', 'autismo'],
    relatedCities: ['valencia', 'paterna', 'aldaia'],
    content: {},
  },

  benidorm: {
    slug: 'benidorm',
    tier: 2,
    localInfo: {
      city: 'Benidorm',
      province: 'Alicante',
      region: 'Marina Baixa',
      autonomousCommunity: 'Comunitat Valenciana',
      population: 69738,
      coordinates: { lat: 38.5410, lng: -0.1225 },
      speechTherapists: 28,
      hospitals: ['Hospital de la Marina Baixa'],
      neighborhoods: ['Casco Antiguo', 'Levante', 'Poniente', 'Rincón de Loix'],
    },
    specialties: ['dislexia', 'autismo'],
    relatedCities: ['alicante', 'altea', 'villajoyosa'],
    content: {
      en: {
        title: 'Transcription for Speech Therapists in Benidorm',
        metaDescription: 'Transcribe speech therapy sessions in Benidorm with AI. Ideal for international speech therapists. Free trial.',
        heroTitle: 'Transcription for Speech Therapists in Benidorm',
        heroDescription: 'Benidorm\'s large expat community requires multilingual speech therapy. Transcribe sessions efficiently.',
        keywords: ['speech therapist benidorm', 'speech therapy costa blanca', 'logopeda benidorm'],
      },
    },
  },
};

export default valenciaCities;
