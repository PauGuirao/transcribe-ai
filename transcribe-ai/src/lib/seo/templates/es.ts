// Spanish content templates for programmatic SEO
import { ContentTemplate, LocalInfo, H2Section, FAQ } from '../types';

export const spanish: ContentTemplate = {
  heroTitle: (city: string, specialty?: string) => {
    if (specialty) {
      return `Transcripción de Sesiones de ${specialty} en ${city}`;
    }
    return `Transcripción para Logopedas en ${city}`;
  },

  heroDescription: (city: string, population?: number, speechTherapists?: number) => {
    const parts = [`Plataforma de transcripción profesional para logopedas en ${city}.`];

    if (speechTherapists) {
      parts.push(`Más de ${speechTherapists} logopedas en la zona confían en herramientas digitales.`);
    }

    parts.push('98% de precisión. Prueba gratuita sin tarjeta.');

    return parts.join(' ');
  },

  metaDescription: (city: string, specialty?: string) => {
    if (specialty) {
      return `Transcribe sesiones de ${specialty.toLowerCase()} en ${city} con IA. 98% precisión. Ahorra 5h/semana en documentación. Prueba gratuita.`;
    }
    return `Transcribe sesiones de logopedia en ${city} con IA. 98% precisión. Ahorra 5h/semana en documentación. Prueba gratuita.`;
  },

  h2Sections: (city: string, localInfo: LocalInfo, specialty?: string): H2Section[] => {
    const sections: H2Section[] = [];

    // Section 1: Local context
    sections.push({
      title: `La logopedia en ${city}`,
      content: generateLocalContext(city, localInfo),
    });

    // Section 2: Features/Benefits
    sections.push({
      title: `Por qué los logopedas de ${city} eligen Transcriu`,
      points: [
        'Transcripción automática con 98% de precisión',
        'Identificación automática de hablantes (logopeda y paciente)',
        'Exportación a PDF, Word y texto plano',
        'Vocabulario especializado en logopedia',
        'Datos encriptados y almacenamiento seguro',
        'Compatible con cualquier dispositivo de grabación',
      ],
    });

    // Section 3: Use cases
    sections.push({
      title: 'Casos de uso para tu consulta',
      useCases: [
        'Documentación de sesiones de terapia del lenguaje',
        'Transcripción de evaluaciones iniciales',
        'Registro de seguimiento de pacientes',
        'Elaboración de informes clínicos',
        'Análisis de muestras de habla',
        'Documentación para coordinación con otros profesionales',
      ],
    });

    // Section 4: Specialty-specific (if applicable)
    if (specialty) {
      sections.push({
        title: `Transcripción especializada en ${specialty}`,
        content: generateSpecialtyContent(specialty, city),
      });
    }

    return sections;
  },

  faqs: (city: string, specialty?: string): FAQ[] => {
    const faqs: FAQ[] = [
      {
        question: `¿Cómo funciona Transcriu para logopedas en ${city}?`,
        answer: `Transcriu es una plataforma de transcripción automática diseñada específicamente para logopedas. Simplemente subes el audio de tu sesión y en pocos minutos obtienes una transcripción precisa, con identificación de hablantes y vocabulario especializado.`,
      },
      {
        question: '¿Qué precisión tiene la transcripción?',
        answer: 'Nuestra tecnología de IA alcanza una precisión del 98% en español. El sistema está entrenado con vocabulario específico de logopedia para garantizar la calidad de las transcripciones clínicas.',
      },
      {
        question: '¿Los datos de mis pacientes están seguros?',
        answer: 'Absolutamente. Todos los datos se encriptan tanto en tránsito como en reposo. Cumplimos con el RGPD y la normativa de protección de datos sanitarios. Los audios se pueden eliminar automáticamente después de la transcripción.',
      },
      {
        question: '¿Puedo probar Transcriu gratuitamente?',
        answer: 'Sí, ofrecemos una prueba gratuita sin necesidad de tarjeta de crédito. Puedes transcribir tus primeras sesiones y ver cómo Transcriu puede ayudarte a ahorrar tiempo en documentación.',
      },
      {
        question: '¿En qué formatos puedo exportar las transcripciones?',
        answer: 'Puedes exportar las transcripciones en PDF, Microsoft Word (DOCX) y texto plano. También puedes copiar el texto directamente para pegarlo en tus informes clínicos.',
      },
      {
        question: '¿Transcriu funciona con el sistema de salud público?',
        answer: 'Sí, Transcriu es compatible con los flujos de trabajo tanto del sistema público como privado. Las transcripciones se pueden integrar fácilmente en los informes clínicos requeridos por cualquier sistema de salud.',
      },
    ];

    if (specialty) {
      faqs.push({
        question: `¿Transcriu funciona bien para sesiones de ${specialty.toLowerCase()}?`,
        answer: `Sí, Transcriu está optimizado para todo tipo de sesiones de logopedia, incluyendo ${specialty.toLowerCase()}. El vocabulario especializado y la identificación de hablantes facilitan la documentación de estas sesiones.`,
      });
    }

    return faqs;
  },
};

