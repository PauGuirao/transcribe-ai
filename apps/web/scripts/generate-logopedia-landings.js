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

// Specialties - EXPANDED with more variations
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
  },
  // NEW SPECIALTIES
  { 
    slug: 'dislexia', 
    name: 'Dislèxia',
    searchTerm: 'tractament dislèxia',
    description: 'per a trastorns de lectoescriptura',
    benefit: 'Segueix l\'evolució dels trastorns de lectura i escriptura',
    useCases: ['Dislèxia evolutiva', 'Disgràfia', 'Discalcúlia']
  },
  { 
    slug: 'parkinson', 
    name: 'Parkinson',
    searchTerm: 'logopèdia parkinson',
    description: 'per a malalties neurodegeneratives',
    benefit: 'Documenta teràpies de veu i deglució en Parkinson',
    useCases: ['Disàrtria', 'Hipofonia', 'Problemes de deglució']
  }
];

// Service types - EXPANDED
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
  },
  // NEW SERVICES
  { 
    slug: 'teràpia', 
    name: 'Teràpia',
    searchTerm: 'teràpia logopèdica',
    description: 'sessions de teràpia',
    verb: 'Documenta',
    benefit: 'Registra cada sessió terapèutica amb detall professional.'
  },
  { 
    slug: 'consultes', 
    name: 'Consultes',
    searchTerm: 'consultes logopèdia',
    description: 'consultes logopèdiques',
    verb: 'Registra',
    benefit: 'Mantén un registre complet de totes les consultes.'
  }
];

// NEW: Additional modifiers for more variations
const modifiers = [
  { slug: 'online', name: 'Online', desc: 'en línia' },
  { slug: 'domicili', name: 'a Domicili', desc: 'amb desplaçament' },
  { slug: 'centre', name: 'al Centre', desc: 'al consultori' },
  { slug: 'urgent', name: 'Urgent', desc: 'prioritària' },
  { slug: 'privat', name: 'Privat', desc: 'privada' }
];

// NEW: Patient types for more targeting
const patientTypes = [
  { slug: 'nens', name: 'Nens', age: 'infantil' },
  { slug: 'bebes', name: 'Bebès', age: '0-3 anys' },
  { slug: 'adolescents', name: 'Adolescents', age: '12-18 anys' },
  { slug: 'adults', name: 'Adults', age: '+18 anys' },
  { slug: 'gent-gran', name: 'Gent Gran', age: '+65 anys' }
];

function generateSlug(...parts) {
  return parts
    .filter(Boolean)
    .map(part => typeof part === 'string' ? part : part.slug)
    .join('-')
    .toLowerCase()
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
    .replace(/ñ/g, 'n');
}

function generateLandingContent(city, province, options = {}) {
  const { specialty, service, modifier, patientType } = options;
  const isCapital = city === province;
  const cityVariant = isCapital ? `la ciutat de ${city}` : city;
  
  let content = {};
  let titleParts = [];
  let keywordParts = [];
  
  // Build title components
  if (service) titleParts.push(service.name);
  if (specialty) titleParts.push(specialty.name);
  if (patientType) titleParts.push(`per a ${patientType.name}`);
  if (modifier) titleParts.push(modifier.name);
  titleParts.push(city);
  
  // Build hero title
  let heroPrefix = service ? service.verb : 'Transcriu';
  let heroSubject = [];
  if (service) heroSubject.push(service.description);
  if (specialty) heroSubject.push(`de ${specialty.name}`);
  if (patientType) heroSubject.push(`per a ${patientType.name.toLowerCase()}`);
  if (modifier) heroSubject.push(modifier.desc);
  
  // Keywords
  keywordParts.push(city.toLowerCase());
  if (specialty) keywordParts.push(specialty.searchTerm);
  if (service) keywordParts.push(service.searchTerm);
  if (patientType) keywordParts.push(patientType.slug);
  if (modifier) keywordParts.push(modifier.slug);
  
  content = {
    title: `${titleParts.join(' ')} | Transcriu.com`,
    metaDescription: `${heroPrefix} ${heroSubject.join(' ')} a ${city}. Plataforma professional per a logopedes amb transcripció automàtica en català. Prova gratuïta.`,
    heroTitle: `${heroPrefix} ${heroSubject.join(' ')} a ${city}`,
    heroDescription: `Plataforma de transcripció per a logopedes de ${cityVariant}, ${province}. ${specialty ? specialty.benefit : 'Transcripció professional amb alta precisió'}. Eina dissenyada per a professionals.`,
    description: `Servei de transcripció ${specialty ? `especialitzat en ${specialty.name}` : 'professional'} per a logopedes de ${city}. ${service ? service.benefit : 'Documenta les teves sessions amb facilitat'}.`,
    keywords: keywordParts.concat(['logopèdia', 'transcripció', province.toLowerCase()]),
    h2Sections: [
      {
        title: `Per què triar Transcriu.com a ${city}?`,
        content: `Els logopedes de ${city} confien en Transcriu.com per documentar les seves sessions. ${service ? service.benefit : 'La nostra plataforma ofereix transcripció automàtica en català amb alta precisió.'}`
      },
      {
        title: 'Característiques principals',
        points: [
          'Transcripció en català amb precisió superior al 95%',
          'Privacitat total: dades protegides amb xifratge',
          'Exporta a Word, PDF o text pla',
          `Vocabulari especialitzat ${specialty ? `en ${specialty.name.toLowerCase()}` : 'en logopèdia'}`
        ]
      }
    ]
  };
  
  if (specialty && specialty.useCases) {
    content.h2Sections.push({
      title: `Casos d'ús a ${city}`,
      useCases: specialty.useCases
    });
  }
  
  return content;
}

