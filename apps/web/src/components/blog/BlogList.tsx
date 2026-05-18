"use client";

import React from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowUpRight,
  Calendar,
  Edit,
  FileText,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

interface BlogListProps {
  posts: BlogPost[];
  loading: boolean;
  onEdit?: (post: BlogPost) => void;
  onDelete?: (postId: string) => void;
  showActions?: boolean;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("ca-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function truncatePlainText(content: string, max = 140): string {
  const plain = content.replace(/<[^>]*>/g, "");
  return plain.length > max ? plain.slice(0, max).trimEnd() + "…" : plain;
}

function authorInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function BlogList({
  posts,
  loading,
  onEdit,
  onDelete,
  showActions = true,
}: BlogListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <article
            key={i}
            className="flex h-full flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white"
          >
            <div className="flex flex-1 flex-col gap-3 p-6">
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/5" />
              <div className="mt-auto flex items-center justify-between border-t border-neutral-100 pt-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-7 rounded-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </article>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-dashed border-neutral-200 bg-neutral-50/40 px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-neutral-200 bg-white">
          <FileText className="size-5 text-neutral-500" />
        </div>
        <h3 className="text-sm font-medium text-neutral-900">
          Cap article encara
        </h3>
        <p className="mt-1 text-xs text-neutral-500">
          Aviat publicarem el primer article.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <BlogCard
          key={post.id}
          post={post}
          onEdit={onEdit}
          onDelete={onDelete}
          showActions={showActions}
        />
      ))}
    </div>
  );
}

function BlogCard({
  post,
  onEdit,
  onDelete,
  showActions,
}: {
  post: BlogPost;
  onEdit?: (post: BlogPost) => void;
  onDelete?: (id: string) => void;
  showActions: boolean;
}) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-sm">
      {/* Admin actions — only render when explicitly enabled. */}
      {showActions && (onEdit || onDelete) && (
        <div
          className="absolute right-2 top-2 z-10 flex gap-1"
          onClick={(e) => e.preventDefault()}
        >
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onEdit(post);
              }}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 text-[11px] font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50"
              title="Editar"
            >
              <Edit className="size-3" />
              Editar
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onDelete(post.id);
              }}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 text-[11px] font-medium text-rose-600 shadow-sm transition-colors hover:border-rose-200 hover:bg-rose-50"
              title="Eliminar"
            >
              <Trash2 className="size-3" />
              Eliminar
            </button>
          )}
        </div>
      )}

      <Link
        href={`/blog/${post.slug || post.id}`}
        className="flex flex-1 flex-col"
      >
        <div className="flex flex-1 flex-col p-6">
          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {post.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-700"
                >
                  {tag}
                </span>
              ))}
              {post.tags.length > 3 && (
                <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500">
                  +{post.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Title */}
          <h3 className="text-lg font-medium leading-snug tracking-tight text-neutral-900 transition-colors group-hover:text-neutral-700">
            {post.title}
            {!post.published && (
              <span className="ml-2 inline-flex items-center rounded-full border border-neutral-200 px-1.5 py-0.5 align-middle text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                Esborrany
              </span>
            )}
          </h3>

          {/* Excerpt */}
          <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-neutral-600">
            {post.excerpt || truncatePlainText(post.content, 140)}
          </p>

          {/* Meta footer */}
          <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-4 text-xs text-neutral-500">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400 text-[10px] font-semibold text-white">
                {authorInitials(post.author) || "?"}
              </div>
              <span className="truncate font-medium text-neutral-700">
                {post.author}
              </span>
            </div>
            <time
              dateTime={post.createdAt}
              className="inline-flex items-center gap-1 tabular-nums"
            >
              <Calendar className="size-3" />
              {formatDate(post.createdAt)}
            </time>
          </div>
        </div>

        {/* Read-more affordance — subtle bar at the bottom, brightens on hover. */}
        <div
          className={cn(
            "flex items-center justify-between border-t border-neutral-100 px-6 py-3 text-sm font-medium text-neutral-700 transition-colors",
            "group-hover:bg-neutral-50 group-hover:text-neutral-900",
          )}
        >
          <span>Llegir article</span>
          <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </Link>
    </article>
  );
}
