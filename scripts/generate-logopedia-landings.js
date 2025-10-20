#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Catalonia provinces and major cities
const catalanData = {
  provinces: [
    { name: 'Barcelona', cities: ['Barcelona', 'Hospitalet de Llobregat', 'Badalona', 'Terrassa', 'Sabadell', 'Mataró', 'Santa Coloma de Gramenet', 'Cornellà de Llobregat', 'Sant Boi de Llobregat', 'Manresa', 'Granollers', 'Rubí', 'Vilanova i la Geltrú', 'Gavà', 'Viladecans', 'El Prat de Llobregat', 'Mollet del Vallès', 'Cerdanyola del Vallès', 'Sant Cugat del Vallès', 'Igualada'] },
    { name: 'Girona', cities: ['Girona', 'Figueres', 'Blanes', 'Lloret de Mar', 'Olot', 'Salt', 'Palafrugell', 'Sant Feliu de Guíxols', 'Roses', 'Palamós', 'Banyoles', 'Ripoll', 'Puigcerdà', 'Cadaqués', 'Tossa de Mar'] },
    { name: 'Lleida', cities: ['Lleida', 'Balaguer', 'Tàrrega', 'Mollerussa', 'La Seu d\'Urgell', 'Cervera', 'Almacelles', 'Solsona', 'Tremp', 'Agramunt', 'Artesa de Segre', 'Bellpuig', 'Guissona', 'Ponts', 'Sort'] },
    { name: 'Tarragona', cities: ['Tarragona', 'Reus', 'Tortosa', 'El Vendrell', 'Cambrils', 'Vila-seca', 'Salou', 'Valls', 'Amposta', 'Deltebre', 'Calafell', 'Constantí', 'La Canonja', 'Torredembarra', 'Altafulla'] }
  ]
};

// Specialties with richer content
const logopediaSpecialties = [
  { 
    slug: 'logopedia-infantil', 
    name: 'Logopèdia Infantil',
    searchTerm: 'logopèdia infantil',
    description: 'especialitzada en nens i adolescents',
    benefit: 'Documenta el progrés dels teus pacients infantils amb transcripcions precises',
    useCases: ['Retards del llenguatge', 'Problemes d\'articulació', 'Dislèxia infantil']
  },
  { 
    slug: 'logopedia-adults', 
    name: 'Logopèdia per Adults',
    searchTerm: 'logopèdia adults',
    description: 'per a persones adultes',
    benefit: 'Registra sessions de teràpia amb adults de forma professional',
    useCases: ['Rehabilitació post-ictus', 'Problemes de veu', 'Disfàgia']
  },
  { 
    slug: 'trastorns-llenguatge', 
    name: 'Trastorns del Llenguatge',
    searchTerm: 'trastorns del llenguatge',
    description: 'per a trastorns específics del llenguatge',
    benefit: 'Seguiment detallat de l\'evolució dels trastorns del llenguatge',
    useCases: ['TEL', 'Retards del llenguatge', 'Trastorns semàntics']
  },
  { 
    slug: 'disfagia', 
    name: 'Disfàgia',
    searchTerm: 'tractament disfàgia',
    description: 'per a problemes de deglució',
    benefit: 'Documenta avaluacions i tractaments de disfàgia',
    useCases: ['Disfàgia orofaríngia', 'Post-operatori', 'Neurològica']
  },
  { 
    slug: 'afasia', 
    name: 'Afàsia',
    searchTerm: 'tractament afàsia',
    description: 'per a recuperació del llenguatge després d\'ictus',
    benefit: 'Transcriu sessions de rehabilitació del llenguatge',
    useCases: ['Afàsia de Broca', 'Afàsia de Wernicke', 'Rehabilitació post-ictus']
  },
  { 
    slug: 'tartamudesa', 
    name: 'Tartamudesa',
    searchTerm: 'tractament tartamudesa',
    description: 'per a trastorns de fluïdesa',
    benefit: 'Analitza la fluïdesa verbal amb registres precisos',
    useCases: ['Disfèmia infantil', 'Tartamudesa en adults', 'Trastorns de fluïdesa']
  },
  { 
    slug: 'veu', 
    name: 'Trastorns de la Veu',
    searchTerm: 'logopèdia veu',
    description: 'per a problemes vocals',
    benefit: 'Registra teràpies vocals amb alta qualitat d\'àudio',
    useCases: ['Disfonies', 'Nòduls vocals', 'Problemes professionals de la veu']
  },
  { 
    slug: 'tea', 
    name: 'TEA',
    searchTerm: 'logopèdia autisme',
    description: 'especialitzada en Trastorn de l\'Espectre Autista',
    benefit: 'Documenta el desenvolupament comunicatiu en TEA',
    useCases: ['Comunicació funcional', 'Pragmàtica', 'Llenguatge verbal']
  }
];

