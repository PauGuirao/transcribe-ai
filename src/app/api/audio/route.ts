import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SmartPagination, PaginationPerformanceMonitor } from "@/lib/smart-pagination";
import { createOptimizedSupabaseClient } from "@/lib/database-optimized";

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters for pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const orderBy = searchParams.get("orderBy") || "created_at";
    const orderDirection = (searchParams.get("orderDirection") || "desc") as 'asc' | 'desc';

    // Create optimized Supabase client
    const supabase = await createOptimizedSupabaseClient();
    const pagination = new SmartPagination(supabase);
    const performanceMonitor = new PaginationPerformanceMonitor();

    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    // Use smart pagination with search capabilities
    const startTime = Date.now();
    
    let result;
    if (search) {
      // Search across filename and custom_name
      result = await pagination.searchWithPagination(
        'audios',
        search,
        ['filename', 'custom_name'],
        {
          page,
          limit,
          orderBy,
          orderDirection,
          select: `
            *,
            transcriptions (
              id,
              original_text,
              edited_text,
              segments,
              language,
              confidence,
              status,
              created_at,
              updated_at
            )
          `,
          filters: {
            user_id: user.id
          }
        }
      );
    } else {
      // Regular pagination
      result = await pagination.paginateWithOffset(
        'audios',
        {
          page,
          limit,
          orderBy,
          orderDirection,
          select: `
            *,
            transcriptions (
              id,
              original_text,
              edited_text,
              segments,
              language,
              confidence,
              status,
              created_at,
              updated_at
            )
          `,
          filters: {
            user_id: user.id
          }
        }
      );
    }

    const queryTime = Date.now() - startTime;
    performanceMonitor.trackQuery('audio_list', queryTime);

    // Transform the data to match frontend interface
    const transformedAudioFiles = result.data.map((audioFile: any) => ({
      id: audioFile.id,
      filename: audioFile.filename,
      originalName: audioFile.original_filename || audioFile.filename,
      customName: audioFile.custom_name,
      fileId: audioFile.id,
      uploadDate: audioFile.created_at,
      status: audioFile.status,
      alumneId: audioFile.alumne_id,
      transcription: audioFile.transcriptions?.[0] ? {
        id: audioFile.transcriptions[0].id,
        audioId: audioFile.id,
        originalText: audioFile.transcriptions[0].original_text,
        editedText: audioFile.transcriptions[0].edited_text,
        segments: audioFile.transcriptions[0].segments,
        createdAt: audioFile.transcriptions[0].created_at,
        updatedAt: audioFile.transcriptions[0].updated_at,
        alumneId: audioFile.transcriptions[0].alumne_id,
      } : null,
    }));

    return NextResponse.json({
      success: true,
      audioFiles: transformedAudioFiles,
      pagination: result.pagination,
      meta: {
        ...result.meta,
        search: search || undefined,
      }
    });

  } catch (error) {
    console.error('Error fetching audio files:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch audio files' },
      { status: 500 }
    );
  }
}