function generateAllLandings(mode = 'incremental') {
  let landings = {};
  
  // Load existing if incremental mode
  const existingPath = path.join(__dirname, '../src/app/landings/landings.json');
  if (mode === 'incremental' && fs.existsSync(existingPath)) {
    landings = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
    console.log(`📂 Loaded ${Object.keys(landings).length} existing landings`);
  }
  
  let newCount = 0;
  let skippedCount = 0;
  
  function addLanding(slug, content) {
    if (!landings[slug]) {
      landings[slug] = content;
      newCount++;
      return true;
    }
    skippedCount++;
    return false;
  }
  
  catalanData.provinces.forEach(province => {
    province.cities.forEach((city, cityIndex) => {
      
      // LEVEL 1: Basic city landings (ALL cities)
      const basicSlug = generateSlug(city);
      addLanding(basicSlug, generateLandingContent(city, province.name));
      
      // LEVEL 2: Service landings (top 10 cities)
      if (cityIndex < 10) {
        serviceTypes.forEach(service => {
          const slug = generateSlug(service.slug, city);
          addLanding(slug, generateLandingContent(city, province.name, { service }));
        });
      }
      
      // LEVEL 3: Specialty landings (top 8 cities)
      if (cityIndex < 8) {
        logopediaSpecialties.forEach(specialty => {
          const slug = generateSlug(specialty.slug, city);
          addLanding(slug, generateLandingContent(city, province.name, { specialty }));
        });
      }
      
      // LEVEL 4: Specialty + Service (top 5 cities)
      if (cityIndex < 5) {
        logopediaSpecialties.forEach(specialty => {
          serviceTypes.slice(0, 3).forEach(service => {
            const slug = generateSlug(specialty.slug, service.slug, city);
            addLanding(slug, generateLandingContent(city, province.name, { specialty, service }));
          });
        });
      }
      
      // LEVEL 5: Patient Type variations (top 3 cities)
      if (cityIndex < 3) {
        patientTypes.forEach(patientType => {
          // Patient + City
          const slug1 = generateSlug(patientType.slug, city);
          addLanding(slug1, generateLandingContent(city, province.name, { patientType }));
          
          // Patient + Specialty + City
          logopediaSpecialties.slice(0, 3).forEach(specialty => {
            const slug2 = generateSlug(specialty.slug, patientType.slug, city);
            addLanding(slug2, generateLandingContent(city, province.name, { specialty, patientType }));
          });
        });
      }
      
      // LEVEL 6: Modifier variations (capital cities only)
      if (cityIndex === 0) {
        modifiers.forEach(modifier => {
          // Modifier + City
          const slug1 = generateSlug(modifier.slug, city);
          addLanding(slug1, generateLandingContent(city, province.name, { modifier }));
          
          // Modifier + Specialty + City
          logopediaSpecialties.slice(0, 4).forEach(specialty => {
            const slug2 = generateSlug(specialty.slug, modifier.slug, city);
            addLanding(slug2, generateLandingContent(city, province.name, { specialty, modifier }));
          });
          
          // Modifier + Service + City
          serviceTypes.slice(0, 2).forEach(service => {
            const slug3 = generateSlug(service.slug, modifier.slug, city);
            addLanding(slug3, generateLandingContent(city, province.name, { service, modifier }));
          });
        });
      }
    });
  });
  
  return { landings, newCount, skippedCount };
}

// Parse command line arguments
const args = process.argv.slice(2);
const mode = args.includes('--force') ? 'force' : 'incremental';

console.log(`\n🚀 Running in ${mode.toUpperCase()} mode...\n`);

const { landings, newCount, skippedCount } = generateAllLandings(mode);

const outputPath = path.join(__dirname, '../src/app/landings/landings.json');
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(landings, null, 2), 'utf8');

console.log(`✅ Landing generation complete!`);
console.log(`📁 File saved: ${outputPath}`);
console.log(`\n📊 Statistics:`);
console.log(`  ✨ New pages generated: ${newCount}`);
console.log(`  ⏭️  Existing pages skipped: ${skippedCount}`);
console.log(`  📄 Total pages: ${Object.keys(landings).length}`);

// Show samples of new pages
if (newCount > 0) {
  console.log('\n🆕 Sample new pages:');
  const newPages = Object.keys(landings).slice(-Math.min(10, newCount));
  newPages.forEach(slug => {
    console.log(`  - /landings/${slug}`);
  });
}

console.log('\n💡 Usage:');
console.log('  npm run generate-landings          (incremental - skip existing)');
console.log('  npm run generate-landings --force  (regenerate all)');

console.log('\n📈 Next steps:');
console.log('  1. Review the generated content');
console.log('  2. Generate sitemap.xml');
console.log('  3. Submit to Google Search Console');
console.log('  4. Monitor indexing progress');