// Service types with enhanced content
const serviceTypes = [
  { 
    slug: 'sessions', 
    name: 'Sessions',
    searchTerm: 'sessions de logopèdia',
    description: 'sessions de logopèdia',
    verb: 'Transcriu',
    benefit: 'No perdis temps redactant notes. Centra\'t en el pacient.'
  },
  { 
    slug: 'avaluacions', 
    name: 'Avaluacions',
    searchTerm: 'avaluacions logopèdiques',
    description: 'avaluacions logopèdiques',
    verb: 'Documenta',
    benefit: 'Genera informes d\'avaluació automàticament des de les teves gravacions.'
  },
  { 
    slug: 'informes', 
    name: 'Informes',
    searchTerm: 'informes logopèdia',
    description: 'informes de logopèdia',
    verb: 'Crea',
    benefit: 'Converteix les teves notes d\'àudio en informes professionals.'
  },
  { 
    slug: 'seguiment', 
    name: 'Seguiment',
    searchTerm: 'seguiment pacients',
    description: 'seguiment de pacients',
    verb: 'Registra',
    benefit: 'Mantén un historial complet de l\'evolució dels teus pacients.'
  }
];

function generateSlug(city, province, specialty = null, service = null) {
  let parts = [];
  
  if (specialty) parts.push(specialty.slug);
  if (service) parts.push(service.slug);
  
  parts.push(city.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/'/g, '')
    .replace(/à/g, 'a')
    .replace(/è/g, 'e')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ò/g, 'o')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u')
    .replace(/ü/g, 'u')
    .replace(/ç/g, 'c')
    .replace(/ñ/g, 'n'));
    
  return parts.join('-');
}

