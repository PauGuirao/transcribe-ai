import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000; // 1 second

/**
 * Retry a fetch request with exponential backoff
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Don't retry on client errors (4xx), only on server errors (5xx) or network issues
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      // Server error - will retry
      lastError = new Error(`Server error: ${response.status}`);
      console.warn(`[RETRY] Attempt ${attempt + 1}/${maxRetries} failed with status ${response.status}`);
    } catch (error) {
      // Network error - will retry
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[RETRY] Attempt ${attempt + 1}/${maxRetries} failed:`, error);
    }

    // Wait before retrying (exponential backoff)
    if (attempt < maxRetries - 1) {
      const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
      console.log(`[RETRY] Waiting ${backoffMs}ms before retry...`);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  throw lastError || new Error('All retry attempts failed');
}

export async function POST(request: NextRequest) {
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
        { success: false, error: "Autenticació requerida. Si us plau, inicia sessió." },
        { status: 401 }
      );
    }

    const { audioId, autoTranscribe } = await request.json();

    if (!audioId) {
      return NextResponse.json(
        { success: false, error: "L'ID de l'àudio és obligatori" },
        { status: 400 }
      );
    }

    // Verify the audio record exists and belongs to the user
    const { data: audioRecord, error: audioError } = await supabase
      .from("audios")
      .select("id, user_id, filename, storage_path, status")
      .eq("id", audioId)
      .eq("user_id", user.id)
      .single();

    if (audioError || !audioRecord) {
      return NextResponse.json(
        { success: false, error: "No s'ha trobat la informació de l'àudio" },
        { status: 404 }
      );
    }

    // Update audio status to 'processing' if autoTranscribe is enabled
    if (autoTranscribe) {
      const { error: updateError } = await supabase
        .from("audios")
        .update({ status: "processing" })
        .eq("id", audioId)
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Failed to update audio status:", updateError);
        return NextResponse.json(
          { success: false, error: "Error en actualitzar l'estat de l'àudio" },
          { status: 500 }
        );
      }

      // If we have a Cloudflare Worker endpoint configured, trigger transcription
      const workerUrl = process.env.CLOUDFLARE_INGEST_URL;
      const ingestApiKey = process.env.CLOUDFLARE_INGEST_API_KEY;

      if (workerUrl && ingestApiKey) {
        try {
          // Create an idempotency key for this transcription job
          const idempotencyKey = `${user.id}:${audioId}:${audioRecord.filename}:workers_ai`;
          
          // Create a transcription job
          const { data: jobData, error: jobError } = await supabase
            .rpc('upsert_transcription_job', {
              p_user_id: user.id,
              p_audio_id: audioId,
              p_idempotency_key: idempotencyKey,
              p_provider: 'workers_ai'
            });

          if (jobError) {
            console.error("Failed to create transcription job:", jobError);
          } else if (jobData?.job_id) {
            console.log(`Successfully created transcription job with ID: ${jobData.job_id}`);

            try {
              // Use retry logic for worker communication
              const workerResponse = await fetchWithRetry(
                `${workerUrl}/transcribe-direct`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ingestApiKey}`,
                  },
                  body: JSON.stringify({
                    jobId: jobData.job_id,
                    userId: user.id,
                    audioId: audioId,
                    filename: audioRecord.filename,
                    originalName: audioRecord.filename,
                    filePath: audioRecord.storage_path,
                  }),
                },
                MAX_RETRIES
              );

              if (!workerResponse.ok) {
                const errorText = await workerResponse.text();
                console.error("Failed to send job to worker after retries:", errorText);
                // Update audio status to error if transcription failed
                await supabase
                  .from("audios")
                  .update({ status: "error" })
                  .eq("id", audioId)
                  .eq("user_id", user.id);
              }
            } catch (retryError) {
              console.error("All retry attempts failed:", retryError);
              // Update audio status to error
              await supabase
                .from("audios")
                .update({ status: "error" })
                  .eq("id", audioId)
                .eq("user_id", user.id);
            }
          }
        } catch (workerError) {
          console.error("Error communicating with worker:", workerError);
          // Update audio status to indicate error
          await supabase
            .from("audios")
            .update({ status: "error" })
            .eq("id", audioId)
            .eq("user_id", user.id);
        }
      }
    } else {
      // If not auto-transcribing, just mark as completed
      const { error: updateError } = await supabase
        .from("audios")
        .update({ status: "completed" })
        .eq("id", audioId)
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Failed to update audio status:", updateError);
        return NextResponse.json(
          { success: false, error: "Error en actualitzar l'estat de l'àudio" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      audioId,
      status: autoTranscribe ? "processing" : "completed",
      message: autoTranscribe ? "Pujada completada, transcripció iniciada" : "Pujada completada"
    });

  } catch (error) {
    console.error("Upload completion error:", error);
    return NextResponse.json(
      { success: false, error: "Error en completar la pujada" },
      { status: 500 }
    );
  }
}