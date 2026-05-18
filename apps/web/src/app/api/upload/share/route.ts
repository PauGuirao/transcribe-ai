import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createHash } from "crypto";

const CF_INGEST_URL = process.env.CLOUDFLARE_INGEST_URL;
const CF_INGEST_API_KEY = process.env.CLOUDFLARE_INGEST_API_KEY;

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB (will be compressed client-side if needed)

const ALLOWED_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/mp4",
  "audio/ogg",
  "audio/webm",
  "audio/x-m4a",
  "audio/flac",
  "audio/aac",
  "audio/x-ms-wma",
  "audio/aiff",
  "audio/mp3",
  "audio/m4a",
];

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client for auth only
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
      // For shared files, redirect to login with return URL
      const loginUrl = new URL('/auth/signin', request.url);
      loginUrl.searchParams.set('redirectedFrom', '/dashboard');
      loginUrl.searchParams.set('message', 'Inicia sessió per pujar el fitxer compartit');

      return NextResponse.redirect(loginUrl);
    }

    // Get session for worker auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      const loginUrl = new URL('/auth/signin', request.url);
      loginUrl.searchParams.set('redirectedFrom', '/dashboard');
      loginUrl.searchParams.set('message', 'Sessió expirada. Inicia sessió de nou.');
      return NextResponse.redirect(loginUrl);
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const text = formData.get("text") as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No s'ha proporcionat cap fitxer" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Tipus de fitxer no vàlid. Si us plau, puja un fitxer d'àudio.",
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "Fitxer massa gran. La mida màxima és 50MB." },
        { status: 400 }
      );
    }

    // Upload to Cloudflare R2 via Worker
    const workerUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_WORKER_URL || 'https://transcribe-worker.guiraocastells.workers.dev';

    const workerFormData = new FormData();
    workerFormData.append('file', file);
    workerFormData.append('originalFilename', file.name);

    const workerResponse = await fetch(`${workerUrl}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: workerFormData,
    });

    if (!workerResponse.ok) {
      const errorData = await workerResponse.json().catch(() => ({}));
      console.error("Worker upload error:", errorData);
      return NextResponse.json(
        { success: false, error: errorData.error || "Error en pujar el fitxer" },
        { status: 500 }
      );
    }

    const uploadResult = await workerResponse.json();

    if (!uploadResult.success) {
      return NextResponse.json(
        { success: false, error: uploadResult.error || "Error en pujar el fitxer" },
        { status: 500 }
      );
    }

    const audioId = uploadResult.audioId;
    const filePath = uploadResult.filePath;

    // Automatically start transcription using Cloudflare worker
    try {
      console.log(`🔄 Auto-starting transcription for shared audio: ${audioId}`);
      
      // Check and deduct tokens before starting transcription
      const { data: tokenResult, error: tokenError } = await supabase.rpc(
        "start_transcription",
        {
          p_user_id: user.id,
          p_audio_id: audioId,
          p_token_cost: 1
        }
      );

      if (tokenError || !tokenResult?.success) {
        console.error("Token deduction failed for shared audio:", tokenError || tokenResult?.error);
        // Don't fail the upload, just log the error and redirect without transcription
        const dashboardUrl = new URL('/dashboard', request.url);
        dashboardUrl.searchParams.set('uploaded', audioId);
        dashboardUrl.searchParams.set('message', 'Fitxer pujat correctament, però no s\'ha pogut iniciar la transcripció automàticament.');
        dashboardUrl.searchParams.set('error', 'insufficient_tokens');
        return NextResponse.redirect(dashboardUrl);
      }

      // Update audio status to processing
      await supabase
        .from("audios")
        .update({ status: "processing" })
        .eq("id", audioId);

      // Use Cloudflare worker for transcription (same as desktop)
      if (CF_INGEST_URL) {
        const idempotencyKey = createHash("sha256")
          .update(`${user.id}:${audioId}:${filePath}:${file.name}`)
          .digest("hex");

        const { data: jobResult, error: jobErr } = await supabase.rpc(
          "upsert_transcription_job",
          {
            p_user_id: user.id,
            p_audio_id: audioId,
            p_idempotency_key: idempotencyKey,
            p_provider: "openai",
          }
        );

        if (jobErr || !jobResult?.success) {
          console.error("Job upsert error:", jobErr || jobResult?.error);
          const dashboardUrl = new URL('/dashboard', request.url);
          dashboardUrl.searchParams.set('uploaded', audioId);
          dashboardUrl.searchParams.set('message', 'Fitxer pujat correctament, però no s\'ha pogut crear el treball de transcripció.');
          return NextResponse.redirect(dashboardUrl);
        }

        const jobId = jobResult.job_id;

        // Forward to Cloudflare Worker
        try {
          const endpoint = "/ingest"; // Using queue endpoint for shared audio
          const baseUrl = CF_INGEST_URL.replace(/\/ingest$/, "");
          const targetUrl = `${baseUrl}${endpoint}`;

          const headers: Record<string, string> = {
            "Content-Type": "application/json",
          };
          if (CF_INGEST_API_KEY) {
            headers["Authorization"] = `Bearer ${CF_INGEST_API_KEY}`;
          }

          console.log(`Sending shared audio job to worker: ${targetUrl}`);
          console.log(`Payload: ${JSON.stringify({
            jobId: jobId,
            userId: user.id,
            audioId: audioId,
            filename: uploadResult.filename,
            originalName: file.name,
            filePath: filePath,
            provider: "openai"
          })}`);

          const res = await fetch(targetUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({
              jobId,
              userId: user.id,
              audioId,
              filename: uploadResult.filename,
              originalName: file.name,
              filePath,
              provider: "openai",
            }),
          });

          if (!res.ok) {
            const text = await res.text();
            console.error("Cloudflare processing failed:", res.status, text);
            const dashboardUrl = new URL('/dashboard', request.url);
            dashboardUrl.searchParams.set('uploaded', audioId);
            dashboardUrl.searchParams.set('message', 'Fitxer pujat correctament, però no s\'ha pogut processar la transcripció.');
            return NextResponse.redirect(dashboardUrl);
          }

          console.log(`✅ Transcription queued successfully for shared audio: ${audioId}`);
          // Redirect to transcription page
          const transcribeUrl = new URL('/transcribe', request.url);
          transcribeUrl.searchParams.set('audioId', audioId);
          transcribeUrl.searchParams.set('message', 'Fitxer pujat i transcripció iniciada automàticament!');
          return NextResponse.redirect(transcribeUrl);

        } catch (cfError) {
          console.error("Cloudflare processing error:", cfError);
          const dashboardUrl = new URL('/dashboard', request.url);
          dashboardUrl.searchParams.set('uploaded', audioId);
          dashboardUrl.searchParams.set('message', 'Fitxer pujat correctament, però no s\'ha pogut processar la transcripció.');
          return NextResponse.redirect(dashboardUrl);
        }
      } else {
        console.error("Cloudflare ingest not configured");
        const dashboardUrl = new URL('/dashboard', request.url);
        dashboardUrl.searchParams.set('uploaded', audioId);
        dashboardUrl.searchParams.set('message', 'Fitxer pujat correctament, però la transcripció no està configurada.');
        return NextResponse.redirect(dashboardUrl);
      }

    } catch (transcriptionError) {
      console.error("Error starting automatic transcription:", transcriptionError);
      // Redirect to dashboard with upload success but transcription failure
      const dashboardUrl = new URL('/dashboard', request.url);
      dashboardUrl.searchParams.set('uploaded', audioId);
      dashboardUrl.searchParams.set('message', 'Fitxer pujat correctament, però no s\'ha pogut iniciar la transcripció automàticament.');
      return NextResponse.redirect(dashboardUrl);
    }

  } catch (error) {
    console.error("Share upload error:", error);
    return NextResponse.json(
      { success: false, error: "Error intern del servidor" },
      { status: 500 }
    );
  }
}

// Handle GET requests for the share target (fallback)
export async function GET(request: NextRequest) {
  // Redirect to dashboard if accessed directly
  const dashboardUrl = new URL('/dashboard', request.url);
  return NextResponse.redirect(dashboardUrl);
}