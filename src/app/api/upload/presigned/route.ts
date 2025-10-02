import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";

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

    const { fileName, fileType, fileSize } = await request.json();

    // Validate file type
    if (!ALLOWED_TYPES.includes(fileType)) {
      return NextResponse.json(
        { success: false, error: "Tipus de fitxer no permès." },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExtension = fileName.split(".").pop() || "audio";
    const uniqueFilename = `${uuidv4()}.${fileExtension}`;
    const filePath = `${user.id}/${uniqueFilename}`;

    // Create presigned URL for upload
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("audio-files")
      .createSignedUploadUrl(filePath, {
        upsert: false,
      });

    if (uploadError) {
      console.error("Presigned URL error:", uploadError);
      return NextResponse.json(
        { success: false, error: "Failed to create upload URL" },
        { status: 500 }
      );
    }

    // Pre-create audio record in database with 'uploaded' status
    const audioId = uniqueFilename.split(".")[0];
    const { data: audioRecord, error: dbError } = await supabase
      .from("audios")
      .insert({
        id: audioId,
        user_id: user.id,
        filename: uniqueFilename,
        original_filename: fileName,
        file_size: fileSize,
        duration: null,
        mime_type: fileType,
        storage_path: filePath,
        status: "uploaded",
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database insert error:", dbError);
      return NextResponse.json(
        { success: false, error: "Failed to create audio record" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      uploadUrl: uploadData.signedUrl,
      token: uploadData.token,
      path: uploadData.path,
      audioId,
      filename: uniqueFilename,
      originalName: fileName,
    });

  } catch (error) {
    console.error("Presigned URL creation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create upload URL" },
      { status: 500 }
    );
  }
}