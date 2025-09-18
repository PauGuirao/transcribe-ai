import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

const ALLOWED_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/mp4",
  "audio/ogg",
  "audio/webm",
  "audio/x-m4a",
];

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

    const formData = await request.formData();
    const file = formData.get("audio") as File;
    const autoTranscribe = false;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file type. Please upload an audio file.",
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "File too large. Maximum size is 25MB." },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExtension = file.name.split(".").pop() || "audio";
    const uniqueFilename = `${uuidv4()}.${fileExtension}`;
    const audioId = uniqueFilename.split(".")[0];

    // Upload file to Supabase Storage
    const bytes = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("audio-files")
      .upload(`${user.id}/${uniqueFilename}`, bytes, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json(
        { success: false, error: "Failed to upload file to storage" },
        { status: 500 }
      );
    }

    // Insert audio record into database
    const { data: audioRecord, error: dbError } = await supabase
      .from("audios")
      .insert({
        id: audioId,
        user_id: user.id,
        filename: uniqueFilename,
        original_filename: file.name,
        file_size: file.size,
        duration: null,
        mime_type: file.type,
        storage_path: uploadData.path,
        status: "uploaded",
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database insert error:", dbError);
      // Clean up uploaded file if database insert fails
      await supabase.storage.from("audio-files").remove([uploadData.path]);

      return NextResponse.json(
        { success: false, error: "Failed to save audio record" },
        { status: 500 }
      );
    }
    console.log("Audio record saved successfully:", audioRecord);

    // Start transcription process (async)
    if (autoTranscribe) {
      const transcribeUrl = `${request.nextUrl.origin}/api/transcribe`;
      console.log("Transcribe URL:", transcribeUrl);
      console.log("Starting transcription for audioId:", audioId);
      console.log("Transcribe URL:", transcribeUrl);
      const cookieHeader = request.headers.get("cookie");

      fetch(transcribeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cookieHeader && { Cookie: cookieHeader }),
        },
        body: JSON.stringify({
          audioId,
          filename: uniqueFilename,
          originalName: file.name,
          filePath: uploadData.path,
          provider: "replicate",
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
      filename: uniqueFilename,
      filePath: uploadData.path,
      originalName: file.name,
      autoTranscribe,
      message: autoTranscribe
        ? "Archivo subido y transcripción iniciada correctamente."
        : "Archivo subido. Inicia la transcripción cuando estés listo.",
    });
  } catch (error) {
    console.error("Upload error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
