"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, Trash2, Calendar, User, Eye, FileText } from "lucide-react";

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
  slug?: string; // Add optional slug property
}

interface BlogListProps {
  posts: BlogPost[];
  loading: boolean;
  onEdit?: (post: BlogPost) => void;
  onDelete?: (postId: string) => void;
  showActions?: boolean;
}

export default function BlogList({ posts, loading, onEdit, onDelete, showActions = true }: BlogListProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ca-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    const plainText = content.replace(/<[^>]*>/g, "");
    return plainText.length > maxLength 
      ? plainText.substring(0, maxLength) + "..."
      : plainText;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3 mb-4" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Cap article encara</h3>
          <p className="text-muted-foreground mb-4">
            Comença creant el teu primer article del blog.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map((post) => (
        <Card key={post.id} className="hover:shadow-md transition-shadow flex flex-col group relative">
          {/* Admin actions positioned absolutely */}
          {showActions && (onEdit || onDelete) && (
            <div className="absolute top-2 right-2 flex flex-col gap-1 z-10" onClick={(e) => e.preventDefault()}>
              {showActions && onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    onEdit(post);
                  }}
                  className="gap-1 text-xs"
                >
                  <Edit className="h-3 w-3" />
                  Editar
                </Button>
              )}
              {showActions && onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    onDelete(post.id);
                  }}
                  className="gap-1 text-destructive hover:text-destructive text-xs"
                >
                  <Trash2 className="h-3 w-3" />
                  Eliminar
                </Button>
              )}
            </div>
          )}

          <Link href={`/blog/${post.slug || post.id}`} className="flex flex-col h-full">
            <CardContent className="flex-1 flex flex-col p-6 py-3">
              {/* Keywords/Tags at the top */}
              {post.tags.length > 0 && (
                <div className="flex flex-nowrap gap-1 mb-3 overflow-hidden">
                  {post.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs whitespace-nowrap">
                      {tag}
                    </Badge>
                  ))}
                  {post.tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs whitespace-nowrap">
                      +{post.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              {/* Title */}
              <CardTitle className="text-xl leading-tight group-hover:text-blue-600 transition-colors mb-2">
                {post.title}
                {!post.published && (
                  <Badge variant="outline" className="ml-2">Esborrany</Badge>
                )}
              </CardTitle>

              {/* Description */}
              <p className="text-muted-foreground mb-3 flex-1 text-sm leading-relaxed">
                {post.excerpt || truncateContent(post.content, 120)}
              </p>

              {/* Author and Date */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span className="font-bold">{post.author}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(post.createdAt)}
                </div>
              </div>

              {/* Read Article Button */}
              <div className="mt-auto">
                <div className="text-sm text-blue-600 group-hover:text-blue-800 font-medium flex items-center gap-1">
                  Llegir Article
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>
      ))}
    </div>
  );
}