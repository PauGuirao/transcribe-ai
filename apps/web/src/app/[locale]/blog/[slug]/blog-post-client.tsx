"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Link2,
  User,
} from "lucide-react";
import Link from "next/link";
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
  slug: string;
}

interface BlogPostClientProps {
  post: BlogPost;
}

/* ------------------------- Utilities ------------------------------ */

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("ca-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function authorInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Rough word count → minutes at 200 wpm. Min 1 min. */
function readingMinutes(content: string): number {
  const words = content
    .replace(/<[^>]*>/g, "")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** URL-safe slug from a heading; strips accents + non-alphanumerics. */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

/** Extract h2 / h3 headings from the raw markdown content. */
function extractToc(content: string): TocItem[] {
  const out: TocItem[] = [];
  const seen = new Set<string>();
  for (const line of content.split("\n")) {
    let m = /^##\s+(.+?)\s*$/.exec(line);
    if (m) {
      const text = m[1];
      let id = slugify(text);
      // De-dup ids if two headings share a slug.
      let i = 2;
      while (seen.has(id)) id = `${slugify(text)}-${i++}`;
      seen.add(id);
      out.push({ id, text, level: 2 });
      continue;
    }
    m = /^###\s+(.+?)\s*$/.exec(line);
    if (m) {
      const text = m[1];
      let id = slugify(text);
      let i = 2;
      while (seen.has(id)) id = `${slugify(text)}-${i++}`;
      seen.add(id);
      out.push({ id, text, level: 3 });
    }
  }
  return out;
}

/* ------------------------- Component ------------------------------ */

export default function BlogPostClient({ post }: BlogPostClientProps) {
  const toc = useMemo(() => extractToc(post.content), [post.content]);
  const minutes = useMemo(() => readingMinutes(post.content), [post.content]);
  const [activeId, setActiveId] = useState<string | null>(toc[0]?.id ?? null);
  const [copied, setCopied] = useState(false);

  // Active-section tracking. The rootMargin biases the observer toward the
  // heading that's near the top of the viewport, which is what readers expect.
  useEffect(() => {
    if (toc.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              a.boundingClientRect.top - b.boundingClientRect.top,
          );
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px" },
    );
    toc.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [toc]);

  const handleCopyUrl = async () => {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* swallow — clipboard is best-effort */
    }
  };

  /* ------------------- Markdown renderer ------------------------- */
  // Tracks toc cursor so each rendered h2/h3 gets the same id we exposed.
  const renderContent = (content: string) => {
    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];
    let tocCursor = 0;
    const nextHeadingId = (level: 2 | 3): string | undefined => {
      while (tocCursor < toc.length && toc[tocCursor].level !== level)
        tocCursor++;
      const it = toc[tocCursor];
      tocCursor++;
      return it?.id;
    };

    let i = 0;
    let suppressedFirstH1 = false; // Don't show H1 inside body — it's the page title.

    while (i < lines.length) {
      const line = lines[i];

      if (line.startsWith("# ")) {
        // Drop the first H1 (title is already rendered at the top).
        if (!suppressedFirstH1) {
          suppressedFirstH1 = true;
          i++;
          continue;
        }
        elements.push(
          <h2
            key={i}
            id={nextHeadingId(2)}
            className="mt-12 mb-4 scroll-mt-24 text-2xl font-semibold tracking-tight text-neutral-900"
          >
            {line.substring(2)}
          </h2>,
        );
        i++;
      } else if (line.startsWith("## ")) {
        elements.push(
          <h2
            key={i}
            id={nextHeadingId(2)}
            className="mt-12 mb-4 scroll-mt-24 text-2xl font-semibold tracking-tight text-neutral-900"
          >
            {line.substring(3)}
          </h2>,
        );
        i++;
      } else if (line.startsWith("### ")) {
        elements.push(
          <h3
            key={i}
            id={nextHeadingId(3)}
            className="mt-8 mb-3 scroll-mt-24 text-lg font-semibold tracking-tight text-neutral-900"
          >
            {line.substring(4)}
          </h3>,
        );
        i++;
      } else if (line.startsWith("|") && line.includes("|")) {
        // Markdown table — collect contiguous | rows.
        const rows: string[] = [];
        let c = i;
        while (c < lines.length && lines[c].startsWith("|") && lines[c].includes("|")) {
          rows.push(lines[c]);
          c++;
        }
        if (rows.length > 0) {
          const headers = rows[0]
            .split("|")
            .map((s) => s.trim())
            .filter(Boolean);
          const dataRows = rows.slice(2).map((r) =>
            r.split("|").map((s) => s.trim()).filter(Boolean),
          );
          elements.push(
            <div key={i} className="my-6 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50/60">
                    {headers.map((h, hi) => (
                      <th
                        key={hi}
                        className="px-3 py-2 text-left text-[12px] font-semibold uppercase tracking-wider text-neutral-600"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataRows.map((row, ri) => (
                    <tr
                      key={ri}
                      className={cn(
                        "border-b border-neutral-100 last:border-b-0",
                        ri % 2 === 1 && "bg-neutral-50/40",
                      )}
                    >
                      {row.map((cell, ci) => (
                        <td
                          key={ci}
                          className="px-3 py-2 text-[13px] text-neutral-700"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>,
          );
          i = c;
        } else {
          i++;
        }
      } else if (line.startsWith("- ")) {
        const items: string[] = [];
        let c = i;
        while (c < lines.length && lines[c].startsWith("- ")) {
          items.push(
            lines[c].substring(2).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
          );
          c++;
        }
        elements.push(
          <ul
            key={i}
            className="my-4 list-disc space-y-1.5 pl-6 text-[15px] leading-relaxed text-neutral-700 marker:text-neutral-400"
          >
            {items.map((item, idx) => (
              <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
            ))}
          </ul>,
        );
        i = c;
      } else if (line.match(/^\d+\.\s/)) {
        const items: string[] = [];
        let c = i;
        while (c < lines.length && lines[c].match(/^\d+\.\s/)) {
          items.push(
            lines[c]
              .replace(/^\d+\.\s/, "")
              .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
          );
          c++;
        }
        elements.push(
          <ol
            key={i}
            className="my-4 list-decimal space-y-1.5 pl-6 text-[15px] leading-relaxed text-neutral-700 marker:text-neutral-400"
          >
            {items.map((item, idx) => (
              <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
            ))}
          </ol>,
        );
        i = c;
      } else if (line.startsWith("**") && line.endsWith("**") && line.length > 4) {
        elements.push(
          <p key={i} className="mb-4 text-[15px] leading-relaxed text-neutral-900">
            <strong>{line.substring(2, line.length - 2)}</strong>
          </p>,
        );
        i++;
      } else if (line.trim() === "") {
        i++;
      } else {
        const processed = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        elements.push(
          <p
            key={i}
            className="mb-4 text-[15px] leading-relaxed text-neutral-700"
            dangerouslySetInnerHTML={{ __html: processed }}
          />,
        );
        i++;
      }
    }
    return elements;
  };

  return (
    <div className="min-h-screen bg-white">
      <div id="nav-sentinel" className="absolute top-0 h-1 w-full" />
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 pt-10 pb-20">
        {/* Back link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-neutral-500 transition-colors hover:text-neutral-900"
        >
          <ArrowLeft className="size-3.5" />
          Tornar al blog
        </Link>

        {/* Header — editorial, left-aligned, max-w-3xl so it reads well. */}
        <header className="mt-8 max-w-3xl">
          {post.tags.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-1.5">
              {post.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <h1 className="text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="mt-5 text-lg leading-relaxed text-neutral-600">
              {post.excerpt}
            </p>
          )}

          {/* Author / meta row */}
          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-neutral-500">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400 text-[10px] font-semibold text-white">
                {authorInitials(post.author) || "?"}
              </div>
              <span>
                {formatDate(post.createdAt)}
                <span className="mx-1.5 text-neutral-300">·</span>
                <span className="font-medium text-neutral-700">{post.author}</span>
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 text-neutral-500">
              <Clock className="size-3.5" />
              {minutes} min de lectura
            </span>
            <button
              onClick={handleCopyUrl}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] transition-colors",
                copied
                  ? "text-emerald-700"
                  : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900",
              )}
            >
              {copied ? (
                <Check className="size-3.5" />
              ) : (
                <Link2 className="size-3.5" />
              )}
              {copied ? "URL copiada" : "Copiar URL"}
            </button>
          </div>
        </header>

        <hr className="my-10 border-neutral-100" />

        {/* Body + TOC */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_220px]">
          <article className="min-w-0 max-w-3xl">
            {renderContent(post.content)}
          </article>

          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                Contingut
              </p>
              {toc.length === 0 ? (
                <p className="text-[12px] text-neutral-400">
                  Aquest article no té seccions.
                </p>
              ) : (
                <nav className="flex max-h-[calc(100vh-200px)] flex-col gap-1 overflow-y-auto text-[13px]">
                  {toc.map((item) => {
                    const isActive = activeId === item.id;
                    return (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        className={cn(
                          "border-l-2 py-1 pr-2 transition-colors",
                          item.level === 3 ? "pl-6" : "pl-3",
                          isActive
                            ? "border-indigo-500 font-medium text-indigo-600"
                            : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-900",
                        )}
                      >
                        {item.text}
                      </a>
                    );
                  })}
                </nav>
              )}
            </div>
          </aside>
        </div>

        {/* Author card footer — small, neutral, matches landing aesthetic. */}
        <div className="mx-auto mt-16 max-w-3xl border-t border-neutral-100 pt-8">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400 text-xs font-semibold text-white">
              {authorInitials(post.author) || "?"}
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-900">
                {post.author}
              </p>
              <p className="text-xs text-neutral-500">
                Publicat el {formatDate(post.createdAt)}
                {post.updatedAt !== post.createdAt && (
                  <>
                    <span className="mx-1.5 text-neutral-300">·</span>
                    Actualitzat el {formatDate(post.updatedAt)}
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
