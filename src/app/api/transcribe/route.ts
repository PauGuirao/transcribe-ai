import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import Replicate from "replicate";
import { transcribeAudioWithTimestamps } from "@/lib/openai";
import { transcriptionQueue } from '@/lib/queue';
import { performanceMonitor, withPerformanceTracking } from '@/lib/performance';
const replicateToken = process.env.REPLICATE_API_TOKEN;

if (!replicateToken) {
  throw new Error("Missing REPLICATE_API_TOKEN environment variable");
}

const replicate = new Replicate({ auth: replicateToken });
const replicateWhisperVersion =
  process.env.REPLICATE_WHISPER_VERSION ??
  "openai/whisper:8099696689d249cf8b122d833c36ac3f75505c666a395ca40ef26f68e7d3d16e";

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
      queueId,
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
    // If this is a queued request, process immediately
    if (queueId) {
      console.log(`🔄 Processing queued transcription for audioId: ${audioId}`);
      return await processTranscription(audioId, filename, originalName, filePath, provider, user.id, supabase);
    }

    // For new requests, add to queue
    const queueItemId = `transcribe_${audioId}_${Date.now()}`;
    console.log(`🔄 Adding transcription to queue with ID: ${queueItemId}`);
    
    transcriptionQueue.add({
      id: queueItemId,
      audioId,
      userId: user.id,
      filename,
      originalName,
      filePath,
      provider,
      priority: 1,
      maxRetries: 3,
    });
    console.log(`🔄 Transcription added to queue with ID: ${queueItemId}`);

    return NextResponse.json({ 
      message: 'Transcription queued successfully',
      queueId: queueItemId,
      position: transcriptionQueue.getPosition(queueItemId),
      status: transcriptionQueue.getQueueStatus()
    });

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

