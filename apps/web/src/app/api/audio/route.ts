import { NextRequest, NextResponse } from "next/server";
import { SmartPagination, PaginationPerformanceMonitor } from "@/lib/smart-pagination";
import { getAuth, jsonError } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters for pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const orderBy = searchParams.get("orderBy") || "created_at";
    const orderDirection = (searchParams.get("orderDirection") || "desc") as "asc" | "desc";

    // Create optimized Supabase client via shared auth helper
    const { supabase, user, error: userError } = await getAuth();
    const pagination = new SmartPagination(supabase);
    const performanceMonitor = new PaginationPerformanceMonitor();

    // Check authentication
    if (userError || !user) {
      return jsonError("Authentication required. Please sign in.", { status: 401 });
    }

    // Compute a cache key based on latest updated_at across audios and transcriptions
    const [latestAudioRes, latestTransRes] = await Promise.all([
      supabase
        .from("audios")
        .select("updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("transcriptions")
        .select("updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const audioLatest = latestAudioRes.data?.updated_at || "0";
    const transLatest = latestTransRes.data?.updated_at || "0";
    const latestUpdatedAt =
      new Date(transLatest) > new Date(audioLatest) ? transLatest : audioLatest;
    const weakEtag = `W/"audios-${user.id}-${latestUpdatedAt}-${page}-${limit}-${search}-${orderBy}-${orderDirection}"`;

    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch === weakEtag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: weakEtag,
          "Cache-Control": "private, max-age=15",
        },
      });
    }

    // Use smart pagination with search capabilities
    const startTime = Date.now();

    let result;
    if (search) {
      // Search across filename and custom_name
      result = await pagination.searchWithPagination(
        "audios",
        search,
        ["filename", "custom_name"],
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
              status,
              created_at,
              updated_at,
              alumne_id
            )
          `,
          filters: {
            user_id: user.id,
          },
        }
      );
    } else {
      // Regular pagination
      result = await pagination.paginateWithOffset("audios", {
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
            status,
            created_at,
            updated_at,
            alumne_id
          )
        `,
        filters: {
          user_id: user.id,
        },
      });
    }

    const queryTime = Date.now() - startTime;
    performanceMonitor.trackQuery("audio_list", queryTime);

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
      transcription: audioFile.transcriptions?.[0]
        ? {
            id: audioFile.transcriptions[0].id,
            audioId: audioFile.id,
            originalText: audioFile.transcriptions[0].original_text,
            editedText: audioFile.transcriptions[0].edited_text,
            // segments intentionally omitted on list endpoint for payload efficiency
            createdAt: audioFile.transcriptions[0].created_at,
            updatedAt: audioFile.transcriptions[0].updated_at,
            alumneId: audioFile.transcriptions[0].alumne_id,
          }
        : null,
    }));

    return NextResponse.json(
      {
        success: true,
        audioFiles: transformedAudioFiles,
        pagination: result.pagination,
        meta: {
          ...result.meta,
          search: search || undefined,
        },
      },
      {
        headers: {
          ETag: weakEtag,
          "Cache-Control": "private, max-age=15",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching audio files:", error);
    return jsonError("Failed to fetch audio files", { status: 500 });
  }
}