function generateLandingContent(city, province, specialty = null, service = null) {
  const isCapital = city === province;
  const cityVariant = isCapital ? `la ciutat de ${city}` : city;
  
  let content = {};
  
  if (specialty && service) {
    // Combined: Specialty + Service + City
    content = {
      title: `${service.name} de ${specialty.name} ${city} | Transcriu.com`,
      metaDescription: `${service.verb} ${service.description} de ${specialty.name} a ${city}. Plataforma professional per a logopedes amb transcripció automàtica en català. Prova gratuïta.`,
      heroTitle: `${service.verb} ${service.name} de ${specialty.name} a ${city}`,
      heroDescription: `Plataforma de transcripció per a logopedes de ${cityVariant}. ${specialty.benefit}. Transcripció automàtica en català amb alta precisió.`,
      description: `Servei de transcripció especialitzat en ${service.description} de ${specialty.name} per a professionals de ${city}, ${province}. ${service.benefit}`,
      keywords: [
        `${specialty.searchTerm} ${city.toLowerCase()}`,
        `${service.searchTerm} ${city.toLowerCase()}`,
        `logopeda ${city.toLowerCase()}`,
        'transcripció logopèdia',
        `${specialty.slug} ${province.toLowerCase()}`
      ],
      h2Sections: [
        {
          title: `Per què triar Transcriu.com per a ${specialty.name} a ${city}?`,
          content: `Els logopedes de ${city} confien en Transcriu.com per documentar les seves ${service.description}. ${service.benefit} La nostra plataforma està optimitzada per comprendre el vocabulari tècnic de ${specialty.name}.`
        },
        {
          title: 'Beneficis per a logopedes',
          points: [
            'Transcripció en català amb precisió superior al 95%',
            'Privacitat total: les teves dades no surten mai del servidor',
            'Exporta a Word, PDF o text pla',
            'Vocabulari especialitzat en logopèdia'
          ]
        },
        {
          title: `Casos d'ús a ${city}`,
          useCases: specialty.useCases
        }
      ]
    };
  } else if (specialty) {
    // Specialty + City
    content = {
      title: `Transcripció ${specialty.name} ${city} | Logopèdia Professional`,
      metaDescription: `Transcriu sessions de ${specialty.name} a ${city}. Eina professional per a logopedes amb transcripció automàtica en català. Alta precisió i seguretat garantida.`,
      heroTitle: `Transcripció de ${specialty.name} a ${city}`,
      heroDescription: `Plataforma de transcripció dissenyada per a logopedes ${specialty.description} a ${cityVariant}, ${province}. ${specialty.benefit}.`,
      description: `Servei de transcripció especialitzat en ${specialty.name} per a professionals de la logopèdia a ${city}. Documenta sessions, avaluacions i informes amb transcripció automàtica en català.`,
      keywords: [
        `${specialty.searchTerm} ${city.toLowerCase()}`,
        `logopeda ${specialty.slug} ${city.toLowerCase()}`,
        'transcripció logopèdia català',
        `${specialty.name.toLowerCase()} ${province.toLowerCase()}`
      ],
      h2Sections: [
        {
          title: `Transcripció professional per a ${specialty.name}`,
          content: `A ${city} trobaràs logopedes especialitzats en ${specialty.name}. Transcriu.com t'ajuda a documentar les teves sessions amb la màxima precisió.`
        },
        {
          title: 'Característiques clau',
          points: [
            'Motors de IA entrenats en català',
            'Reconeixement de terminologia mèdica',
            'Gestió segura de dades sensibles',
            'Formats d\'exportació professionals'
          ]
        }
      ]
    };
  } else if (service) {
    // Service + City
    content = {
      title: `${service.name} de Logopèdia ${city} | Transcripció Automàtica`,
      metaDescription: `${service.verb} ${service.description} a ${city} amb transcripció automàtica. ${service.benefit} Prova gratuïta per a logopedes.`,
      heroTitle: `${service.verb} ${service.name} de Logopèdia a ${city}`,
      heroDescription: `Eina professional per a logopedes de ${cityVariant}. ${service.benefit} Transcripció automàtica en català amb alta precisió.`,
      description: `Servei de transcripció per a ${service.description} a ${city}, ${province}. Ideal per a professionals de la logopèdia que volen optimitzar el seu temps.`,
      keywords: [
        `${service.searchTerm} ${city.toLowerCase()}`,
        `logopeda ${city.toLowerCase()}`,
        'transcripció automàtica català',
        `${service.slug} ${province.toLowerCase()}`
      ],
      h2Sections: [
        {
          title: `Optimitza les teves ${service.name} a ${city}`,
          content: `${service.benefit} Transcriu.com permet als logopedes de ${city} centrar-se en el que importa: els seus pacients.`
        },
        {
          title: 'Com funciona',
          points: [
            'Grava les teves sessions o puja fitxers d\'àudio',
            'La IA transcriu automàticament en minuts',
            'Revisa i edita si cal',
            'Exporta a Word, PDF o comparteix en línia'
          ]
        }
      ]
    };
  } else {
    // Basic City
    content = {
      title: `Transcripció Logopèdia ${city} | Transcriu.com`,
      metaDescription: `Transcriu sessions de logopèdia a ${city} amb precisió professional. Plataforma en català per a logopedes. Privada, segura i ràpida. Prova gratuïta disponible.`,
      heroTitle: `Transcripció de Logopèdia a ${city}`,
      heroDescription: `Plataforma professional per a logopedes de ${cityVariant}, ${province}. Transcriu sessions, avaluacions i informes amb transcripció automàtica en català.`,
      description: `Servei de transcripció especialitzat per a logopedes de ${city}. Documenta les teves sessions de forma segura i eficient amb la nostra eina de transcripció en català.`,
      keywords: [
        `logopeda ${city.toLowerCase()}`,
        `logopèdia ${city.toLowerCase()}`,
        'transcripció logopèdia català',
        `sessions logopèdia ${province.toLowerCase()}`
      ],
      h2Sections: [
        {
          title: `Per què els logopedes de ${city} trien Transcriu.com`,
          content: `A ${city} hi ha una comunitat creixent de logopedes que utilitzen Transcriu.com per documentar les seves sessions. La nostra plataforma ofereix transcripció automàtica en català amb alta precisió.`
        },
        {
          title: 'Avantatges per a professionals',
          points: [
            'Estalvia hores de documentació manual',
            'Millora la qualitat dels teus informes',
            'Compliment amb RGPD i protecció de dades',
            'Suport tècnic en català'
          ]
        },
        {
          title: `Logopèdia a ${city}`,
          content: `Els professionals de la logopèdia a ${city} poden beneficiar-se d'una eina que entén el context local i el vocabulari específic del català de ${province}.`
        }
      ]
    };
  }
  
  return content;
}

