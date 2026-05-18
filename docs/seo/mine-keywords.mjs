#!/usr/bin/env node
import fs from 'node:fs';

// Load creds from outrank-api .dev.vars
const vars = fs.readFileSync('/Users/paugc/personal/outrank-api/apps/api/.dev.vars', 'utf8');
const env = Object.fromEntries(
  vars
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    })
);
const LOGIN = env.DATAFORSEO_LOGIN;
const PASSWORD = env.DATAFORSEO_PASSWORD;
if (!LOGIN || !PASSWORD) {
  console.error('Missing DATAFORSEO creds');
  process.exit(1);
}

const BASE_URL = 'https://api.dataforseo.com';
const auth = 'Basic ' + Buffer.from(`${LOGIN}:${PASSWORD}`).toString('base64');

async function postJson(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`HTTP ${res.status}: ${t.slice(0, 300)}`);
  }
  return res.json();
}

// Seed keywords for the speech therapy / transcription / audio-to-text space.
const SPANISH_SEEDS = [
  'logopedia',
  'logopeda',
  'ejercicios logopedia',
  'terapia del habla',
  'transcribir audio',
  'audio a texto',
  'transcripción automática',
  'pasar audio a texto',
  'dislalia',
  'tartamudez',
  'afasia',
  'retraso del lenguaje',
];

const CATALAN_SEEDS = [
  'logopèdia',
  'logopeda',
  'exercicis logopèdia',
  'teràpia del llenguatge',
  'transcriure àudio',
  'àudio a text',
  'transcripció automàtica',
  'passar àudio a text',
  'dislàlia',
  'tartamudesa',
  'afàsia',
  'retard del llenguatge',
];

// Spain location_code = 2724
const LOC_SPAIN = 2724;

async function fetchSuggestions(seed, languageCode) {
  const body = [
    {
      keyword: seed,
      location_code: LOC_SPAIN,
      language_code: languageCode,
      limit: 100,
      include_seed_keyword: true,
      order_by: ['keyword_info.search_volume,desc'],
    },
  ];
  const json = await postJson('/v3/dataforseo_labs/google/keyword_suggestions/live', body);
  const cost = typeof json.cost === 'number' ? json.cost : 0;
  const tasks = Array.isArray(json.tasks) ? json.tasks : [];
  const result = tasks[0]?.result?.[0]?.items ?? tasks[0]?.result ?? [];
  const items = Array.isArray(result) ? result : [];
  const out = [];
  for (const it of items) {
    const kw = it?.keyword;
    const info = it?.keyword_info ?? {};
    if (!kw) continue;
    out.push({
      keyword: kw,
      searchVolume: typeof info.search_volume === 'number' ? info.search_volume : 0,
      competition: typeof info.competition === 'number' ? info.competition : 0,
      kd: Math.round((info.competition ?? 0) * 100),
      cpc: typeof info.cpc === 'number' ? info.cpc : 0,
    });
  }
  return { items: out, cost };
}

(async () => {
  const langs = [
    { code: 'es', name: 'SPANISH', seeds: SPANISH_SEEDS },
    { code: 'ca', name: 'CATALAN', seeds: CATALAN_SEEDS },
  ];

  let totalCost = 0;
  const allByLang = {};

  for (const lang of langs) {
    const dedup = new Map();
    process.stderr.write(`\n=== Mining ${lang.name} (${lang.code}) ===\n`);
    for (const seed of lang.seeds) {
      try {
        const { items, cost } = await fetchSuggestions(seed, lang.code);
        totalCost += cost;
        process.stderr.write(`  seed="${seed}" → ${items.length} items ($${cost.toFixed(4)})\n`);
        for (const it of items) {
          const key = it.keyword.toLowerCase().trim();
          const existing = dedup.get(key);
          if (!existing || it.searchVolume > existing.searchVolume) dedup.set(key, it);
        }
      } catch (e) {
        process.stderr.write(`  seed="${seed}" ERROR: ${e.message}\n`);
      }
    }
    allByLang[lang.code] = [...dedup.values()];
  }

  process.stderr.write(`\nTotal cost: $${totalCost.toFixed(4)}\n`);

  // Filter and rank
  function rank(items) {
    return items
      .filter((x) => x.searchVolume >= 100)
      .map((x) => ({
        ...x,
        // Opportunity = volume / (KD+1). Bigger = better.
        opportunity: Math.round((x.searchVolume * 100) / (x.kd + 10)),
      }))
      .sort((a, b) => b.opportunity - a.opportunity);
  }

  const result = {
    cost_usd: Number(totalCost.toFixed(4)),
    spanish: {
      total_unique: allByLang.es.length,
      top_low_kd_high_volume: rank(allByLang.es).slice(0, 60),
    },
    catalan: {
      total_unique: allByLang.ca.length,
      top_low_kd_high_volume: rank(allByLang.ca).slice(0, 60),
    },
  };

  // Write JSON for downstream review
  fs.writeFileSync('/tmp/keyword-opportunities.json', JSON.stringify(result, null, 2));
  process.stderr.write(`\nWrote /tmp/keyword-opportunities.json\n`);

  // Print summary
  console.log(JSON.stringify(result, null, 2));
})();
