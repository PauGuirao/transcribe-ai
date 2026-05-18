import type { Metadata } from "next";
import { Suspense } from "react";
import BlogClient from "./blog-client";
import {
  getBlogPostsForLocale,
  type BlogPostMetadata,
  type BlogLanguage,
} from "../../../lib/mdx";
import { generatePageHreflang, localeMapping } from "@/components/seo/HreflangTags";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.transcriu.com";

type LocaleCode = "ca" | "es" | "en";

const blogSeo: Record<LocaleCode, { title: string; description: string }> = {
  ca: {
    title: "Blog | Transcriu",
    description:
      "Articles sobre logopèdia, transcripció amb IA i pràctica clínica. Guies pràctiques per a logopedes i famílies escrites per professionals.",
  },
  es: {
    title: "Blog | Transcriu",
    description:
      "Artículos sobre logopedia, transcripción con IA y práctica clínica. Guías prácticas para logopedas y familias escritas por profesionales.",
  },
  en: {
    title: "Blog | Transcriu",
    description:
      "Articles on speech therapy, AI transcription and clinical practice. Practical guides for SLPs and families written by professionals.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const lc: LocaleCode =
    locale === "ca" || locale === "en" ? locale : "es";
  const seo = blogSeo[lc];

  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: `${BASE_URL}/${lc}/blog`,
      siteName: "Transcriu",
      locale: localeMapping[lc],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
    alternates: generatePageHreflang({ currentLocale: lc, path: "/blog" }),
  };
}

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  published: boolean;
  tags: string[];
  slug?: string;
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lc: BlogLanguage =
    locale === "ca" || locale === "es" || locale === "en"
      ? (locale as BlogLanguage)
      : "ca";

  // Only show posts authored in the visitor's locale — avoids serving
  // Catalan content from /es/blog and vice-versa.
  const mdxPosts = getBlogPostsForLocale(lc);

  const blogPosts: BlogPost[] = mdxPosts.map((post: BlogPostMetadata, index: number) => ({
    id: (index + 1).toString(),
    title: post.title,
    content: post.excerpt, // Use excerpt as content for list view
    excerpt: post.excerpt,
    author: post.author,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    published: post.published,
    tags: post.tags,
    slug: post.slug,
  }));

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BlogClient blogPosts={blogPosts} />
    </Suspense>
  );
}