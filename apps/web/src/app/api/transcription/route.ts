import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { apiCache, CACHE_HEADERS, createCachedResponse } from "@/lib/cache"
import { BatchQueryBuilder, createOptimizedSupabaseClient, QueryPerformanceTracker } from "@/lib/database-optimized"
import { getAuth, jsonError, jsonOk } from "@/lib/api-helpers"

interface RawTranscription {
  id: string
  audio_id: string
  created_at: string
  updated_at: string
  alumne_id: string
  json_path: string
  audios: {
    user_id: string
    custom_name?: string
  }
}

interface FormattedTranscription {
  id: string
  audioId: string
  name?: string
  createdAt: string
  updatedAt: string
}

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const alumneId = searchParams.get("alumneId")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    if (!alumneId) {
      return jsonError("alumneId parameter is required", { status: 400, headers: CACHE_HEADERS.NO_CACHE })
    }

    const { supabase, user, error: userError } = await getAuth()
    if (userError || !user) {
      return jsonError("Authentication required", { status: 401, headers: CACHE_HEADERS.NO_CACHE })
    }

    // Compute weak ETag from latest updated_at for this alumne's transcriptions
    let weakEtag = ''
    try {
      const { data: latest, error: latestErr } = await supabase
        .from("transcriptions")
        .select("updated_at")
        .eq("alumne_id", alumneId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      const latestUpdatedAt = latest?.updated_at || '0'
      weakEtag = `W/"transcriptions-${user.id}-${alumneId}-${latestUpdatedAt}"`
    } catch (e) {
      weakEtag = `W/"transcriptions-${user.id}-${alumneId}-0"`
    }

    const ifNoneMatch = request.headers.get('if-none-match')
    if (ifNoneMatch && weakEtag && ifNoneMatch === weakEtag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: weakEtag,
          'Cache-Control': 'private, max-age=15',
        },
      })
    }

    const queryTracker = QueryPerformanceTracker.getInstance()
    const batchQuery = new BatchQueryBuilder(supabase)

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
    )

    const formattedTranscriptions = result.data.map((t: any) => ({
      id: t.id,
      audioId: t.audio_id,
      name: t.audios?.custom_name || t.audios?.filename || "Untitled",
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }))

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
    }

    return jsonOk(responseData, { status: 200, headers: { ETag: weakEtag, 'Cache-Control': 'private, max-age=15' } })
  } catch (error) {
    console.error("Error in transcription route:", error)
    return jsonError("Internal server error", { status: 500, headers: CACHE_HEADERS.NO_CACHE })
  }
}
