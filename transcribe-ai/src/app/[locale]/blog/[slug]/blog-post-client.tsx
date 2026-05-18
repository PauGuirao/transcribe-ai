"use client";

import React from "react";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, ArrowLeft, Share2 } from "lucide-react";
import Link from "next/link";

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

export default function BlogPostClient({ post }: BlogPostClientProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ca-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Simple markdown-like content renderer
  const renderContent = (content: string) => {
    // Split content by lines and process each line
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={i} className="text-3xl font-bold text-gray-900 mb-6 mt-8 first:mt-0">
            {line.substring(2)}
          </h1>
        );
        i++;
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={i} className="text-2xl font-semibold text-gray-800 mb-4 mt-6">
            {line.substring(3)}
          </h2>
        );
        i++;
      } else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={i} className="text-xl font-semibold text-gray-700 mb-3 mt-5">
            {line.substring(4)}
          </h3>
        );
        i++;
      } else if (line.startsWith('|') && line.includes('|')) {
        // Handle markdown tables
        const tableRows = [];
        let currentIndex = i;
        
        // Collect all table rows
        while (currentIndex < lines.length && lines[currentIndex].startsWith('|') && lines[currentIndex].includes('|')) {
          tableRows.push(lines[currentIndex]);
          currentIndex++;
        }
        
        if (tableRows.length > 0) {
          // Parse table
          const headerRow = tableRows[0];
          const separatorRow = tableRows[1]; // Usually contains |------|------|
          const dataRows = tableRows.slice(2);
          
          // Parse header
          const headers = headerRow.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
          
          // Parse data rows
          const rows = dataRows.map(row => 
            row.split('|').map(cell => cell.trim()).filter(cell => cell !== '')
          );
          
          elements.push(
            <div key={i} className="overflow-x-auto mb-6">
              <table className="min-w-full border-collapse border border-gray-300 bg-white">
                <thead className="bg-gray-50">
                  <tr>
                    {headers.map((header, headerIndex) => (
                      <th 
                        key={headerIndex} 
                        className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-900"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {row.map((cell, cellIndex) => (
                        <td 
                          key={cellIndex} 
                          className="border border-gray-300 px-4 py-2 text-gray-700"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          
          i = currentIndex;
        } else {
          i++;
        }
      } else if (line.startsWith('- ')) {
        // Handle list items - we'll group consecutive items
        const listItems = [];
        let currentIndex = i;
        while (currentIndex < lines.length && lines[currentIndex].startsWith('- ')) {
          let itemText = lines[currentIndex].substring(2);
          // Process inline formatting for list items
          itemText = itemText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          listItems.push(itemText);
          currentIndex++;
        }
        if (listItems.length > 0) {
          elements.push(
            <ul key={i} className="list-disc list-inside mb-4 space-y-1 text-gray-700">
              {listItems.map((item, itemIndex) => (
                <li key={itemIndex} dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ul>
          );
          i = currentIndex;
        } else {
          i++;
        }
      } else if (line.match(/^\d+\. /)) {
        // Handle numbered lists
        const listItems = [];
        let currentIndex = i;
        while (currentIndex < lines.length && lines[currentIndex].match(/^\d+\. /)) {
          let itemText = lines[currentIndex].replace(/^\d+\. /, '');
          // Process inline formatting for numbered list items
          itemText = itemText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          listItems.push(itemText);
          currentIndex++;
        }
        if (listItems.length > 0) {
          elements.push(
            <ol key={i} className="list-decimal list-inside mb-4 space-y-1 text-gray-700">
              {listItems.map((item, itemIndex) => (
                <li key={itemIndex} dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ol>
          );
          i = currentIndex;
        } else {
          i++;
        }
      } else if (line.startsWith('**') && line.endsWith('**')) {
        // Handle bold text on its own line
        elements.push(
          <p key={i} className="mb-4 text-gray-700">
            <strong>{line.substring(2, line.length - 2)}</strong>
          </p>
        );
        i++;
      } else if (line.trim() === '') {
        // Skip empty lines
        i++;
      } else if (line.trim() !== '') {
        // Regular paragraph
        // Handle inline formatting
        let processedLine = line;
        
        // Bold text
        processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        elements.push(
          <p 
            key={i} 
            className="mb-4 text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: processedLine }}
          />
        );
        i++;
      } else {
        i++;
      }
    }
    
    return elements;
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Enllaç copiat al portapapers!');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation sentinel for scroll detection */}
      <div id="nav-sentinel" className="absolute top-0 h-1 w-full"></div>
      
      <Navbar />
      
      <article className="container mx-auto px-4 py-8 mt-20 max-w-4xl">
        {/* Back button */}
        <div className="mb-6">
          <Link href="/blog">
            <Button variant="ghost" className="gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" />
              Tornar al blog
            </Button>
          </Link>
        </div>

        {/* Article header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
            {post.title}
          </h1>
          
          {/* Author section with enhanced prominence */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900">
                    {post.author}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    {formatDate(post.createdAt)}
                    {post.updatedAt !== post.createdAt && (
                      <span className="ml-2 text-xs">
                        • Actualitzat: {formatDate(post.updatedAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="gap-1"
              >
                <Share2 className="h-4 w-4" />
                Compartir
              </Button>
            </div>
          </div>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-sm">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Excerpt */}
          <div className="text-lg text-gray-600 leading-relaxed border-l-4 border-blue-500 pl-4 mb-8">
            {post.excerpt}
          </div>
        </header>

        {/* Article content */}
        <div className="prose prose-lg max-w-none">
          {renderContent(post.content)}
        </div>

        {/* Article footer */}
        <footer className="mt-12 pt-8 border-t border-gray-200">
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-base font-semibold text-gray-900">
                    {post.author}
                  </div>
                  <div className="text-sm text-gray-600">
                    Publicat el {formatDate(post.createdAt)}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleShare}
                className="gap-1"
              >
                <Share2 className="h-4 w-4" />
                Compartir article
              </Button>
            </div>
          </div>
        </footer>
      </article>
    </div>
  );
}