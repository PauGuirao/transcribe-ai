import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const contentDirectory = path.join(process.cwd(), 'content/blog');

export type BlogLanguage = 'ca' | 'es' | 'en';

const VALID_LANGUAGES: readonly BlogLanguage[] = ['ca', 'es', 'en'];

function normaliseLanguage(value: unknown): BlogLanguage {
  // Defaults to 'ca' so posts without a `language:` field keep their historical
  // routing behaviour. Always set the field explicitly when authoring.
  return typeof value === 'string' && (VALID_LANGUAGES as readonly string[]).includes(value)
    ? (value as BlogLanguage)
    : 'ca';
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  published: boolean;
  tags: string[];
  language: BlogLanguage;
  content: string;
}

export interface BlogPostMetadata {
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  published: boolean;
  tags: string[];
  language: BlogLanguage;
}

export function getAllBlogPosts(): BlogPostMetadata[] {
  try {
    const fileNames = fs.readdirSync(contentDirectory);
    const allPostsData = fileNames
      .filter((fileName) => fileName.endsWith('.mdx'))
      .map((fileName) => {
        const slug = fileName.replace(/\.mdx$/, '');
        const fullPath = path.join(contentDirectory, fileName);
        const fileContents = fs.readFileSync(fullPath, 'utf8');
        const { data } = matter(fileContents);

        return {
          slug,
          title: data.title || '',
          excerpt: data.excerpt || '',
          author: data.author || '',
          createdAt: data.createdAt || '',
          updatedAt: data.updatedAt || '',
          published: data.published ?? true,
          tags: data.tags || [],
          language: normaliseLanguage(data.language),
        } as BlogPostMetadata;
      })
      .filter((post) => post.published)
      .sort((a, b) => {
        // Sort by creation date, newest first
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    return allPostsData;
  } catch (error) {
    console.error('Error reading blog posts:', error);
    return [];
  }
}

export function getBlogPostBySlug(slug: string): BlogPost | null {
  try {
    const fullPath = path.join(contentDirectory, `${slug}.mdx`);
    
    if (!fs.existsSync(fullPath)) {
      return null;
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    return {
      slug,
      title: data.title || '',
      excerpt: data.excerpt || '',
      author: data.author || '',
      createdAt: data.createdAt || '',
      updatedAt: data.updatedAt || '',
      published: data.published ?? true,
      tags: data.tags || [],
      language: normaliseLanguage(data.language),
      content,
    } as BlogPost;
  } catch (error) {
    console.error(`Error reading blog post ${slug}:`, error);
    return null;
  }
}

export function getAllBlogSlugs(): string[] {
  try {
    const fileNames = fs.readdirSync(contentDirectory);
    return fileNames
      .filter((fileName) => fileName.endsWith('.mdx'))
      .map((fileName) => fileName.replace(/\.mdx$/, ''));
  } catch (error) {
    console.error('Error reading blog slugs:', error);
    return [];
  }
}

/** Returns published posts whose `language:` frontmatter matches the locale. */
export function getBlogPostsForLocale(locale: BlogLanguage): BlogPostMetadata[] {
  return getAllBlogPosts().filter((post) => post.language === locale);
}

/** Returns the slug+language pairs needed to generate per-locale routes. */
export function getAllBlogSlugsWithLanguage(): Array<{ slug: string; language: BlogLanguage }> {
  return getAllBlogPosts().map((post) => ({ slug: post.slug, language: post.language }));
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ca-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    return dateString;
  }
}