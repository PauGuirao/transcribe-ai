"use client";

import React from "react";
import BlogList from "@/components/blog/BlogList";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

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
    const body = encodeURIComponent("Hola,\n\nVoldria proposar un article per al vostre blog. Aquí teniu els detalls:\n\nTítol: [Títol del vostre article]\nResum: [Breu descripció del contingut]\n\nGràcies!");
    window.location.href = `mailto:info@transcriu.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation sentinel for scroll detection */}
      <div id="nav-sentinel" className="absolute top-0 h-1 w-full"></div>
      
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 mt-20">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Blog Transcriu</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Descobreix consells, tutorials i novetats sobre transcripció d'àudio i intel·ligència artificial
          </p>
        </div>

        <BlogList
          posts={blogPosts}
          loading={false}
          showActions={false}
        />

        {/* Article submission section */}
        <div className="mt-16 text-center bg-white rounded-lg shadow-sm border p-8 max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Vols publicar el teu article?
          </h2>
          <p className="text-gray-600 mb-6">
            Envial i te'l publiquem. Comparteix els teus coneixements amb la nostra comunitat.
          </p>
          <Button 
            onClick={handleSubmitArticle}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium inline-flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            Enviar article
          </Button>
        </div>
      </div>
    </div>
  );
}