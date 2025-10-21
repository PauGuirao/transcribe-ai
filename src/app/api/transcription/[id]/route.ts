import { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { apiCache, CACHE_HEADERS } from "@/lib/cache"
import { getAuth, jsonError, jsonOk } from "@/lib/api-helpers"
import { buildVersionedPath, TranscriptionJsonData, TranscriptionRow } from "@/lib/data/transcription"

export const runtime = "nodejs"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { editedText, editedSegments, speakers, alumneId } = body ?? {}

    const { supabase, user, error: userError } = await getAuth()
    if (userError || !user) {
      return jsonError("Authentication required.", { status: 401, headers: CACHE_HEADERS.NO_CACHE })
    }

    const { data: transcription, error: transcriptionError } = await supabase
      .from("transcriptions")
      .select("audio_id, json_path, updated_at, alumne_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (transcriptionError || !transcription) {
      return jsonError("Transcription not found or permission denied", { status: 404, headers: CACHE_HEADERS.NO_CACHE })
    }

    if (
      alumneId !== undefined &&
      editedText === undefined &&
      editedSegments === undefined &&
      speakers === undefined
    ) {
      const timestamp = new Date().toISOString()
      const { data: updatedRow, error: alumneUpdateError } = await supabase
        .from("transcriptions")
        .update({ alumne_id: alumneId || null, updated_at: timestamp })
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id, audio_id, alumne_id, updated_at")
        .single()

      if (alumneUpdateError) {
        console.error("Failed to update alumne assignment", alumneUpdateError)
        return jsonError("No se pudo actualizar el alumno asignado", { status: 500, headers: CACHE_HEADERS.NO_CACHE })
      }

      if (alumneId) {
        const cacheKey = apiCache.generateKey("transcriptions", { alumneId })
        console.log("Invalidating cache for key:", cacheKey)
        apiCache.delete(cacheKey)
        console.log("Cache invalidated successfully")
      }

      return jsonOk({
        success: true,
        transcription: {
          id,
          audioId: updatedRow.audio_id,
          alumneId: updatedRow.alumne_id,
          updatedAt: updatedRow.updated_at,
        },
      }, { headers: CACHE_HEADERS.NO_CACHE })
    }

    if (!editedText) {
      return jsonError("Edited text is required", { status: 400, headers: CACHE_HEADERS.NO_CACHE })
    }

    // Use Cloudflare Worker to save to R2 instead of Supabase Storage
    const workerUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_WORKER_URL || 'https://transcribe-worker.guiraocastells.workers.dev'
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      return jsonError("Authentication session required", { status: 401, headers: CACHE_HEADERS.NO_CACHE })
    }

    try {
      const workerResponse = await fetch(`${workerUrl}/update-transcription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          audioId: transcription.audio_id,
          editedText,
          editedSegments,
          speakers,
        }),
      })

      if (!workerResponse.ok) {
        const errorText = await workerResponse.text()
        console.error('Worker update failed:', errorText)
        return jsonError("Failed to save transcription to R2", { status: 500, headers: CACHE_HEADERS.NO_CACHE })
      }

      const workerResult = await workerResponse.json()
      
      // Update the local database record with alumne_id if provided
      const updatePayload: { updated_at: string; alumne_id?: string | null } = {
        updated_at: workerResult.updatedAt,
      }
      if (alumneId !== undefined) {
        updatePayload.alumne_id = alumneId || null
      }

      const { data: updatedRow, error: updateErr } = await supabase
        .from("transcriptions")
        .update(updatePayload)
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id, audio_id, json_path, updated_at, alumne_id")
        .single()

      if (updateErr) {
        console.error("DB update error:", updateErr)
        return jsonError("Failed to update transcription record.", { status: 500, headers: CACHE_HEADERS.NO_CACHE })
      }

      return jsonOk({
        success: true,
        message: "Transcription updated successfully",
        transcription: {
          id,
          audioId: transcription.audio_id,
          jsonPath: workerResult.storagePath,
          originalText: undefined,
          editedText: editedText,
          segments: editedSegments ?? [],
          speakers: speakers ?? [],
          alumneId: updatedRow.alumne_id ?? null,
          updatedAt: workerResult.updatedAt,
        },
      }, { headers: CACHE_HEADERS.NO_CACHE })

    } catch (error) {
      console.error('Worker request failed:', error)
      return jsonError("Failed to communicate with transcription service", { status: 502, headers: CACHE_HEADERS.NO_CACHE })
    }

  } catch (error) {
    console.error("[PATCH] Unexpected error:", error)
    return jsonError("Failed to update transcription", { status: 500, headers: CACHE_HEADERS.NO_CACHE })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { supabase, user, error: userError } = await getAuth()
    if (userError || !user) {
      return jsonError("Authentication required. Please sign in.", { status: 401, headers: CACHE_HEADERS.NO_CACHE })
    }

    const { getTranscriptionById } = await import("@/lib/data/transcription")
    const { data: transcription, error: transcriptionError } = await getTranscriptionById(supabase, user.id, id)

    if (transcriptionError || !transcription) {
      return jsonError("Transcription not found", { status: 404, headers: CACHE_HEADERS.NO_CACHE })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let jsonPath = transcription.json_path as string | undefined

    if (!jsonPath) {
      const prefix = `${user.id}/${transcription.audio_id}`
      const { data: listed, error: listErr } = await supabaseAdmin.storage
        .from("transcriptions")
        .list(prefix, {
          limit: 100,
          sortBy: { column: "name", order: "desc" },
        })

      if (!listErr && listed && listed.length > 0) {
        jsonPath = `${prefix}/${listed[0].name}`
      } else {
        jsonPath = `${user.id}/${transcription.audio_id}.json`
      }
    }

    let editedTextFromJson: string | undefined
    let segmentsFromJson: TranscriptionJsonData["segments"]
    let speakersFromJson: TranscriptionJsonData["speakers"]
    let updatedAtFromJson: string | undefined

    const { data: fileData } = await supabaseAdmin.storage
      .from("transcriptions")
      .download(jsonPath)

    if (fileData) {
      const text = await fileData.text()
      try {
        const parsed = JSON.parse(text)
        editedTextFromJson = parsed.text
        segmentsFromJson = parsed.segments
        speakersFromJson = parsed.speakers
        updatedAtFromJson = parsed.updated_at
      } catch {
        // ignore parse issues, we'll fallback to DB columns
      }
    }

    const responseTranscription = {
      id: transcription.id,
      audioId: transcription.audio_id,
      jsonPath,
      originalText: transcription.original_text,
      editedText: editedTextFromJson ?? transcription.edited_text ?? transcription.original_text,
      segments: segmentsFromJson ?? transcription.segments ?? [],
      speakers: speakersFromJson ?? transcription.speakers ?? [],
      createdAt: transcription.created_at,
      updatedAt: updatedAtFromJson ?? transcription.updated_at,
    }

    return jsonOk({ success: true, transcription: responseTranscription }, { headers: CACHE_HEADERS.NO_CACHE })
  } catch (error) {
    console.error("Error fetching transcription:", error)
    return jsonError("Failed to fetch transcription", { status: 500, headers: CACHE_HEADERS.NO_CACHE })
  }
}
