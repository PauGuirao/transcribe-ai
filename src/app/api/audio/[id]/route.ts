import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { resolveLatestTranscriptionPath } from "@/helpers/resolveLatestTranscriptionPath";
import { cookies } from "next/headers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // Fetch the specific audio file
    const { data: audioFile, error: audioError } = await supabase
      .from("audios")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (audioError || !audioFile) {
      return NextResponse.json(
        { success: false, error: "Audio file not found" },
        { status: 404 }
      );
    }

    // Fetch existing alumne assignment if any
    let alumneId: string | null = null;
    const { data: alumneRows } = await supabase
      .from("transcriptions")
      .select("alumne_id")
      .eq("audio_id", audioFile.id)
      .eq("user_id", user.id)
      .limit(1);

    if (alumneRows && alumneRows.length > 0) {
      alumneId = alumneRows[0].alumne_id ?? null;
    }

    // Fetch transcription data from Storage bucket JSON file
    let transformedTranscription = null;

    if (audioFile.status === "completed") {
      try {
        const path = await resolveLatestTranscriptionPath(
          supabase,
          user.id,
          audioFile.id
        );
        // Add timestamp to force cache refresh
        const { data: jsonData, error: storageError } = await supabase.storage
          .from("transcriptions")
          .download(path);

        if (!storageError && jsonData) {
          const jsonText = await jsonData.text();
          const transcriptionData = JSON.parse(jsonText);

          transformedTranscription = {
            id: audioFile.id, // Using audio ID as transcription ID
            audioId: audioFile.id,
            originalText: transcriptionData.text || "",
            editedText: transcriptionData.text || "", // For now, same as original
            segments: transcriptionData.segments || [],
            speakers:
              transcriptionData.speakers &&
              transcriptionData.speakers.length > 0
                ? transcriptionData.speakers
                : [
                    {
                      id: "speaker-logopeda",
                      name: "Logopeda",
                      color: "#3B82F6",
                    },
                    {
                      id: "speaker-alumne",
                      name: "Alumne",
                      color: "#EF4444",
                    },
                  ],
            alumneId,
            createdAt: audioFile.created_at,
            updatedAt: audioFile.updated_at,
          };
        } else {
          console.log(
            `No transcription JSON found for audio ${audioFile.id}:`,
            storageError
          );
        }
      } catch (error) {
        console.error(
          `Error fetching transcription JSON for audio ${audioFile.id}:`,
          error
        );
      }
    }

    const audio = {
      id: audioFile.id,
      filename: audioFile.filename,
      originalName: audioFile.original_filename,
      customName: audioFile.custom_name,
      fileId: audioFile.id, // Using audio id as fileId for compatibility
      uploadDate: audioFile.created_at,
      status: audioFile.status,
      transcription: transformedTranscription,
    };

    return NextResponse.json({
      success: true,
      audio,
      transcription: transformedTranscription,
    });
  } catch (error) {
    console.error("Error fetching audio:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch audio" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // First, fetch the audio file to get the filename
    const { data: audioFile, error: fetchError } = await supabase
      .from("audios")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !audioFile) {
      return NextResponse.json(
        { success: false, error: "Audio file not found" },
        { status: 404 }
      );
    }

    // Delete the audio file from storage
    const { error: storageError } = await supabase.storage
      .from("audio-files")
      .remove([`${user.id}/${audioFile.filename}`]);

    if (storageError) {
      console.error("Error deleting from storage:", storageError);
    }

    // Delete associated transcription files if they exist
    const { data: files, error: listError } = await supabase.storage
      .from("transcriptions")
      .list(`${user.id}/${audioFile.id}`);

    if (!listError && files) {
      for (const file of files) {
        await supabase.storage
          .from("transcriptions")
          .remove([`${user.id}/${audioFile.id}/${file.name}`]);
      }
    }

    // Delete the audio record from the database
    const { error: deleteError } = await supabase
      .from("audios")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: "Failed to delete audio file" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting audio:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete audio" },
      { status: 500 }
    );
  }
}
