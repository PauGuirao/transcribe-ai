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
        { success: false, error: "Autenticació requerida. Si us plau, inicia sessió." },
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
        { success: false, error: "Fitxer massa gran. La mida màxima és 25MB." },
        { status: 400 }
      );
    }

    // Generate unique filename
    let fileExtension = file.name.split(".").pop() || "audio";
    const processedFile = file;
    let processedBytes = await file.arrayBuffer();
    let finalMimeType = file.type;

    // Check if it's an MP4 video file and extract audio
    if (file.type === "video/mp4") {
      let tempFilename = ""; // Declare tempFilename in outer scope
      try {
        console.log("Processing MP4 file for audio extraction...");
        
        // First upload the MP4 to a temporary location for FFmpeg API
        tempFilename = `temp_${uuidv4()}.mp4`;
        const { data: tempUpload, error: tempUploadError } = await supabase.storage
          .from("audio-files")
          .upload(`${user.id}/temp/${tempFilename}`, processedBytes, {
            contentType: file.type,
            upsert: false,
          });

        if (tempUploadError) {
          throw new Error(`Failed to upload temp file: ${tempUploadError.message}`);
        }

        // Get public URL for the temp file
        const { data: { publicUrl } } = supabase.storage
          .from("audio-files")
          .getPublicUrl(`${user.id}/temp/${tempFilename}`);

        // Extract audio using FFmpeg API
        console.log("FFmpeg API request URL:", "https://api.rendi.dev/v1/run-ffmpeg-command");
        const ffmpegResponse = await fetch("https://api.rendi.dev/v1/run-ffmpeg-command", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X_API_KEY": process.env.X_API_KEY || "",
          },
          body: JSON.stringify({
            input_files: {
              in_1: publicUrl
            },
            output_files: {
              out_1: "extracted_audio.m4a"
            },
            ffmpeg_command: "-i {{in_1}} -vn -acodec copy {{out_1}}"
          })
        });

        if (!ffmpegResponse.ok) {
          throw new Error(`FFmpeg API error: ${ffmpegResponse.status}, ${await ffmpegResponse.text()}`);
        }

        const ffmpegResult = await ffmpegResponse.json();
        console.log("FFmpeg API response:", ffmpegResult);
        
        if (!ffmpegResult.command_id) {
          throw new Error("No command_id received from FFmpeg API");
        }

        console.log("FFmpeg command submitted, command_id:", ffmpegResult.command_id);

        // Poll for completion
        let attempts = 0;
        const maxAttempts = 30; // 30 attempts with 2 second intervals = 1 minute max
        let commandResult;

        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          
          const statusResponse = await fetch(`https://api.rendi.dev/v1/commands/${ffmpegResult.command_id}`, {
            method: "GET",
            headers: {
              "X_API_KEY": process.env.X_API_KEY || "",
            }
          });

          if (!statusResponse.ok) {
            throw new Error(`Status check error: ${statusResponse.status}, ${await statusResponse.text()}`);
          }

          commandResult = await statusResponse.json();
          console.log(`Attempt ${attempts + 1}: Status = ${commandResult.status}`);

          if (commandResult.status === "SUCCESS") {
            break;
          } else if (commandResult.status === "FAILED" || commandResult.status === "ERROR") {
            throw new Error(`FFmpeg processing failed with status: ${commandResult.status}`);
          }

          attempts++;
        }

        if (attempts >= maxAttempts) {
          throw new Error("FFmpeg processing timeout - exceeded maximum wait time");
        }
        
        if (commandResult.output_files && commandResult.output_files.out_1 && commandResult.output_files.out_1.storage_url) {
          // Download the extracted audio
          const audioResponse = await fetch(commandResult.output_files.out_1.storage_url);
          if (audioResponse.ok) {
            processedBytes = await audioResponse.arrayBuffer();
            fileExtension = "m4a";
            finalMimeType = "audio/mp4";
            console.log("Successfully extracted audio from MP4");
          } else {
            throw new Error(`Failed to download extracted audio: ${audioResponse.status}`);
          }
        } else {
          throw new Error("No output file URL received from FFmpeg API");
        }

        // Clean up temp file
        console.log(`Attempting to delete temp file: ${user.id}/temp/${tempFilename}`);
        const { data: deleteData, error: deleteError } = await supabase.storage
          .from("audio-files")
          .remove([`${user.id}/temp/${tempFilename}`]);
        
        if (deleteError) {
          console.error("Failed to delete temp file:", deleteError);
        } else {
          console.log("Temp file deleted successfully:", deleteData);
        }

      } catch (error) {
        console.error("Failed to extract audio from MP4:", error);
        
        // Try to clean up temp file even if processing failed (only if tempFilename was set)
        if (tempFilename) {
          console.log(`Attempting to delete temp file after error: ${user.id}/temp/${tempFilename}`);
          try {
            const { data: deleteData, error: deleteError } = await supabase.storage
              .from("audio-files")
              .remove([`${user.id}/temp/${tempFilename}`]);
            
            if (deleteError) {
              console.error("Failed to delete temp file after error:", deleteError);
            } else {
              console.log("Temp file deleted successfully after error:", deleteData);
            }
          } catch (cleanupError) {
            console.error("Error during temp file cleanup:", cleanupError);
          }
        }
        
        // Fall back to storing the original MP4 file
        console.log("Falling back to storing original MP4 file");
      }
    }

    const uniqueFilename = `${uuidv4()}.${fileExtension}`;
    const audioId = uniqueFilename.split(".")[0];

    // Upload processed file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("audio-files")
      .upload(`${user.id}/${uniqueFilename}`, processedBytes, {
        contentType: finalMimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json(
        { success: false, error: "Error en pujar el fitxer a l'emmagatzematge" },
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
        mime_type: finalMimeType,
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
        { success: false, error: "Error en guardar la informació de l'àudio" },
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
      filename: uniqueFilename,
      filePath: uploadData.path,
      originalName: file.name,
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
