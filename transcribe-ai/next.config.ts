import type { NextConfig } from "next";
import createMDX from '@next/mdx';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  // Configure `pageExtensions` to include markdown and MDX files
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  // Optionally, add any other Next.js config below
};

const withMDX = createMDX({
  // Add markdown plugins here, as desired
});

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Merge MDX config with Next.js config and wrap with next-intl
export default withNextIntl(withMDX(nextConfig));
