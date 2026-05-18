import fs from 'fs';
import path from 'path';

import { getAllLandingParams } from '../src/lib/seo';
// Import the blog metadata function (slug + language per post).
import { getAllBlogSlugsWithLanguage } from '../src/lib/mdx';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.transcriu.com';
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const LOCALES = ['ca', 'es', 'en'];

// Ensure public directory exists
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

/**
 * Generate XML sitemap content
 */
function generateSitemapXML(urls: Array<{ loc: string; lastmod?: string; changefreq?: string; priority?: string }>): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod || new Date().toISOString()}</lastmod>
    <changefreq>${url.changefreq || 'monthly'}</changefreq>
    <priority>${url.priority || '0.8'}</priority>
  </url>`).join('\n')}
</urlset>`;
}

/**
 * Generate sitemap index XML
 */
function generateSitemapIndex(sitemaps: Array<{ loc: string; lastmod?: string }>): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map(sitemap => `  <sitemap>
    <loc>${sitemap.loc}</loc>
    <lastmod>${sitemap.lastmod || new Date().toISOString()}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>`;
}

/**
 * Generate main sitemap with static pages for all locales
 */
function generateMainSitemap(): void {
  // Public marketing pages (indexed)
  const publicPages = [
    { path: '', priority: '1.0', changefreq: 'weekly' },
    { path: '/pricing', priority: '0.8', changefreq: 'monthly' },
    { path: '/privacy', priority: '0.5', changefreq: 'yearly' },
    { path: '/terms', priority: '0.5', changefreq: 'yearly' },
    { path: '/tutorials', priority: '0.8', changefreq: 'weekly' },
    { path: '/blog', priority: '0.8', changefreq: 'weekly' },
    { path: '/features', priority: '0.9', changefreq: 'weekly' },
    { path: '/help', priority: '0.7', changefreq: 'monthly' },
  ];

  // Generate URLs for all locales
  const urls: Array<{ loc: string; lastmod: string; changefreq: string; priority: string }> = [];

  for (const locale of LOCALES) {
    for (const page of publicPages) {
      urls.push({
        loc: `${BASE_URL}/${locale}${page.path}`,
        lastmod: new Date().toISOString(),
        changefreq: page.changefreq,
        priority: page.priority,
      });
    }
  }

  const xml = generateSitemapXML(urls);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap-main.xml'), xml);
  console.log(`✅ Generated sitemap-main.xml with ${urls.length} URLs (${LOCALES.length} locales)`);
}

/**
 * Generate logopedia sitemap. Uses getAllLandingParams which already filters
 * each (slug, locale) pair through shouldGenerateForLocale, so we only emit
 * URLs that correspond to actually-rendered pages.
 */
function generateLogopediaSitemap(): void {
  const params = getAllLandingParams();

  const urls = params.map(({ slug, locale }) => ({
    loc: `${BASE_URL}/${locale}/logopedia/${slug}`,
    lastmod: new Date().toISOString(),
    changefreq: 'monthly',
    priority: '0.9',
  }));

  const xml = generateSitemapXML(urls);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap-logopedia.xml'), xml);
  console.log(`✅ Generated sitemap-logopedia.xml with ${urls.length} URLs (locale-filtered)`);
}

/**
 * Generate blog sitemap. Each post is listed only under its own language —
 * cross-locale URLs (e.g. /en/blog/<catalan-slug>) are intentionally excluded
 * to avoid duplicate-content signals.
 */
function generateBlogSitemap(): void {
  try {
    const posts = getAllBlogSlugsWithLanguage();

    const urls: Array<{ loc: string; lastmod: string; changefreq: string; priority: string }> = [];

    for (const { slug, language } of posts) {
      urls.push({
        loc: `${BASE_URL}/${language}/blog/${slug}`,
        lastmod: new Date().toISOString(),
        changefreq: 'weekly',
        priority: '0.8',
      });
    }

    const xml = generateSitemapXML(urls);
    fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap-blog.xml'), xml);
    console.log(`✅ Generated sitemap-blog.xml with ${urls.length} URLs (${posts.length} posts, language-filtered)`);
  } catch (error) {
    console.warn('⚠️  Could not generate blog sitemap:', error);
    // Create empty blog sitemap if no blogs exist
    const xml = generateSitemapXML([]);
    fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap-blog.xml'), xml);
    console.log('✅ Generated empty sitemap-blog.xml');
  }
}

/**
 * Generate sitemap index
 */
function generateIndex(): void {
  const sitemaps = [
    { loc: `${BASE_URL}/sitemap-main.xml` },
    { loc: `${BASE_URL}/sitemap-logopedia.xml` },
    { loc: `${BASE_URL}/sitemap-blog.xml` },
  ];

  const xml = generateSitemapIndex(sitemaps);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap-index.xml'), xml);
  
  // Also create sitemap.xml as an alias to sitemap-index.xml for backwards compatibility
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), xml);
  
  console.log(`✅ Generated sitemap-index.xml and sitemap.xml`);
}

/**
 * Main execution
 */
function main(): void {
  console.log('🚀 Generating static sitemaps...\n');
  
  const startTime = Date.now();
  
  generateMainSitemap();
  generateLogopediaSitemap();
  generateBlogSitemap();
  generateIndex();
  
  const duration = Date.now() - startTime;
  console.log(`\n✨ All sitemaps generated successfully in ${duration}ms`);
  
  // Calculate total size
  const files = ['sitemap-main.xml', 'sitemap-logopedia.xml', 'sitemap-blog.xml', 'sitemap-index.xml'];
  let totalSize = 0;
  
  files.forEach(file => {
    const filePath = path.join(PUBLIC_DIR, file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
      console.log(`   ${file}: ${(stats.size / 1024).toFixed(2)} KB`);
    }
  });
  
  console.log(`\n📊 Total size: ${(totalSize / 1024).toFixed(2)} KB`);
}

// Run the script
main();
