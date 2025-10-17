import type { SupabaseClient } from "@supabase/supabase-js"
import type { TranscriptionSegment, Speaker } from "@/types"

export function buildVersionedPath(userId: string, audioId: string) {
  const version = Date.now()
  return `${userId}/${audioId}/${version}.json`
}

export interface TranscriptionJsonData {
  text: string
  segments?: TranscriptionSegment[]
  speakers?: Speaker[]
  updated_at?: string
}

export interface TranscriptionRow {
  id: string
  audio_id: string
  json_path?: string
  original_text?: string
  edited_text?: string
  segments?: TranscriptionSegment[]
  speakers?: Speaker[]
  created_at?: string
  updated_at?: string
}

export async function getTranscriptionById(
  supabase: SupabaseClient,
  userId: string,
  transcriptionId: string
): Promise<{ data: TranscriptionRow | null; error: any | null }> {
  const { data, error } = await supabase
    .from("transcriptions")
    .select(
      `
      id, audio_id, created_at, updated_at, json_path, original_text, edited_text, segments, speakers,
      audios!inner ( user_id )
    `
    )
    .eq("id", transcriptionId)
    .eq("audios.user_id", userId)
    .single()

  return { data: data as TranscriptionRow | null, error }
}