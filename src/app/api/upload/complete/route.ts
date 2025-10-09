import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

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
          // Check and deduct tokens before starting transcription
          console.log(`💰 Checking tokens for user: ${user.id}`);
          const { data: tokenResult, error: tokenError } = await supabase.rpc(
            "start_transcription",
            {
              p_user_id: user.id,
              p_audio_id: audioId,
              p_token_cost: 1
            }
          );

          if (tokenError || !tokenResult?.success) {
            console.error("Token deduction failed:", tokenError || tokenResult?.error);
            const errorMessage = tokenResult?.error || tokenError?.message || "Failed to process transcription";
            
            // Handle specific error cases
            if (errorMessage.includes("Insufficient tokens")) {
              return NextResponse.json(
                { 
                  success: false, 
                  error: "Tokens insuficients. Si us plau, compra més tokens per continuar.",
                  remaining_tokens: tokenResult?.remaining_tokens || 0
                },
                { status: 402 } // Payment Required
              );
            }
            
            return NextResponse.json(
              { success: false, error: errorMessage },
              { status: 400 }
            );
          }

          console.log(`✅ Tokens deducted successfully. Remaining: ${tokenResult.remaining_tokens}`);

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
            // Send job to Cloudflare Worker
            console.log(`Sending job to worker: ${workerUrl}/transcribe-direct`);
            // add log of the payload
            console.log(`Payload: ${JSON.stringify({
                jobId: jobData.job_id,
                userId: user.id,
                audioId: audioId,
                filename: audioRecord.filename,
                originalName: audioRecord.filename,
                filePath: audioRecord.storage_path,
              })}`);
            const workerResponse = await fetch(`${workerUrl}/transcribe-direct`, {
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
            });

            if (!workerResponse.ok) {
              console.error("Failed to send job to worker:", await workerResponse.text());
              // Don't fail the upload, just log the error
            }
          }
        } catch (workerError) {
          console.error("Error communicating with worker:", workerError);
          // Don't fail the upload, just log the error
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