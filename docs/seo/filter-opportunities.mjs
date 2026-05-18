#!/usr/bin/env node
import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('/tmp/keyword-opportunities.json', 'utf8'));

// Remove keywords that are:
// - city-specific (logopeda barcelona, valencia, etc.)
// - branded (NeuronUP, isep, university names)
// - facultad/grado/universidad/colegio (academic-only, not blog-friendly)
// - too generic to win (single-word that just describes a service)
const CITY_RE = /\b(madrid|barcelona|valencia|sevilla|zaragoza|málaga|malaga|alicante|murcia|córdoba|cordoba|granada|getafe|hospitalet|fuengirola|alcorcón|alcorcon|leganés|leganes|móstoles|mostoles|santander|gijón|gijon|vitoria|bilbao|donostia|girona|tarragona|lleida|elche|cartagena|terrassa|sabadell|badalona|cornellà|cornella|sant cugat|mataró|mataro|reus|salamanca|albacete|oviedo|burgos|pamplona|jaén|jaen|huelva|cádiz|cadiz|almería|almeria|toledo)\b/i;
const EXCLUDE_RE = /\b(facultad|universidad|grado|colegio|nota de corte|colegio profesional|neuronup|isep|cefire|junta de andalucía|junta de andalucia)\b/i;
const TRANSCRIPTION_ADJACENT = /(transcrib|transcrip|audio.*texto|texto.*audio|voz.*texto|texto.*voz|dictar|reconocimiento de voz|nota de voz|whatsapp|grabar|grabación|grabaci|subtítul|subtitul|locut|podcast|reunion|reunión|entrevista)/i;
const SPEECH_THERAPY = /\b(logoped|logopèd|logopèdia|dislalia|dislalia|tartamud|afasia|afasia|disfemia|disartria|disartria|disfagia|disfàgia|retraso del lenguaje|trastorno del lenguaje|trastorno especifico|apraxia|rotacismo|dislexia|dislèxia|tdl|tel|tea|trastorno del habla|terapia del habla|terapia del lenguaje|frenillo|deglución atípica|deglucion atipica|praxias|praxia|estimulación del lenguaje|estimulacion del lenguaje|ejercicios.*pronunciar|pronunciar.*r|sonido.*r|cómo enseñar|como enseñar|que es.*log)/i;

function isCity(k) { return CITY_RE.test(k); }
function isExcluded(k) { return EXCLUDE_RE.test(k); }
function isSpeechTherapy(k) { return SPEECH_THERAPY.test(k); }
function isTranscriptionAdjacent(k) { return TRANSCRIPTION_ADJACENT.test(k); }

const all = data.spanish.top_low_kd_high_volume;

function score(items) {
  return items
    .filter((x) => x.searchVolume >= 200)
    .filter((x) => !isCity(x.keyword))
    .filter((x) => !isExcluded(x.keyword))
    .map((x) => ({
      keyword: x.keyword,
      vol: x.searchVolume,
      kd: x.kd,
      cpc: x.cpc,
      opp: x.opportunity,
    }))
    .sort((a, b) => b.opp - a.opp);
}

const therapy = score(all.filter((x) => isSpeechTherapy(x.keyword)));
const transcription = score(all.filter((x) => isTranscriptionAdjacent(x.keyword)));

// Buckets by KD
function bucket(items) {
  return {
    very_low_kd: items.filter((x) => x.kd <= 10).slice(0, 25),
    low_kd: items.filter((x) => x.kd > 10 && x.kd <= 25).slice(0, 25),
    medium_kd: items.filter((x) => x.kd > 25 && x.kd <= 40).slice(0, 25),
  };
}

const result = {
  speech_therapy_es: bucket(therapy),
  transcription_es: bucket(transcription),
};

fs.writeFileSync('/tmp/blog-opportunities.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
