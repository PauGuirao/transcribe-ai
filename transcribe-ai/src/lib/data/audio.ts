import type { SupabaseClient } from "@supabase/supabase-js"

export const AUDIO_META_SELECT = "filename, storage_path, mime_type"

export interface AudioMetaRow {
  filename: string
  storage_path: string | null
  mime_type: string | null
}

export async function getAudioMeta(
  supabase: SupabaseClient,
  userId: string,
  audioId: string
): Promise<{ data: AudioMetaRow | null; error: any | null }> {
  const { data, error } = await supabase
    .from("audios")
    .select(AUDIO_META_SELECT)
    .eq("id", audioId)
    .eq("user_id", userId)
    .single()

  return { data, error }
}

export async function getAudioById(
  supabase: SupabaseClient,
  userId: string,
  audioId: string
): Promise<{ data: any | null; error: any | null }> {
  const { data, error } = await supabase
    .from("audios")
    .select("*")
    .eq("id", audioId)
    .eq("user_id", userId)
    .single()

  return { data, error }
}

export async function getAlumneIdForAudio(
  supabase: SupabaseClient,
  userId: string,
  audioId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("transcriptions")
    .select("alumne_id")
    .eq("audio_id", audioId)
    .eq("user_id", userId)
    .limit(1)

  if (data && data.length > 0) {
    return data[0].alumne_id ?? null
  }
  return null
}