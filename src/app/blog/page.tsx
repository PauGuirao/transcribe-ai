import { Suspense } from "react";
import BlogClient from "./blog-client";
import { getAllBlogPosts, type BlogPostMetadata } from "../../lib/mdx";

export const metadata = {
  title: "Blog",
  description: "Gestiona i publica articles del blog",
};

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

export default function BlogPage() {
  // Fetch MDX data on the server side
  const mdxPosts = getAllBlogPosts();
  
  // Convert MDX posts to BlogPost format
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