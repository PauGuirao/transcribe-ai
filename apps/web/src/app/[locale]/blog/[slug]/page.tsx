import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import BlogPostClient from "./blog-post-client";
import { getBlogPostBySlug, getAllBlogSlugsWithLanguage } from "@/lib/mdx";
import {
  JsonLd,
  generateArticleSchema,
  generateBreadcrumbSchema,
} from "@/components/seo/JsonLd";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.transcriu.com";

interface BlogPostPageProps {
  params: Promise<{
    slug: string;
    locale: string;
  }>;
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const post = getBlogPostBySlug(slug);

  // Treat /<other-locale>/blog/<post-in-different-language> as not-found so
  // search engines don't index duplicated content across locales.
  if (!post || post.language !== locale) {
    return {
      title: "Article no trobat",
      description: "L'article que cerques no existeix.",
    };
  }

  const postUrl = `${BASE_URL}/${post.language}/blog/${post.slug}`;
  return {
    title: `${post.title} | Blog Transcriu`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      url: postUrl,
      publishedTime: post.createdAt,
      modifiedTime: post.updatedAt,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
    // Blog posts exist in a single language only — canonical points to that
    // language's URL and we do not advertise non-existent translations.
    alternates: {
      canonical: postUrl,
      languages: {
        [post.language]: postUrl,
        "x-default": postUrl,
      },
    },
  };
}

// Only pre-render (locale, slug) combinations where the post is actually
// authored in that locale; all other combinations 404.
export async function generateStaticParams() {
  return getAllBlogSlugsWithLanguage().map(({ slug, language }) => ({
    slug,
    locale: language,
  }));
}

export const dynamicParams = false;

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug, locale } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post || post.language !== locale) {
    notFound();
  }

  // Convert MDX post to the format expected by BlogPostClient
  const blogPost = {
    id: post.slug,
    title: post.title,
    content: post.content,
    excerpt: post.excerpt,
    author: post.author,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    published: post.published,
    tags: post.tags,
    slug: post.slug,
  };

  const postUrl = `${BASE_URL}/${locale}/blog/${post.slug}`;
  const articleSchema = generateArticleSchema({
    headline: post.title,
    description: post.excerpt,
    url: postUrl,
    datePublished: post.createdAt,
    dateModified: post.updatedAt,
    authorName: post.author,
    publisherName: "Transcriu",
    publisherLogo: `${BASE_URL}/logo.png`,
    inLanguage:
      locale === "ca" ? "ca-ES" : locale === "en" ? "en-US" : "es-ES",
    keywords: post.tags,
  });

  const breadcrumbSchema = generateBreadcrumbSchema({
    items: [
      {
        name: locale === "ca" ? "Inici" : locale === "en" ? "Home" : "Inicio",
        url: `${BASE_URL}/${locale}`,
      },
      { name: "Blog", url: `${BASE_URL}/${locale}/blog` },
      { name: post.title, url: postUrl },
    ],
  });

  return (
    <>
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema} />
      <Suspense fallback={<div>Carregant...</div>}>
        <BlogPostClient post={blogPost} />
      </Suspense>
    </>
  );
}