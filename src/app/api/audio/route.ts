import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET() {
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

    // Fetch audio files with their transcriptions
    const { data: audioFiles, error: audioError } = await supabase
      .from('audios')
      .select(`
        *,
        transcriptions (
          id,
          original_text,
          edited_text,
          segments,
          language,
          confidence,
          status,
          error_message,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (audioError) {
      console.error('Database error:', audioError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch audio files' },
        { status: 500 }
      );
    }

    // Transform the data to match the expected format
    const transformedAudioFiles = audioFiles.map(audio => {
      const transcription = audio.transcriptions?.[0];
      
      return {
        id: audio.id,
        filename: audio.filename,
        originalName: audio.original_filename,
        fileId: audio.id, // Using audio id as fileId for compatibility
        uploadDate: audio.created_at,
        status: audio.status,
        transcription: transcription ? {
          id: transcription.id,
          audioId: audio.id,
          originalText: transcription.original_text,
          editedText: transcription.edited_text || transcription.original_text,
          segments: transcription.segments,
          createdAt: transcription.created_at,
          updatedAt: transcription.updated_at,
        } : null,
      };
    });

    return NextResponse.json({
      success: true,
      audioFiles: transformedAudioFiles,
    });
  } catch (error) {
    console.error('Error fetching audio files:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch audio files' },
      { status: 500 }
    );
  }
}