export async function processTranscription(
  audioId: string,
  filename: string,
  originalName: string,
  filePath: string,
  provider: string,
  userId: string,
  supabase: any
) {
  try {

    if (!filename || !filePath) {
      return NextResponse.json(
        {
          success: false,
          error: "Filename and filePath are required",
        },
        { status: 400 }
      );
    }

    const TOKEN_COST = 1;

    const { data: remainingTokens, error: tokenError } = await supabase.rpc(
      "decrement_tokens",
      {
        user_id: userId,
        amount: TOKEN_COST,
      }
    );

    if (tokenError || typeof remainingTokens !== "number") {
      console.error("Token deduction error:", tokenError);
      return NextResponse.json(
        {
          success: false,
          error:
            tokenError?.message ||
            "No cuentas con tokens suficientes para transcribir más audios.",
        },
        { status: 402 }
      );
    }

    try {
      await supabase
        .from("audios")
        .update({ status: "processing" })
        .eq("id", audioId)
        .eq("user_id", userId);

      const { data: audioData, error: downloadError } = await supabase.storage
        .from("audio-files")
        .download(filePath);

      if (downloadError || !audioData) {
        console.error("Download error:", downloadError);
        throw new Error("Failed to download audio file from storage");
      }

      const audioBuffer = await audioData.arrayBuffer();
      const audioFile = new File([audioBuffer], originalName || filename, {
        type: getContentType(originalName || filename),
      });
      
      console.log(`🔄 Processing audio file: ${originalName || filename}`);
      if (provider === "replicate") {
        const buffer = Buffer.from(audioBuffer);
        const contentType = getContentType(originalName || filename);
        const audioDataUrl = `data:${contentType};base64,${buffer.toString(
          "base64"
        )}`;
        // Use the correct production URL for webhooks
        const origin = 'https://www.transcriu.com';

        const webhookUrl = `${origin}/api/replicate/webhook`;
        console.log("=== REPLICATE WEBHOOK CONFIG ===");
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          origin,
          webhookUrl,
          vercelUrl: process.env.VERCEL_URL,
          audioId
        }, null, 2));

        const prediction = await replicate.predictions.create({
          version: replicateWhisperVersion,
          input: {
            audio: audioDataUrl,
            language: "auto",
            translate: false,
            temperature: 0,
            transcription: "plain text",
            suppress_tokens: "-1",
            logprob_threshold: -1,
            no_speech_threshold: 0.6,
            condition_on_previous_text: true,
            compression_ratio_threshold: 2.4,
            temperature_increment_on_fallback: 0.2,
          },
          webhook: webhookUrl,
          webhook_events_filter: ["completed"],
        });

        await supabase.from("transcriptions").upsert(
          {
            id: audioId,
            audio_id: audioId,
            user_id: userId,
            status: "processing",
            prediction_id: prediction.id,
          },
          { onConflict: "id" }
        );

        return NextResponse.json({
          success: true,
          audioId,
          predictionId: prediction.id,
          status: "processing",
          remainingTokens,
        });
      }

      const transcriptionResult = await transcribeAudioWithTimestamps(
        audioFile
      );

      const { data: transcriptionRecord, error: transcriptionError } =
        await supabase
          .from("transcriptions")
          .insert({
            id: audioId,
            audio_id: audioId,
            user_id: userId,
            status: "completed",
            provider,
          })
          .select()
          .single();

      if (transcriptionError) {
        console.error(
          "Database transcription insert error:",
          transcriptionError
        );
        throw new Error("Failed to save transcription to database");
      }

      const transcriptionJson = JSON.stringify(transcriptionResult, null, 2);
      console.log("Saving transcription JSON to storage...");

      const { data: jsonUpload, error: jsonUploadError } =
        await supabase.storage
          .from("transcriptions")
          .upload(`${userId}/${audioId}.json`, transcriptionJson, {
            contentType: "application/json",
            upsert: true,
          });

      if (jsonUploadError) {
        console.error("Failed to save JSON to storage:", jsonUploadError);
      } else {
        console.log("JSON saved successfully:", jsonUpload);
      }

      console.log("Saving transcription TXT to storage...");

      const { data: txtUpload, error: txtUploadError } = await supabase.storage
        .from("transcriptions")
        .upload(`${userId}/${audioId}.txt`, transcriptionResult.text, {
          contentType: "text/plain",
          upsert: true,
        });

      if (txtUploadError) {
        console.error("Failed to save TXT to storage:", txtUploadError);
      } else {
        console.log("TXT saved successfully:", txtUpload);
      }

      await supabase
        .from("audios")
        .update({ status: "completed" })
        .eq("id", audioId)
        .eq("user_id", userId);

      return NextResponse.json({
        success: true,
        transcriptionId: audioId,
        originalText: transcriptionResult.text,
        editedText: transcriptionResult.text,
        segments: transcriptionResult.segments,
        audioId: audioId,
        remainingTokens,
      });
    } catch (transcriptionError) {
      console.error("Transcription error:", transcriptionError);

      try {
        // Update audio status to 'error'
        await supabase
          .from("audios")
          .update({ status: "error" })
          .eq("id", audioId)
          .eq("user_id", userId);

        // Save error to database
        const errorMessage =
          transcriptionError instanceof Error
            ? transcriptionError.message
            : "Unknown error";
        await supabase.from("transcriptions").upsert(
          {
            id: audioId,
            audio_id: audioId,
            user_id: userId,
            original_text: "",
            edited_text: "",
            segments: [],
            provider: provider,
            status: "error",
            error_message: errorMessage,
          },
          { onConflict: "id" }
        );

        // Save error to Supabase Storage
        await supabase.storage
          .from("transcriptions")
          .upload(
            `${userId}/${audioId}.error`,
            JSON.stringify({ error: errorMessage }),
            {
              contentType: "application/json",
              upsert: true,
            }
          );
      } catch (errorSaveError) {
        console.error("Failed to save error to Supabase:", errorSaveError);
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to transcribe audio",
          details:
            transcriptionError instanceof Error
              ? transcriptionError.message
              : "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Process transcription error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

function getContentType(filename: string): string {
  const extension = filename.split(".").pop()?.toLowerCase();

  switch (extension) {
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
