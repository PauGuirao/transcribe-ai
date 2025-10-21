import { NextResponse } from 'next/server';
import landingsData from '../logopedia/landings.json';
import { getAllBlogSlugs } from '../../lib/mdx';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://transcriu.com';
  
  // Static pages
  const staticPages = [
    '',
    '/dashboard',
    '/transcribe',
    '/pricing',
    '/help',
    '/privacy',
    '/terms',
    '/tutorials',
    '/profiles',
    '/settings',
    '/team',
    '/annotate',
    '/library',
    '/blog'
  ];

  // Get all landing page slugs and blog slugs
  const landingSlugs = Object.keys(landingsData);
  const blogSlugs = getAllBlogSlugs();

  // Generate sitemap XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages.map(page => `  <url>
    <loc>${baseUrl}${page}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>${page === '' ? 'weekly' : page === '/blog' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${page === '' ? '1.0' : page === '/blog' ? '0.8' : '0.8'}</priority>
  </url>`).join('\n')}
${landingSlugs.map(slug => `  <url>
    <loc>${baseUrl}/logopedia/${slug}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>`).join('\n')}
${blogSlugs.map(slug => `  <url>
    <loc>${baseUrl}/blog/${slug}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n')}
</urlset>`;

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400', // Cache for 24 hours
    },
  });
}