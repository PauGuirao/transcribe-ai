import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

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
      return NextResponse.json(
        { success: false, error: "Autenticació requerida. Si us plau, inicia sessió." },
        { status: 401 }
      );
    }

    // Get session for worker auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return NextResponse.json(
        { success: false, error: "Sessió requerida" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("audio") as File;
    const autoTranscribe = false;

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
        { status: workerResponse.status }
      );
    }

    const workerResult = await workerResponse.json();

    if (!workerResult.success) {
      return NextResponse.json(
        { success: false, error: workerResult.error || "Error en pujar el fitxer" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      audioId: workerResult.audioId,
      filename: workerResult.filename,
      filePath: workerResult.filePath,
      originalName: workerResult.originalName,
      autoTranscribe,
      message: autoTranscribe
        ? "Fitxer pujat i transcripció iniciada correctament."
        : "Fitxer pujat. Inicia la transcripció quan estiguis llest.",
    });
  } catch (error) {
    console.error("Upload error:", error);

    return NextResponse.json(
      { success: false, error: "Error en pujar el fitxer" },
      { status: 500 }
    );
  }
}
