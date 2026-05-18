"use client";

import React from "react";
import BlogList from "@/components/blog/BlogList";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Mail, ArrowRight } from "lucide-react";

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

interface BlogClientProps {
  blogPosts: BlogPost[];
}

export default function BlogClient({ blogPosts }: BlogClientProps) {
  const handleSubmitArticle = () => {
    const subject = encodeURIComponent("Proposta d'article per al blog");
    const body = encodeURIComponent(
      "Hola,\n\nVoldria proposar un article per al vostre blog. Aquí teniu els detalls:\n\nTítol: [Títol del vostre article]\nArticle: [descripció del contingut]\n\nGràcies!",
    );
    window.location.href = `mailto:guiraocastells@gmail.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Scroll sentinel for navbar transitions. */}
      <div id="nav-sentinel" className="absolute top-0 h-1 w-full" />

      <Navbar />

      {/* Hero band — same grid-line backdrop as the landing hero. */}
      <section className="relative isolate overflow-hidden border-b border-neutral-100">
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-grid-lines bg-grid-fade"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-4xl px-6 pt-20 pb-16 text-center sm:pt-28">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm">
            <span className="inline-flex size-1.5 rounded-full bg-indigo-500" />
            Blog
          </span>
          <h1 className="mt-5 text-4xl font-normal tracking-tight text-neutral-900 sm:text-5xl md:text-6xl">
            El blog de Transcriu
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-neutral-600 sm:text-lg">
            Consells, tutorials i novetats sobre transcripció d&apos;àudio amb
            intel·ligència artificial.
          </p>
        </div>
      </section>

      {/* Articles grid */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <BlogList posts={blogPosts} loading={false} showActions={false} />
      </section>

      {/* "Submit your article" CTA — landing-style section, not a boxed card. */}
      <section className="border-t border-neutral-100">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-24">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm">
            <span className="inline-flex size-1.5 rounded-full bg-emerald-500" />
            Contribueix
          </span>
          <h2 className="mt-5 text-3xl font-normal tracking-tight text-neutral-900 sm:text-4xl">
            Vols publicar el teu article?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-neutral-600">
            Envia&apos;l i el publiquem. Comparteix els teus coneixements amb
            la nostra comunitat de logopedes, periodistes i investigadors.
          </p>
          <button
            onClick={handleSubmitArticle}
            className="mt-8 inline-flex h-11 items-center gap-2 rounded-md bg-neutral-900 px-5 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
          >
            <Mail className="size-4" />
            Enviar article
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
