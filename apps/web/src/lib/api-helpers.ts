import { NextResponse } from "next/server";
import { createOptimizedSupabaseClient } from "@/lib/database-optimized";

export type JsonOk<T> = { success: true; data: T };
export type JsonError = { success: false; error: string };

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data } satisfies JsonOk<T>, init);
}

export function jsonError(message: string, init?: ResponseInit) {
  return NextResponse.json({ success: false, error: message } satisfies JsonError, init);
}

export async function getAuth() {
  const supabase = await createOptimizedSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { supabase, user, error } as const;
}

export function buildWorkerUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_CLOUDFLARE_WORKER_URL || "https://transcribe-worker.guiraocastells.workers.dev";
  const parts = path.split("/");
  const userId = parts[0];
  if (parts.length === 3) {
    const audioId = parts[1];
    const filename = parts[2];
    return `${base}/download/transcriptions/${userId}/${audioId}/${filename}`;
  } else {
    const filename = parts[parts.length - 1];
    return `${base}/download/transcriptions/${userId}/${filename}`;
  }
}

export function getAudioContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "mp3":
      return "audio/mpeg";
    case "wav":
      return "audio/wav";
    case "m4a":
      return "audio/mp4";
    case "ogg":
      return "audio/ogg";
    case "webm":
      return "audio/webm";
    default:
      return "audio/mpeg";
  }
}