import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
// Removed inline Replicate/OpenAI processing and local in-memory queue (migrated to Cloudflare Workers)
import { performanceMonitor } from '@/lib/performance';
import { createHash } from "crypto";

const CF_INGEST_URL = process.env.CLOUDFLARE_INGEST_URL;
const CF_INGEST_API_KEY = process.env.CLOUDFLARE_INGEST_API_KEY;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let success = true;
  let userId: string | undefined;

  try {
    // Create Supabase client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication required. Please sign in." },
        { status: 401 }
      );
    }

    userId = user.id;

    const {
      audioId,
      filename,
      originalName,
      filePath,
      provider = "openai",
    } = await request.json();

    if (!audioId) {
      return NextResponse.json(
        {
          success: false,
          error: "Audio ID is required",
        },
        { status: 400 }
      );
    }

    console.log(`🔄 Processing transcription for audioId: ${audioId}`);
    // Legacy inline processing path removed (migrated to Cloudflare Workers)

    // New ingestion path: if Cloudflare Worker ingest URL is configured, create durable job and forward to Worker
    if (CF_INGEST_URL) {
      const idempotencyKey = createHash("sha256")
        .update(`${userId}:${audioId}:${filePath || ''}:${originalName || filename || ''}`)
        .digest("hex");

      const { data: jobResult, error: jobErr } = await supabase.rpc(
        "upsert_transcription_job",
        {
          p_user_id: userId,
          p_audio_id: audioId,
          p_idempotency_key: idempotencyKey,
          p_provider: provider,
        }
      );

      if (jobErr || !jobResult?.success) {
        console.error("Job upsert error:", jobErr || jobResult?.error);
        return NextResponse.json(
          { success: false, error: "Failed to create transcription job" },
          { status: 500 }
        );
      }

      const jobId = jobResult.job_id;

      // Forward to Cloudflare Worker
      try {
        // Use direct endpoint for Workers AI, queue endpoint for Replicate
        const endpoint = provider === "workers-ai" ? "/transcribe-direct" : "/ingest";
        const baseUrl = CF_INGEST_URL.replace(/\/ingest$/, "");
        const targetUrl = `${baseUrl}${endpoint}`;

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (CF_INGEST_API_KEY) {
          headers["Authorization"] = `Bearer ${CF_INGEST_API_KEY}`;
        }
        const res = await fetch(targetUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({
            jobId,
            userId,
            audioId,
            filename,
            originalName,
            filePath,
            provider,
          }),
        });
        if (!res.ok) {
          const text = await res.text();
          console.error("Cloudflare processing failed:", res.status, text);
          return NextResponse.json(
            { success: false, error: "Failed to process transcription" },
            { status: 502 }
          );
        }
      } catch (err) {
        console.error("Cloudflare processing error:", err);
        return NextResponse.json(
          { success: false, error: "Failed to process transcription" },
          { status: 502 }
        );
      }

      const message = provider === "workers-ai" 
        ? "Transcription processed successfully" 
        : "Transcription queued successfully";

      return NextResponse.json({
        success: true,
        message,
        jobId,
        status: "pending",
      });
    }

    // Legacy fallback removed: Cloudflare ingest must be configured; otherwise return error
    return NextResponse.json(
      { success: false, error: 'Cloudflare ingest not configured' },
      { status: 500 }
    );

  } catch (error) {
    success = false;
    console.error("Transcribe API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    performanceMonitor.logRequest('/api/transcribe', startTime, success, userId);
  }
}
