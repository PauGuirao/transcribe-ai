// Catalan content templates for programmatic SEO
import { ContentTemplate, LocalInfo, H2Section, FAQ } from '../types';

export const catalan: ContentTemplate = {
  heroTitle: (city: string, specialty?: string) => {
    if (specialty) {
      return `Transcripció de Sessions de ${specialty} a ${city}`;
    }
    return `Transcripció per a Logopedes a ${city}`;
  },

  heroDescription: (city: string, population?: number, speechTherapists?: number) => {
    const parts = [`Plataforma de transcripció professional per a logopedes a ${city}.`];

    if (speechTherapists) {
      parts.push(`Més de ${speechTherapists} logopedes a la zona confien en eines digitals.`);
    }

    parts.push('98% de precisió en català. Prova gratuïta sense targeta.');

    return parts.join(' ');
  },

  metaDescription: (city: string, specialty?: string) => {
    if (specialty) {
      return `Transcriu sessions de ${specialty.toLowerCase()} a ${city} amb IA. 98% precisió en català. Estalvia 5h/setmana en documentació. Prova gratuïta.`;
    }
    return `Transcriu sessions de logopèdia a ${city} amb IA. 98% precisió en català. Estalvia 5h/setmana en documentació. Prova gratuïta.`;
  },

  h2Sections: (city: string, localInfo: LocalInfo, specialty?: string): H2Section[] => {
    const sections: H2Section[] = [];

    // Section 1: Local context
    sections.push({
      title: `La logopèdia a ${city}`,
      content: generateLocalContext(city, localInfo),
    });

    // Section 2: Features/Benefits
    sections.push({
      title: `Per què els logopedes de ${city} escullen Transcriu`,
      points: [
        'Transcripció automàtica en català amb 98% de precisió',
        'Identificació automàtica de parlants (logopeda i pacient)',
        'Exportació a PDF, Word i text pla',
        'Vocabulari especialitzat en logopèdia',
        'Dades encriptades i emmagatzematge segur',
        'Compatible amb qualsevol dispositiu de gravació',
      ],
    });

    // Section 3: Use cases
    sections.push({
      title: 'Casos d\'ús per a la teva consulta',
      useCases: [
        'Documentació de sessions de teràpia del llenguatge',
        'Transcripció d\'avaluacions inicials',
        'Registre de seguiment de pacients',
        'Elaboració d\'informes clínics',
        'Anàlisi de mostres de parla',
        'Documentació per a coordinació amb altres professionals',
      ],
    });

    // Section 4: Specialty-specific (if applicable)
    if (specialty) {
      sections.push({
        title: `Transcripció especialitzada en ${specialty}`,
        content: generateSpecialtyContent(specialty, city),
      });
    }

    return sections;
  },

  faqs: (city: string, specialty?: string): FAQ[] => {
    const faqs: FAQ[] = [
      {
        question: `Com funciona Transcriu per a logopedes a ${city}?`,
        answer: `Transcriu és una plataforma de transcripció automàtica dissenyada específicament per a logopedes. Simplement puges l'àudio de la teva sessió i en pocs minuts obtens una transcripció precisa en català, amb identificació de parlants i vocabulari especialitzat.`,
      },
      {
        question: 'Quina precisió té la transcripció en català?',
        answer: 'La nostra tecnologia d\'IA aconsegueix una precisió del 98% en català, incloent les variants dialectals. El sistema està entrenat amb vocabulari específic de logopèdia per garantir la qualitat.',
      },
      {
        question: 'Les dades dels meus pacients estan segures?',
        answer: 'Absolutament. Totes les dades s\'encripten tant en trànsit com en repòs. Complim amb el RGPD i la normativa de protecció de dades sanitàries. Els àudios es poden eliminar automàticament després de la transcripció.',
      },
      {
        question: 'Puc provar Transcriu gratuïtament?',
        answer: 'Sí, oferim una prova gratuïta sense necessitat de targeta de crèdit. Pots transcriure les teves primeres sessions i veure com Transcriu pot ajudar-te a estalviar temps en documentació.',
      },
      {
        question: 'En quins formats puc exportar les transcripcions?',
        answer: 'Pots exportar les transcripcions en PDF, Microsoft Word (DOCX) i text pla. També pots copiar el text directament per enganxar-lo als teus informes clínics.',
      },
    ];

    if (specialty) {
      faqs.push({
        question: `Transcriu funciona bé per a sessions de ${specialty.toLowerCase()}?`,
        answer: `Sí, Transcriu està optimitzat per a tot tipus de sessions de logopèdia, incloent ${specialty.toLowerCase()}. El vocabulari especialitzat i la identificació de parlants faciliten la documentació d'aquestes sessions.`,
      });
    }

    return faqs;
  },
};

function generateLocalContext(city: string, localInfo: LocalInfo): string {
  const parts: string[] = [];

  parts.push(`${city} és una de les ciutats més importants de ${localInfo.autonomousCommunity} per a serveis de logopèdia.`);

  if (localInfo.population) {
    parts.push(`Amb una població de ${localInfo.population.toLocaleString('ca-ES')} habitants, la demanda de serveis logopèdics és significativa.`);
  }

  if (localInfo.speechTherapists) {
    parts.push(`La ciutat compta amb aproximadament ${localInfo.speechTherapists} logopedes col·legiats actius.`);
  }

  parts.push('Transcriu ajuda als professionals de la zona a optimitzar el seu temps dedicat a documentació, permetent centrar-se més en l\'atenció als pacients.');

  return parts.join(' ');
}

function generateSpecialtyContent(specialty: string, city: string): string {
  const specialtyContent: Record<string, string> = {
    'Dislèxia': `La dislèxia és un dels trastorns més freqüents atesos pels logopedes a ${city}. Transcriu facilita la documentació de les sessions d'intervenció, permetent registrar el progrés del pacient i les estratègies utilitzades de forma precisa.`,
    'Afàsia': `L'afàsia requereix un seguiment detallat de la recuperació del llenguatge. Amb Transcriu, els logopedes de ${city} poden documentar cada sessió de rehabilitació amb precisió, facilitant l'anàlisi de l'evolució del pacient.`,
    'Tartamudesa': `El tractament de la tartamudesa a ${city} requereix un registre acurat de les sessions de teràpia. Transcriu permet capturar les intervencions i el progrés del pacient amb la identificació automàtica de parlants.`,
    'TEA': `La intervenció logopèdica en TEA (Trastorn de l'Espectre Autista) a ${city} implica sessions estructurades que es beneficien d'una documentació precisa. Transcriu ajuda a registrar cada interacció i progrés comunicatiu.`,
  };

  return specialtyContent[specialty] || `La transcripció de sessions de ${specialty.toLowerCase()} a ${city} és ara més fàcil amb Transcriu. La nostra tecnologia d'IA captura cada detall de la sessió per a una documentació completa.`;
}

export default catalan;