function generateAllLandings() {
  const landings = {};
  let count = 0;
  
  catalanData.provinces.forEach(province => {
    province.cities.forEach((city, cityIndex) => {
      // 1. Basic city landing (ALL cities)
      const basicSlug = generateSlug(city, province.name);
      landings[basicSlug] = generateLandingContent(city, province.name);
      count++;
      
      // 2. Service landings (top 8 cities per province)
      if (cityIndex < 8) {
        serviceTypes.forEach(service => {
          const serviceSlug = generateSlug(city, province.name, null, service);
          landings[serviceSlug] = generateLandingContent(city, province.name, null, service);
          count++;
        });
      }
      
      // 3. Specialty landings (top 5 cities per province)
      if (cityIndex < 5) {
        logopediaSpecialties.forEach(specialty => {
          const specialtySlug = generateSlug(city, province.name, specialty);
          landings[specialtySlug] = generateLandingContent(city, province.name, specialty);
          count++;
        });
      }
      
      // 4. Combined specialty + service (top 3 cities per province)
      if (cityIndex < 3) {
        logopediaSpecialties.slice(0, 4).forEach(specialty => { // Top 4 specialties
          serviceTypes.slice(0, 2).forEach(service => { // Top 2 services
            const combinedSlug = generateSlug(city, province.name, specialty, service);
            landings[combinedSlug] = generateLandingContent(city, province.name, specialty, service);
            count++;
          });
        });
      }
    });
  });
  
  console.log(`✅ Generated ${count} landing pages`);
  return landings;
}

// Generate and save
const allLandings = generateAllLandings();
const outputPath = path.join(__dirname, '../src/app/landings/landings.json');

// Ensure directory exists
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Write formatted JSON
fs.writeFileSync(outputPath, JSON.stringify(allLandings, null, 2), 'utf8');

console.log(`\n📁 File saved: ${outputPath}`);
console.log(`📊 Total pages: ${Object.keys(allLandings).length}`);

// Statistics
const stats = {
  basic: 0,
  service: 0,
  specialty: 0,
  combined: 0
};

Object.keys(allLandings).forEach(slug => {
  const parts = slug.split('-');
  if (parts.length === 1) stats.basic++;
  else if (parts.length === 2) stats.service++;
  else if (parts.length === 3) stats.specialty++;
  else stats.combined++;
});

console.log('\n📈 Distribution:');
console.log(`  Basic city pages: ${stats.basic}`);
console.log(`  Service pages: ${stats.service}`);
console.log(`  Specialty pages: ${stats.specialty}`);
console.log(`  Combined pages: ${stats.combined}`);

console.log('\n🔍 Sample URLs:');
console.log('  https://transcriu.com/landings/barcelona');
console.log('  https://transcriu.com/landings/sessions-girona');
console.log('  https://transcriu.com/landings/logopedia-infantil-lleida');
console.log('  https://transcriu.com/landings/logopedia-infantil-sessions-tarragona');

console.log('\n💡 Next steps:');
console.log('  1. Create dynamic routes in Next.js: /landings/[slug]');
console.log('  2. Generate sitemap.xml with all landing URLs');
console.log('  3. Add schema.org LocalBusiness markup');
console.log('  4. Submit sitemap to Google Search Console');