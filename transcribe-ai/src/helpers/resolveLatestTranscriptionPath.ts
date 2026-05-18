// resolveLatestTranscriptionPath.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export async function resolveLatestTranscriptionPath(
  supabase: SupabaseClient,
  userId: string,
  audioId: string
): Promise<string> {
  // 1) Try DB pointer
  const { data: row } = await supabase
    .from("transcriptions")
    .select("json_path")
    .eq("audio_id", audioId)
    .eq("user_id", userId)
    .single();

  if (row?.json_path) return row.json_path as string;

  // 2) Fallback: list the versioned folder and take the latest
  const prefix = `${userId}/${audioId}`;
  const { data: entries } = await supabase.storage
    .from("transcriptions")
    .list(prefix, {
      limit: 100,
      sortBy: { column: "name", order: "desc" }, // filenames are timestamps
    });

  if (entries && entries.length > 0) {
    return `${prefix}/${entries[0].name}`;
  }

  // 3) Legacy path fallback
  return `${userId}/${audioId}.json`;
}
