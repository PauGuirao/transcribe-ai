import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    // Check authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json(
      { success: false, error: 'Authentication required. Please sign in.' },
      { status: 401 }
    );
  }

    // Fetch the specific audio file
    const { data: audioFile, error: audioError } = await supabase
      .from('audios')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (audioError || !audioFile) {
      return NextResponse.json(
        { success: false, error: 'Audio file not found' },
        { status: 404 }
      );
    }

    // Fetch transcription data from Storage bucket JSON file
    let transformedTranscription = null;
    
    if (audioFile.status === 'completed') {
      try {
        const jsonFileName = `${user.id}/${audioFile.id}.json`;
        // Add timestamp to force cache refresh
        const cacheBuster = `?t=${Date.now()}`;
         const { data: jsonData, error: storageError } = await supabase.storage
           .from('transcriptions')
           .download(jsonFileName);

        if (!storageError && jsonData) {
          const jsonText = await jsonData.text();
          const transcriptionData = JSON.parse(jsonText);
          
          transformedTranscription = {
            id: audioFile.id, // Using audio ID as transcription ID
            audioId: audioFile.id,
            originalText: transcriptionData.text || '',
            editedText: transcriptionData.text || '', // For now, same as original
            segments: transcriptionData.segments || [],
            speakers: transcriptionData.speakers && transcriptionData.speakers.length > 0 
              ? transcriptionData.speakers 
              : [
                  {
                    id: 'speaker-logopeda',
                    name: 'Logopeda',
                    color: '#3B82F6'
                  },
                  {
                    id: 'speaker-alumne',
                    name: 'Alumne',
                    color: '#EF4444'
                  }
                ],
            createdAt: audioFile.created_at,
            updatedAt: audioFile.updated_at,
          };
        } else {
          console.log(`No transcription JSON found for audio ${audioFile.id}:`, storageError);
        }
      } catch (error) {
        console.error(`Error fetching transcription JSON for audio ${audioFile.id}:`, error);
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
    console.error('Error fetching audio:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch audio' },
      { status: 500 }
    );
  }
}