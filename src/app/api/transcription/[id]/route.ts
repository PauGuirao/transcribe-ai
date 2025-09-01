import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('[PATCH /api/transcription/[id]] Starting request for ID:', id);
    
    const { editedText, editedSegments, speakers } = await request.json();
    console.log('[PATCH /api/transcription/[id]] Request payload:', {
      editedTextLength: editedText?.length,
      editedSegmentsCount: editedSegments?.length,
      hasEditedText: editedText !== undefined && editedText !== null
    });

    if (editedText === undefined || editedText === null) {
      console.log('[PATCH /api/transcription/[id]] Validation failed: editedText is required');
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
    console.log('[PATCH /api/transcription/[id]] Checking authentication...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log('[PATCH /api/transcription/[id]] Authentication failed:', userError?.message || 'No user');
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }
    console.log('[PATCH /api/transcription/[id]] User authenticated:', user.id);

    // Fetch the transcription and verify ownership
    console.log('[PATCH /api/transcription/[id]] Fetching transcription and verifying ownership...');
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
    console.log('[PATCH /api/transcription/[id]] Transcription found:', transcription.id);

    // Skip database update - only update JSON file
    console.log('[PATCH /api/transcription/[id]] Skipping database update, only updating JSON file...');

    // Also update the JSON file in Supabase Storage
    console.log('[PATCH /api/transcription/[id]] Starting JSON file update...');
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
        
        // Upload updated JSON file
        console.log('[PATCH /api/transcription/[id]] Uploading updated JSON file...');
        const { error: uploadError } = await supabase.storage
          .from('transcriptions')
          .upload(jsonFileName, JSON.stringify(updatedJsonData, null, 2), {
            contentType: 'application/json',
            upsert: true,
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
      return NextResponse.json(
        { success: false, error: 'Transcription not found' },
        { status: 404 }
      );
    }

    const responseTranscription = {
      id: transcription.id,
      audioId: transcription.audio_id,
      originalText: transcription.original_text,
      editedText: transcription.edited_text || transcription.original_text, // Use edited text if available, otherwise original
      segments: transcription.segments,
      createdAt: transcription.created_at,
      updatedAt: transcription.updated_at,
    };

    return NextResponse.json({
      success: true,
      transcription: responseTranscription,
    });
  } catch (error) {
    console.error('Error fetching transcription:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transcription' },
      { status: 500 }
    );
  }
}