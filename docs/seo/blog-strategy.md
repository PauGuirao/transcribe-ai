# Blog SEO Strategy — Transcriu

Generated 2026-05-19. DataForSEO mining run via outrank-api credentials.
Total API spend: ~$0.30. Raw data in this directory:

- `spanish-keyword-opportunities.json` — 904 unique kws from 12 Spanish seeds via `keyword_suggestions` (Spain, lang `es`)
- `catalan-keyword-opportunities.json` — 70 hand-crafted Catalan kws checked via `bulk_search_volume` (Spain, lang `ca` + `es` fallback)
- `blog-opportunities-filtered.json` — filtered/bucketed by topic and KD

## Method

- Location: Spain (2724).
- Spanish: `/v3/dataforseo_labs/google/keyword_suggestions/live` — 12 seeds, ~100 suggestions each.
- Catalan: that endpoint returns nothing for `lang=ca`. Fell back to `/v3/keywords_data/google_ads/search_volume/live` with a hand-crafted list of 70 Catalan terms across the niche. Most Catalan volumes are suppressed by Google Ads (< 10/mo threshold), so only 8 came back with measurable data — but they're all KD 0.

## Top Spanish opportunities

### Speech-therapy queries (very low KD)

| Keyword | Volume | KD | Notes |
|---|---|---|---|
| logopeda qué es / qué es un logopeda | 1,900 + 590 | 5 / 4 | Pillar "what is" page |
| tartamudez | 1,600 | 4 | Comprehensive guide |
| qué es logopedia | 880 | 4 | Sister to "qué es un logopeda" |
| tipos de afasia | 880 | 1 | List-style article |
| afasia significado / afasia qué significa | 480 | 0 | Definition page |
| logopedia en inglés | 390 | 0 | Quick translation post |

### Transcription queries (product-tied)

| Keyword | Volume | KD | Notes |
|---|---|---|---|
| transcribir audio whatsapp | **4,400** | 19 | Top product play |
| como transcribir un audio de whatsapp | 2,900 | 26 | Step-by-step tutorial |
| texto a audio | 1,300 | 18 | Reverse-direction page |
| transcribir audio a texto whatsapp | 720 | 11 | Same intent, lower KD |
| whatsapp transcribir audio | 390 | 3 | Quick win |

### Mid-KD but still winnable

- `logopedia cerca de mi` — 2,900/mo, KD 17
- `convertir texto a audio` — 1,300/mo, KD 30

## Top Catalan opportunities

| Keyword | Volume | KD |
|---|---|---|
| **disfèmia** | **4,400** | 0 |
| dislèxia | 170 | 0 |
| disfàgia | 140 | 0 |
| trastorn del llenguatge | 140 | 0 |
| afàsia | 90 | 0 |
| disàrtria | 70 | 0 |
| dislàlia | 50 | 0 |

Note: `disfèmia` at 4.4k/mo deserves a verification check in Search Console — could be inflated by autocomplete or medical-research traffic.

## Recommended blog roadmap

10 posts — 5 topics × {es, ca}:

1. **Cómo transcribir audios de WhatsApp** / **Com transcriure àudios de WhatsApp** — captures the WhatsApp-transcription cluster (largest commercial intent in es; modest in ca but topical).
2. **Qué es la logopedia y qué hace un logopeda** / **Què és la logopèdia i què fa un logopeda** — pillar SEO page for the profession.
3. **Tipos de afasia: guía completa** / **Tipus d'afàsia: guia completa** — list articles rank fast; combines `tipos de afasia` (880) + `afasia significado` (480) + Catalan `afàsia` (90).
4. **Tartamudez: causas, tipos y ejercicios** / **Disfèmia: què és, causes i exercicis** — Spanish `tartamudez` 1,600/mo, Catalan `disfèmia` **4,400/mo KD 0** — biggest combined opportunity.
5. **Pasar texto a audio: las mejores herramientas en español** / **Passar text a àudio: les millors eines en català** — comparison content captures both informational + commercial intent.

## Bright-shot blog structural reference

The user pointed to https://bright-shot.com/blog/how-to-take-360-photos-on-iphone/ and https://bright-shot.com/blog/automate-real-estate-social-media/ as the desired quality bar. Key structural elements:

- **Length**: 4,000-5,000 words per post.
- **Hook**: problem-solution intro, concrete time/cost anchor in first paragraph.
- **TL;DR / summary** near the top for skimmers.
- **7-10 H2 sections** with 10-15 H3 subsections.
- **At least one comparison table** (use the `| col | col |` markdown table syntax — supported by our renderer).
- **Numbered step-by-step lists** for any "how-to" workflow.
- **2 YouTube embeds** — our MDX renderer supports `@youtube[VIDEO_ID]:caption`.
- **At least one product CTA box** mid-article — our MDX renderer supports `@cta[Button label→/url]:Headline || Description`.
- **8-12 Q&A FAQ** section near the bottom.
- **Conclusion** that restates the problem, summarizes the solution, ends on a product CTA.
- **Tone**: authoritative-casual hybrid, specific metrics over vague claims, soft product integration ("we use" voice, not "buy now").
- **Internal links** to /features pages and other blog posts.
