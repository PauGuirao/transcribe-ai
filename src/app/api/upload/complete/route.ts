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
        { success: false, error: "Authentication required. Please sign in." },
        { status: 401 }
      );
    }

    const { audioId, autoTranscribe = true } = await request.json();

    // Update audio record status to 'uploaded'
    const { data: audioRecord, error: updateError } = await supabase
      .from("audios")
      .update({ status: "uploaded" })
      .eq("id", audioId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError || !audioRecord) {
      console.error("Database update error:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update audio record" },
        { status: 500 }
      );
    }

    // Start transcription process (async) if requested
    if (autoTranscribe) {
      const transcribeUrl = `${request.nextUrl.origin}/api/transcribe`;
      const cookieHeader = request.headers.get("cookie");

      fetch(transcribeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cookieHeader && { Cookie: cookieHeader }),
        },
        body: JSON.stringify({
          audioId,
          filename: audioRecord.filename,
          originalName: audioRecord.original_filename,
          filePath: audioRecord.storage_path,
          provider: "workers-ai",
        }),
      })
        .then((response) => {
          console.log(
            "Transcription request sent, response status:",
            response.status
          );
          return response.json();
        })
        .then((data) => {
          console.log("Transcription response:", data);
        })
        .catch((error) => {
          console.error("Failed to start transcription:", error);
        });
    }

    return NextResponse.json({
      success: true,
      audioId,
      filename: audioRecord.filename,
      filePath: audioRecord.storage_path,
      originalName: audioRecord.original_filename,
      autoTranscribe,
      message: autoTranscribe
        ? "Archivo subido y transcripción iniciada correctamente."
        : "Archivo subido. Inicia la transcripción cuando estés listo.",
    });

  } catch (error) {
    console.error("Upload completion error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to complete upload" },
      { status: 500 }
    );
  }
}