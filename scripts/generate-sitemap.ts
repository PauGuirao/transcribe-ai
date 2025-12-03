import fs from 'fs';
import path from 'path';
import landingsData from '../src/app/[locale]/logopedia/landings.json';

// Import the blog slugs function
import { getAllBlogSlugs } from '../src/lib/mdx';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.transcriu.com';
const PUBLIC_DIR = path.join(process.cwd(), 'public');

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
 * Generate main sitemap with static pages
 */
function generateMainSitemap(): void {
  const staticPages = [
    { path: '', priority: '1.0', changefreq: 'weekly' },
    { path: '/dashboard', priority: '0.8', changefreq: 'monthly' },
    { path: '/transcribe', priority: '0.9', changefreq: 'weekly' },
    { path: '/pricing', priority: '0.8', changefreq: 'monthly' },
    { path: '/help', priority: '0.7', changefreq: 'monthly' },
    { path: '/privacy', priority: '0.5', changefreq: 'yearly' },
    { path: '/terms', priority: '0.5', changefreq: 'yearly' },
    { path: '/tutorials', priority: '0.8', changefreq: 'weekly' },
    { path: '/profiles', priority: '0.7', changefreq: 'monthly' },
    { path: '/settings', priority: '0.6', changefreq: 'monthly' },
    { path: '/team', priority: '0.6', changefreq: 'monthly' },
    { path: '/annotate', priority: '0.7', changefreq: 'monthly' },
    { path: '/library', priority: '0.7', changefreq: 'monthly' },
    { path: '/blog', priority: '0.8', changefreq: 'weekly' },
  ];

  const urls = staticPages.map(page => ({
    loc: `${BASE_URL}${page.path}`,
    lastmod: new Date().toISOString(),
    changefreq: page.changefreq,
    priority: page.priority,
  }));

  const xml = generateSitemapXML(urls);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap-main.xml'), xml);
  console.log(`✅ Generated sitemap-main.xml with ${urls.length} URLs`);
}

/**
 * Generate logopedia sitemap with all landing pages
 */
function generateLogopediaSitemap(): void {
  const landingSlugs = Object.keys(landingsData);
  
  const urls = landingSlugs.map(slug => ({
    loc: `${BASE_URL}/logopedia/${slug}`,
    lastmod: new Date().toISOString(),
    changefreq: 'monthly',
    priority: '0.9',
  }));

  const xml = generateSitemapXML(urls);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap-logopedia.xml'), xml);
  console.log(`✅ Generated sitemap-logopedia.xml with ${urls.length} URLs`);
}

/**
 * Generate blog sitemap
 */
function generateBlogSitemap(): void {
  try {
    const blogSlugs = getAllBlogSlugs();
    
    const urls = blogSlugs.map(slug => ({
      loc: `${BASE_URL}/blog/${slug}`,
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: '0.8',
    }));

    const xml = generateSitemapXML(urls);
    fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap-blog.xml'), xml);
    console.log(`✅ Generated sitemap-blog.xml with ${urls.length} URLs`);
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
