// app/api/transcription/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { apiCache } from "@/lib/cache";
import type { TranscriptionSegment, Speaker } from "@/types";

interface TranscriptionData {
  text: string;
  segments?: TranscriptionSegment[];
  speakers?: Speaker[];
  updated_at?: string;
}

interface TranscriptionRecord extends TranscriptionData {
  id: string;
  audio_id: string;
  json_path?: string;
  original_text?: string;
  edited_text?: string;
  created_at?: string;
  updated_at?: string;
}

export const runtime = "nodejs";

function buildVersionedPath(userId: string, audioId: string) {
  // Safe, sortable filename (ms since epoch)
  const version = Date.now();
  return `${userId}/${audioId}/${version}.json`;
}

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0, s-maxage=0",
  Pragma: "no-cache",
  Expires: "0",
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { editedText, editedSegments, speakers, alumneId } = body ?? {};

    const cookieStore = await cookies();
    const supabaseUserClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set({ name, value, ...options })
            );
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseUserClient.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const { data: transcription, error: transcriptionError } =
      await supabaseUserClient
        .from("transcriptions")
        .select("audio_id, json_path, updated_at, alumne_id")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

    if (transcriptionError || !transcription) {
      return NextResponse.json(
        {
          success: false,
          error: "Transcription not found or permission denied",
        },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    if (
      alumneId !== undefined &&
      editedText === undefined &&
      editedSegments === undefined &&
      speakers === undefined
    ) {
      const timestamp = new Date().toISOString();
      const { data: updatedRow, error: alumneUpdateError } =
        await supabaseUserClient
          .from("transcriptions")
          .update({ alumne_id: alumneId || null, updated_at: timestamp })
          .eq("id", id)
          .eq("user_id", user.id)
          .select("id, audio_id, alumne_id, updated_at")
          .single();

      if (alumneUpdateError) {
        console.error("Failed to update alumne assignment", alumneUpdateError);
        return NextResponse.json(
          { success: false, error: "No se pudo actualizar el alumno asignado" },
          { status: 500, headers: NO_CACHE_HEADERS }
        );
      }

      // Invalidate cache for the assigned student's transcriptions
      if (alumneId) {
        const cacheKey = apiCache.generateKey("transcriptions", { alumneId });
        console.log("Invalidating cache for key:", cacheKey);
        apiCache.delete(cacheKey);
        console.log("Cache invalidated successfully");
      }

      return NextResponse.json(
        {
          success: true,
          transcription: {
            id,
            audioId: updatedRow.audio_id,
            alumneId: updatedRow.alumne_id,
            updatedAt: updatedRow.updated_at,
          },
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    if (!editedText) {
      return NextResponse.json(
        { success: false, error: "Edited text is required" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const legacyPath = `${user.id}/${transcription.audio_id}.json`;
    const oldPath = transcription.json_path || legacyPath;

    let existingData: TranscriptionData = {
      text: "",
      segments: [],
      speakers: [],
    };
    const { data: existingBlob } = await supabaseAdmin.storage
      .from("transcriptions")
      .download(oldPath);
    if (existingBlob) {
      try {
        existingData = JSON.parse(
          await existingBlob.text()
        ) as TranscriptionData;
      } catch {
        existingData = {
          text: "",
          segments: [],
          speakers: [],
        };
      }
    }

    const updatedJsonData = {
      ...existingData,
      segments: editedSegments ?? existingData.segments,
      text: editedText ?? existingData.text,
      speakers: speakers ?? existingData.speakers,
      updated_at: new Date().toISOString(),
    };

    const newPath = buildVersionedPath(user.id, transcription.audio_id);
    const { error: uploadError } = await supabaseAdmin.storage
      .from("transcriptions")
      .upload(newPath, JSON.stringify(updatedJsonData, null, 2), {
        contentType: "application/json",
        upsert: false,
        cacheControl:
          "no-store, no-cache, must-revalidate, max-age=0, s-maxage=0",
      });
    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { success: false, error: "Could not save transcription file." },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    const updatePayload: {
      json_path: string;
      updated_at: string;
      alumne_id?: string | null;
    } = {
      json_path: newPath,
      updated_at: updatedJsonData.updated_at,
    };
    if (alumneId !== undefined) {
      updatePayload.alumne_id = alumneId || null;
    }

    const { data: updatedRow, error: updateErr } = await supabaseUserClient
      .from("transcriptions")
      .update(updatePayload)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, audio_id, json_path, updated_at, alumne_id")
      .single();

    if (updateErr) {
      console.error("DB pointer update error:", updateErr);
      await supabaseAdmin.storage
        .from("transcriptions")
        .remove([newPath])
        .catch(() => {});
      return NextResponse.json(
        { success: false, error: "Failed to update transcription record." },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    if (oldPath && oldPath !== newPath) {
      await supabaseAdmin.storage
        .from("transcriptions")
        .remove([oldPath])
        .catch(() => {});
    }

    return NextResponse.json(
      {
        success: true,
        message: "Transcription updated successfully",
        transcription: {
          id,
          audioId: transcription.audio_id,
          jsonPath: newPath,
          originalText: undefined,
          editedText: updatedJsonData.text,
          segments: updatedJsonData.segments ?? [],
          speakers: updatedJsonData.speakers ?? [],
          alumneId: updatedRow.alumne_id ?? null,
          updatedAt: updatedJsonData.updated_at,
        },
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error("[PATCH] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update transcription" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set({ name, value, ...options })
            );
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication required. Please sign in." },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    // Get transcription, including pointer
    const { data: transcription, error: transcriptionError } = (await supabase
      .from("transcriptions")
      .select(
        `
        id, audio_id, created_at, updated_at, json_path, original_text, edited_text, segments, speakers,
        audios!inner ( user_id )
      `
      )
      .eq("id", id)
      .eq("audios.user_id", user.id)
      .single()) as {
      data: TranscriptionRecord | null;
      error: Error | null;
    };

    if (transcriptionError || !transcription) {
      return NextResponse.json(
        { success: false, error: "Transcription not found" },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Decide which file to read:
    // 1) use json_path if present
    // 2) else find the latest in userId/audioId/
    // 3) else fallback to legacy single-file path
    let jsonPath = transcription.json_path as string | undefined;

    if (!jsonPath) {
      const prefix = `${user.id}/${transcription.audio_id}`;
      const { data: listed, error: listErr } = await supabaseAdmin.storage
        .from("transcriptions")
        .list(prefix, {
          limit: 100,
          sortBy: { column: "name", order: "desc" }, // filenames are timestamps => latest first
        });

      if (!listErr && listed && listed.length > 0) {
        jsonPath = `${prefix}/${listed[0].name}`;
      } else {
        // legacy path fallback
        jsonPath = `${user.id}/${transcription.audio_id}.json`;
      }
    }

    let editedTextFromJson: string | undefined;
    let segmentsFromJson: TranscriptionSegment[] | undefined;
    let speakersFromJson: Speaker[] | undefined;
    let updatedAtFromJson: string | undefined;

    const { data: fileData } = await supabaseAdmin.storage
      .from("transcriptions")
      .download(jsonPath);

    if (fileData) {
      const text = await fileData.text();
      try {
        const parsed = JSON.parse(text);
        editedTextFromJson = parsed.text;
        segmentsFromJson = parsed.segments;
        speakersFromJson = parsed.speakers;
        updatedAtFromJson = parsed.updated_at;
      } catch {
        // ignore parse issues, we'll fallback to DB columns
      }
    }

    const responseTranscription = {
      id: transcription.id,
      audioId: transcription.audio_id,
      jsonPath,
      originalText: transcription.original_text,
      editedText:
        editedTextFromJson ??
        transcription.edited_text ??
        transcription.original_text,
      segments: segmentsFromJson ?? transcription.segments ?? [],
      speakers: speakersFromJson ?? transcription.speakers ?? [],
      createdAt: transcription.created_at,
      updatedAt: updatedAtFromJson ?? transcription.updated_at,
    };

    return NextResponse.json(
      { success: true, transcription: responseTranscription },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error("Error fetching transcription:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch transcription" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
