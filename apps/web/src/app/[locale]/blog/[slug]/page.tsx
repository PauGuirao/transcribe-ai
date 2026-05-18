import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import BlogPostClient from "./blog-post-client";
import { getBlogPostBySlug, getAllBlogSlugs } from "@/lib/mdx";
import {
  JsonLd,
  generateArticleSchema,
  generateBreadcrumbSchema,
} from "@/components/seo/JsonLd";
import { generatePageHreflang } from "@/components/seo/HreflangTags";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.transcriu.com";

interface BlogPostPageProps {
  params: {
    slug: string;
    locale: string;
  };
}

// Get blog post by slug from MDX files
async function getBlogPost(slug: string) {
  return getBlogPostBySlug(slug);
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const post = await getBlogPost(params.slug);
  const locale = params.locale || "ca";

  if (!post) {
    return {
      title: "Article no trobat",
      description: "L'article que cerques no existeix.",
    };
  }

  return {
    title: `${post.title} | Blog Transcriu`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      url: `${BASE_URL}/${locale}/blog/${post.slug}`,
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
    alternates: generatePageHreflang({
      currentLocale: locale,
      path: `/blog/${post.slug}`,
    }),
  };
}

export async function generateStaticParams() {
  const slugs = getAllBlogSlugs();
  return slugs.map((slug) => ({
    slug: slug,
  }));
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const post = await getBlogPost(params.slug);
  const locale = params.locale || "ca";

  if (!post) {
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