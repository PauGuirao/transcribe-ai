import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import BlogPostClient from "./blog-post-client";
import { getBlogPostBySlug, getAllBlogSlugs } from "../../../lib/mdx";

interface BlogPostPageProps {
  params: {
    slug: string;
  };
}

// Get blog post by slug from MDX files
async function getBlogPost(slug: string) {
  return getBlogPostBySlug(slug);
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const post = await getBlogPost(params.slug);
  
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

  return (
    <Suspense fallback={<div>Carregant...</div>}>
      <BlogPostClient post={blogPost} />
    </Suspense>
  );
}