function generateLocalContext(city: string, localInfo: LocalInfo): string {
  const parts: string[] = [];

  parts.push(`${city} es una de las ciudades más importantes de ${localInfo.autonomousCommunity} para servicios de logopedia.`);

  if (localInfo.population) {
    parts.push(`Con una población de ${localInfo.population.toLocaleString('es-ES')} habitantes, la demanda de servicios logopédicos es significativa.`);
  }

  if (localInfo.speechTherapists) {
    parts.push(`La ciudad cuenta con aproximadamente ${localInfo.speechTherapists} logopedas colegiados activos.`);
  }

  parts.push('Transcriu ayuda a los profesionales de la zona a optimizar su tiempo dedicado a documentación, permitiendo centrarse más en la atención a los pacientes.');

  return parts.join(' ');
}

function generateSpecialtyContent(specialty: string, city: string): string {
  const specialtyContent: Record<string, string> = {
    'Dislexia': `La dislexia es uno de los trastornos más frecuentes atendidos por logopedas en ${city}. Transcriu facilita la documentación de las sesiones de intervención, permitiendo registrar el progreso del paciente y las estrategias utilizadas de forma precisa.`,
    'Afasia': `La afasia requiere un seguimiento detallado de la recuperación del lenguaje. Con Transcriu, los logopedas de ${city} pueden documentar cada sesión de rehabilitación con precisión, facilitando el análisis de la evolución del paciente.`,
    'Tartamudez': `El tratamiento de la tartamudez en ${city} requiere un registro preciso de las sesiones de terapia. Transcriu permite capturar las intervenciones y el progreso del paciente con la identificación automática de hablantes.`,
    'Autismo': `La intervención logopédica en TEA (Trastorno del Espectro Autista) en ${city} implica sesiones estructuradas que se benefician de una documentación precisa. Transcriu ayuda a registrar cada interacción y progreso comunicativo.`,
    'TEA': `La intervención logopédica en TEA (Trastorno del Espectro Autista) en ${city} implica sesiones estructuradas que se benefician de una documentación precisa. Transcriu ayuda a registrar cada interacción y progreso comunicativo.`,
    'Disfagia': `La disfagia requiere evaluaciones y seguimientos detallados. Los logopedas de ${city} pueden usar Transcriu para documentar las sesiones de terapia de deglución, registrando observaciones y progresos de manera eficiente.`,
    'Voz': `Los trastornos de la voz son frecuentes en ${city}, especialmente entre profesionales que usan la voz como herramienta de trabajo. Transcriu facilita la documentación de las sesiones de rehabilitación vocal y el seguimiento del progreso.`,
  };

  return specialtyContent[specialty] || `La transcripción de sesiones de ${specialty.toLowerCase()} en ${city} es ahora más fácil con Transcriu. Nuestra tecnología de IA captura cada detalle de la sesión para una documentación completa.`;
}

export default spanish;
