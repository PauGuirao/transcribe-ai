import { NextRequest, NextResponse } from "next/server";
import { resolveLatestTranscriptionPath } from "@/helpers/resolveLatestTranscriptionPath";
import { getAuth, jsonError, buildWorkerUrl } from "@/lib/api-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { supabase, user, error: userError } = await getAuth();
    if (userError || !user) {
      return jsonError("Authentication required. Please sign in.", { status: 401 });
    }

    // Fetch the specific audio file
    const { getAudioById, getAlumneIdForAudio } = await import('@/lib/data/audio')
    const { data: audioFile, error: audioError } = await getAudioById(supabase, user.id, id)

    if (audioError || !audioFile) {
      return jsonError("Audio file not found", { status: 404 });
    }

    // Fetch existing alumne assignment if any
    const alumneId: string | null = await getAlumneIdForAudio(supabase, user.id, audioFile.id)

    // Fetch transcription data from Cloudflare Worker R2 instead of Supabase Storage
    let transformedTranscription: any = null;

    if (audioFile.status === "completed") {
      try {
        const path = await resolveLatestTranscriptionPath(
          supabase,
          user.id,
          audioFile.id
        );
        console.log(`Resolved path for transcription download: ${path}`);

        // Get user's access token for Worker authentication
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          console.log("No session token available for transcription download");
        } else {
          // Build Worker URL and fetch transcription JSON
          const workerUrlFinal = buildWorkerUrl(path);
          const workerResponse = await fetch(workerUrlFinal, {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (workerResponse.ok) {
            const jsonText = await workerResponse.text();
            console.log(
              `✅ Successfully fetched transcription from Worker for audio ${audioFile.id}:`,
              jsonText.substring(0, 200) + "..."
            );
            const transcriptionData = JSON.parse(jsonText);
            console.log(`📊 Parsed transcription data:`, {
              hasText: !!transcriptionData.text,
              segmentsCount: transcriptionData.segments?.length || 0,
              speakersCount: transcriptionData.speakers?.length || 0,
            });

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
            console.log(`🔄 Transformed transcription:`, {
              id: transformedTranscription.id,
              hasOriginalText: !!transformedTranscription.originalText,
              segmentsCount: transformedTranscription.segments.length,
              speakersCount: transformedTranscription.speakers.length,
            });
          } else {
            console.log(
              `Failed to fetch transcription from Worker for audio ${audioFile.id}:`,
              workerResponse.status,
              workerResponse.statusText
            );
            // Fallback to Supabase Storage if Worker fails
            const { data: jsonData, error: storageError } = await supabase.storage
              .from("transcriptions")
              .download(path);

            if (!storageError && jsonData) {
              const jsonText = await jsonData.text();
              const transcriptionData = JSON.parse(jsonText);

              transformedTranscription = {
                id: audioFile.id,
                audioId: audioFile.id,
                originalText: transcriptionData.text || "",
                editedText: transcriptionData.text || "",
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
          }
        }
      } catch (error) {
        console.error(
          `Error fetching transcription JSON for audio ${audioFile.id}:`,
          error
        );
        // If there's an error fetching transcription but audio is completed,
        // return null transcription so the frontend can handle it appropriately
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

    console.log(`🎯 Final API response for audio ${audioFile.id}:`, {
      success: true,
      audioId: audio.id,
      audioStatus: audio.status,
      hasTranscription: !!transformedTranscription,
      transcriptionId: transformedTranscription?.id,
      transcriptionSegments: transformedTranscription?.segments?.length || 0,
    });

    return NextResponse.json({
      success: true,
      audio,
      transcription: transformedTranscription,
    });
  } catch (error) {
    console.error("Error fetching audio:", error);
    return jsonError("Failed to fetch audio", { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { supabase, user, error: userError } = await getAuth();
    if (userError || !user) {
      return jsonError("Authentication required. Please sign in.", { status: 401 });
    }

    // First, fetch the audio file to get the filename
    const { getAudioById } = await import('@/lib/data/audio')
    const { data: audioFile, error: fetchError } = await getAudioById(supabase, user.id, id)

    if (fetchError || !audioFile) {
      return jsonError("Audio file not found", { status: 404 });
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
      return jsonError("Failed to delete audio file", { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting audio:", error);
    return jsonError("Failed to delete audio", { status: 500 });
  }
}
