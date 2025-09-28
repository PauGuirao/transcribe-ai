import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { apiCache, CACHE_HEADERS, createCachedResponse } from "@/lib/cache";
import { BatchQueryBuilder, createOptimizedSupabaseClient, QueryPerformanceTracker } from "@/lib/database-optimized";

interface RawTranscription {
  id: string;
  audio_id: string;
  created_at: string;
  updated_at: string;
  alumne_id: string;
  json_path: string;
  audios: {
    user_id: string;
    custom_name?: string;
  };
}

interface FormattedTranscription {
  id: string;
  audioId: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
}

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const alumneId = searchParams.get("alumneId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!alumneId) {
      return NextResponse.json(
        { success: false, error: "alumneId parameter is required" },
        { status: 400, headers: CACHE_HEADERS.NO_CACHE }
      );
    }

    // Create optimized supabase client
    const supabase = await createOptimizedSupabaseClient();
    const queryTracker = QueryPerformanceTracker.getInstance();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401, headers: CACHE_HEADERS.NO_CACHE }
      );
    }

    // Use optimized batch query to prevent N+1 queries
    const batchQuery = new BatchQueryBuilder(supabase);
    
    const result = await queryTracker.trackQuery(
      'getTranscriptionsWithAudioData',
      () => batchQuery.getTranscriptionsWithAudioData(
        alumneId, 
        user.id, 
        { 
          limit, 
          offset: (page - 1) * limit,
          orderBy: 'created_at',
          orderDirection: 'desc'
        }
      )
    );

    // Map the results to a cleaner format
    const formattedTranscriptions: FormattedTranscription[] = result.data.map((t: any) => ({
      id: t.id,
      audioId: t.audio_id,
      name: t.audios?.custom_name || t.audios?.filename || "Untitled",
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));

    const responseData = {
      success: true,
      transcriptions: formattedTranscriptions,
      pagination: {
        page,
        limit,
        total: result.count,
        hasMore: result.hasMore,
        nextPage: result.hasMore ? page + 1 : null,
      },
    };

    return NextResponse.json(responseData, {
      status: 200,
      headers: CACHE_HEADERS.SHORT,
    });
  } catch (error) {
    console.error("Error in transcription route:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: CACHE_HEADERS.NO_CACHE }
    );
  }
}
