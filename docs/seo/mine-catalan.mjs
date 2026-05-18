#!/usr/bin/env node
import fs from 'node:fs';

const vars = fs.readFileSync('/Users/paugc/personal/outrank-api/apps/api/.dev.vars', 'utf8');
const env = Object.fromEntries(
  vars.split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#')).map((l) => {
    const i = l.indexOf('=');
    return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
  })
);
const auth = 'Basic ' + Buffer.from(`${env.DATAFORSEO_LOGIN}:${env.DATAFORSEO_PASSWORD}`).toString('base64');

async function postJson(path, body) {
  const res = await fetch(`https://api.dataforseo.com${path}`, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

// Hand-crafted Catalan keywords across the speech-therapy / transcription / education niche.
// Mix of seed terms, long-tail informational queries, and question phrasings.
const CATALAN_KEYWORDS = [
  // Core profession
  'logopèdia', 'logopeda', 'logopeda barcelona', 'logopeda online', 'logopeda infantil',
  'què és la logopèdia', 'que fa un logopeda', 'estudiar logopèdia',
  'logopèdia preu', 'logopèdia seguretat social', 'logopèdia gratis',
  // Conditions
  'dislàlia', 'dislèxia', 'tartamudesa', 'afàsia', 'disfèmia', 'disfàgia',
  'retard del llenguatge', 'trastorn del llenguatge', 'trastorn específic del llenguatge',
  'apraxia de la parla', 'disàrtria', 'rotacisme',
  // Exercises and treatment
  'exercicis logopèdia', 'exercicis logopèdia nens', 'exercicis dislàlia',
  'exercicis tartamudesa', 'exercicis pronunciació r', 'exercicis respiració logopèdia',
  'exercicis llengua logopèdia', 'praxies bucofacials',
  // Letters/sounds
  'com pronunciar la r', "com ensenyar a pronunciar la r", 'so de la r',
  // Children
  'mon fill no parla', 'mon fill no pronuncia la r', 'desenvolupament del llenguatge',
  'desenvolupament llenguatge infantil', 'quan parla un nen',
  // Transcription
  'transcriure àudio', 'transcripció automàtica', 'transcripció àudio a text',
  'passar àudio a text', 'passar veu a text', 'convertir àudio a text',
  'transcripció online', 'transcriure entrevistes', 'transcriure reunions',
  'app per transcriure àudio', 'aplicació transcripció', 'transcriure veu en text',
  'transcripció gratis', 'transcripció en català', 'reconeixement de veu català',
  'dictat per veu', "passar nota de veu a text",
  // WhatsApp
  'transcriure àudio whatsapp', 'transcriure nota de veu whatsapp',
  // Tools comparison
  'millor app transcripció', 'app dictat veu', 'programa transcripció',
  // Professional
  'sessió logopèdia', 'informe logopèdia', 'avaluació logopèdica',
  'protocol logopèdia', 'eines logopeda',
  // Educational
  'aprendre català', 'reforç lectoescriptura', 'lectura comprensiva nens',
  'estimulació del llenguatge',
];

const LOC_SPAIN = 2724;

async function fetchBulkVolume(keywords, lang) {
  const out = new Map();
  for (let i = 0; i < keywords.length; i += 1000) {
    const batch = keywords.slice(i, i + 1000);
    const json = await postJson('/v3/keywords_data/google_ads/search_volume/live', [
      { keywords: batch, location_code: LOC_SPAIN, language_code: lang },
    ]);
    const result = json.tasks?.[0]?.result ?? [];
    for (const r of result) {
      out.set(String(r.keyword).toLowerCase(), {
        searchVolume: typeof r.search_volume === 'number' ? r.search_volume : 0,
        competition: typeof r.competition === 'number' ? r.competition : 0,
        cpc: typeof r.cpc === 'number' ? r.cpc : 0,
      });
    }
  }
  return { map: out };
}

(async () => {
  process.stderr.write(`Fetching volume for ${CATALAN_KEYWORDS.length} Catalan keywords (lang=ca, loc=Spain)...\n`);

  // Try Catalan language first
  const ca = await fetchBulkVolume(CATALAN_KEYWORDS, 'ca');
  process.stderr.write(`  ca: got ${ca.map.size} rows\n`);

  // Sometimes Catalan rows have null volume — also try es to see what slips through
  const es = await fetchBulkVolume(CATALAN_KEYWORDS, 'es');
  process.stderr.write(`  es: got ${es.map.size} rows\n`);

  const all = [];
  for (const kw of CATALAN_KEYWORDS) {
    const k = kw.toLowerCase();
    const a = ca.map.get(k);
    const b = es.map.get(k);
    const searchVolume = Math.max(a?.searchVolume ?? 0, b?.searchVolume ?? 0);
    const competition = Math.max(a?.competition ?? 0, b?.competition ?? 0);
    const cpc = Math.max(a?.cpc ?? 0, b?.cpc ?? 0);
    all.push({
      keyword: kw,
      searchVolume,
      kd: Math.round(competition * 100),
      cpc: Number(cpc.toFixed(2)),
      // Lang where the volume was found
      lang: (a?.searchVolume ?? 0) >= (b?.searchVolume ?? 0) ? 'ca' : 'es',
    });
  }

  const opportunities = all
    .filter((x) => x.searchVolume >= 50)
    .map((x) => ({
      ...x,
      opportunity: Math.round((x.searchVolume * 100) / (x.kd + 10)),
    }))
    .sort((a, b) => b.opportunity - a.opportunity);

  fs.writeFileSync('/tmp/catalan-keywords.json', JSON.stringify(opportunities, null, 2));
  console.log(JSON.stringify({ total: all.length, with_volume: opportunities.length, top: opportunities }, null, 2));
})();
