import { NextResponse } from 'next/server';
import landingsData from '../logopedia/landings.json';

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
    '/library'
  ];

  // Get all landing page slugs
  const landingSlugs = Object.keys(landingsData);

  // Generate sitemap XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages.map(page => `  <url>
    <loc>${baseUrl}${page}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>${page === '' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${page === '' ? '1.0' : '0.8'}</priority>
  </url>`).join('\n')}
${landingSlugs.map(slug => `  <url>
    <loc>${baseUrl}/logopedia/${slug}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>`).join('\n')}
</urlset>`;

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400', // Cache for 24 hours
    },
  });
}