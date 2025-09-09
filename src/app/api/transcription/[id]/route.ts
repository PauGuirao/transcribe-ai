import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { editedText, editedSegments, speakers } = await request.json();

    if (editedText === undefined || editedText === null) {
      return NextResponse.json(
        { success: false, error: 'Edited text is required' },
        { status: 400 }
      );
    }

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
      console.log('[PATCH /api/transcription/[id]] Authentication failed:', userError?.message || 'No user');
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    // Fetch the transcription and verify ownership
    const { data: transcription, error: transcriptionError } = await supabase
      .from('transcriptions')
      .select(`
        *,
        audios!inner (
          user_id
        )
      `)
      .eq('id', id)
      .eq('audios.user_id', user.id)
      .single();

    if (transcriptionError || !transcription) {
      console.log('[PATCH /api/transcription/[id]] Transcription fetch failed:', transcriptionError?.message || 'Not found');
      return NextResponse.json(
        { success: false, error: 'Transcription not found' },
        { status: 404 }
      );
    }

    try {
      const jsonFileName = `${user.id}/${transcription.audio_id}.json`;
      console.log('[PATCH /api/transcription/[id]] JSON file path:', jsonFileName);
      
      // Download existing JSON file
      console.log('[PATCH /api/transcription/[id]] Downloading existing JSON file...');
      const { data: existingJsonData, error: downloadError } = await supabase.storage
        .from('transcriptions')
        .download(jsonFileName);

      if (downloadError) {
        console.log('[PATCH /api/transcription/[id]] JSON download failed:', downloadError.message);
      } else if (!existingJsonData) {
        console.log('[PATCH /api/transcription/[id]] No existing JSON data found');
      } else {
        console.log('[PATCH /api/transcription/[id]] JSON file downloaded successfully');
        const existingJsonText = await existingJsonData.text();
        const existingData = JSON.parse(existingJsonText);
        console.log('[PATCH /api/transcription/[id]] Existing JSON parsed, segments count:', existingData.segments?.length || 0);
        
        // Update the JSON data with edited segments
        const updatedJsonData = {
          ...existingData,
          segments: editedSegments || existingData.segments,
          text: editedText || existingData.text,
          speakers: speakers || existingData.speakers,
          updated_at: new Date().toISOString()
        };
        console.log('[PATCH /api/transcription/[id]] Updated JSON data prepared, segments count:', updatedJsonData.segments?.length || 0);
        
        // Upload updated JSON file with cache busting
        console.log('[PATCH /api/transcription/[id]] Uploading updated JSON file...');
        const { error: uploadError } = await supabase.storage
          .from('transcriptions')
          .upload(jsonFileName, JSON.stringify(updatedJsonData, null, 2), {
            contentType: 'application/json',
            upsert: true,
            cacheControl: '0',
          });

        if (uploadError) {
          console.error('[PATCH /api/transcription/[id]] Failed to update JSON file:', uploadError);
        } else {
          console.log('[PATCH /api/transcription/[id]] JSON file updated successfully');
        }
      }
    } catch (jsonError) {
      console.error('[PATCH /api/transcription/[id]] Error updating JSON file:', jsonError);
      // Don't fail the request if JSON update fails
    }

    console.log('[PATCH /api/transcription/[id]] Preparing response...');
    const responseTranscription = {
      id: transcription.id,
      audioId: transcription.audio_id,
      originalText: transcription.original_text,
      editedText: editedText,
      segments: editedSegments || transcription.segments,
      speakers: speakers || [],
      createdAt: transcription.created_at,
      updatedAt: new Date().toISOString(),
    };

    console.log('[PATCH /api/transcription/[id]] Request completed successfully');
    return NextResponse.json({
      success: true,
      transcription: responseTranscription,
    });
  } catch (error) {
    console.error('[PATCH /api/transcription/[id]] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update transcription' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Supabase (server) client
    const cookieStore = await cookies();
    const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options?: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      // NOTE: 'delete' (not 'remove')
      delete(name: string, options?: CookieOptions) {
        cookieStore.set({ name, value: '', ...options });
      },
    },
  }
);

    // Auth
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    // Get transcription (for metadata + audio_id + ownership)
    const { data: transcription, error: transcriptionError } = await supabase
      .from('transcriptions')
      .select(`
        *,
        audios!inner ( user_id )
      `)
      .eq('id', id)
      .eq('audios.user_id', user.id)
      .single();

    if (transcriptionError || !transcription) {
      return NextResponse.json(
        { success: false, error: 'Transcription not found' },
        { status: 404 }
      );
    }

    // ----- Read JSON from Storage as source of truth -----
    const jsonPath = `${user.id}/${transcription.audio_id}.json`;

    let editedTextFromJson: string | undefined;
    let segmentsFromJson: any[] | undefined;
    let speakersFromJson: any[] | undefined;
    let updatedAtFromJson: string | undefined;

    const { data: fileData, error: fileErr } = await supabase.storage
      .from('transcriptions')
      .download(jsonPath);

    if (!fileErr && fileData) {
      const text = await fileData.text();
      const parsed = JSON.parse(text);
      editedTextFromJson = parsed.text;
      segmentsFromJson = parsed.segments;
      speakersFromJson = parsed.speakers;
      updatedAtFromJson = parsed.updated_at;
    }

    // Response prefers Storage JSON; falls back to DB columns
    const responseTranscription = {
      id: transcription.id,
      audioId: transcription.audio_id,
      originalText: transcription.original_text,
      editedText:
        editedTextFromJson ??
        transcription.edited_text ??
        transcription.original_text,
      segments: segmentsFromJson ?? transcription.segments ?? [],
      speakers: speakersFromJson ?? transcription.speakers ?? [],
      createdAt: transcription.created_at,
      updatedAt: updatedAtFromJson ?? transcription.updated_at,
    };

    return NextResponse.json({ success: true, transcription: responseTranscription });
  } catch (error) {
    console.error('Error fetching transcription:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transcription' },
      { status: 500 }
    );
  }
}