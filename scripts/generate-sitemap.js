#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load landings data
const landingsPath = path.join(__dirname, '../src/app/logopedia/landings.json');
const landingsData = JSON.parse(fs.readFileSync(landingsPath, 'utf8'));

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://transcriu.com';

// Static pages
const staticPages = [
  { url: '', priority: '1.0', changefreq: 'weekly' },
  { url: '/dashboard', priority: '0.8', changefreq: 'monthly' },
  { url: '/transcribe', priority: '0.9', changefreq: 'weekly' },
  { url: '/pricing', priority: '0.8', changefreq: 'monthly' },
  { url: '/help', priority: '0.7', changefreq: 'monthly' },
  { url: '/privacy', priority: '0.5', changefreq: 'yearly' },
  { url: '/terms', priority: '0.5', changefreq: 'yearly' },
  { url: '/tutorials', priority: '0.8', changefreq: 'weekly' },
  { url: '/profiles', priority: '0.7', changefreq: 'monthly' },
  { url: '/settings', priority: '0.6', changefreq: 'monthly' },
  { url: '/team', priority: '0.6', changefreq: 'monthly' },
  { url: '/annotate', priority: '0.7', changefreq: 'monthly' },
  { url: '/library', priority: '0.7', changefreq: 'monthly' }
];

// Get all landing page slugs
const landingSlugs = Object.keys(landingsData);

// Generate sitemap XML
const currentDate = new Date().toISOString();

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
${landingSlugs.map(slug => `  <url>
    <loc>${baseUrl}/logopedia/${slug}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>`).join('\n')}
</urlset>`;

// Write sitemap to public directory
const outputPath = path.join(__dirname, '../public/sitemap.xml');
fs.writeFileSync(outputPath, sitemap, 'utf8');

console.log(`✅ Sitemap generated successfully!`);
console.log(`📁 File: ${outputPath}`);
console.log(`📊 Total URLs: ${staticPages.length + landingSlugs.length}`);
console.log(`   - Static pages: ${staticPages.length}`);
console.log(`   - Landing pages: ${landingSlugs.length}`);

// Generate robots.txt as well
const robotsTxt = `User-agent: *
Allow: /

# Disallow admin and API routes
Disallow: /api/
Disallow: /dashboard/
Disallow: /settings/
Disallow: /team/
Disallow: /organization/
Disallow: /auth/
Disallow: /invite/
Disallow: /group-invite/

# Allow logopedia landing pages for SEO
Allow: /logopedia/

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Crawl-delay for respectful crawling
Crawl-delay: 1`;

const robotsPath = path.join(__dirname, '../public/robots.txt');
fs.writeFileSync(robotsPath, robotsTxt, 'utf8');

console.log(`✅ Robots.txt generated successfully!`);
console.log(`📁 File: ${robotsPath}`);

console.log('\n🔍 Next steps:');
console.log('1. Submit sitemap to Google Search Console: https://search.google.com/search-console');
console.log('2. Submit sitemap to Bing Webmaster Tools: https://www.bing.com/webmasters');
console.log(`3. Test sitemap: ${baseUrl}/sitemap.xml`);
console.log(`4. Test robots.txt: ${baseUrl}/robots.txt`);