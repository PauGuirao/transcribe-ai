import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { transcribeAudioWithTimestamps, transcribeAudioReplicate } from '@/lib/openai';

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

    const { audioId, filename, originalName, filePath, provider = 'openai' } = await request.json();

    if (!audioId || !filename || !filePath) {
      return NextResponse.json(
        { success: false, error: 'Audio ID, filename, and filePath are required' },
        { status: 400 }
      );
    }

    try {
      // Update audio status to 'transcribing'
      await supabase
        .from('audios')
        .update({ status: 'transcribing' })
        .eq('id', audioId)
        .eq('user_id', user.id);

      // Download the audio file from Supabase Storage
      const { data: audioData, error: downloadError } = await supabase.storage
        .from('audio-files')
        .download(filePath);

      if (downloadError || !audioData) {
        console.error('Download error:', downloadError);
        throw new Error('Failed to download audio file from storage');
      }

      // Convert blob to buffer and create File object
      const audioBuffer = await audioData.arrayBuffer();
      const audioFile = new File([audioBuffer], originalName || filename, {
        type: getContentType(originalName || filename),
      });

      // Transcribe with selected provider
      let transcriptionResult;
      if (provider === 'replicate') {
        transcriptionResult = await transcribeAudioReplicate(audioFile);
      } else {
        transcriptionResult = await transcribeAudioWithTimestamps(audioFile);
      }

      // Save transcription to database
      const { data: transcriptionRecord, error: transcriptionError } = await supabase
        .from('transcriptions')
        .insert({
          id: audioId,
          audio_id: audioId,
          user_id: user.id,
          status: 'completed',
        })
        .select()
        .single();

      if (transcriptionError) {
        console.error('Database transcription insert error:', transcriptionError);
        throw new Error('Failed to save transcription to database');
      }

      // Save full transcription data to Supabase Storage as JSON file
      const transcriptionJson = JSON.stringify(transcriptionResult, null, 2);
      console.log('Saving transcription JSON to storage...');
      
      const { data: jsonUpload, error: jsonUploadError } = await supabase.storage
        .from('transcriptions')
        .upload(`${user.id}/${audioId}.json`, transcriptionJson, {
          contentType: 'application/json',
          upsert: true,
        });

      if (jsonUploadError) {
        console.error('Failed to save JSON to storage:', jsonUploadError);
      } else {
        console.log('JSON saved successfully:', jsonUpload);
      }

      // Also save plain text for backward compatibility
      console.log('Saving transcription TXT to storage...');
      
      const { data: txtUpload, error: txtUploadError } = await supabase.storage
        .from('transcriptions')
        .upload(`${user.id}/${audioId}.txt`, transcriptionResult.text, {
          contentType: 'text/plain',
          upsert: true,
        });

      if (txtUploadError) {
        console.error('Failed to save TXT to storage:', txtUploadError);
      } else {
        console.log('TXT saved successfully:', txtUpload);
      }

      // Update audio status to 'completed'
      await supabase
        .from('audios')
        .update({ status: 'completed' })
        .eq('id', audioId)
        .eq('user_id', user.id);

      return NextResponse.json({
        success: true,
        transcriptionId: audioId,
        originalText: transcriptionResult.text,
        editedText: transcriptionResult.text,
        segments: transcriptionResult.segments,
        audioId: audioId,
      });
    } catch (transcriptionError) {
      console.error('Transcription error:', transcriptionError);
      
      try {
        // Update audio status to 'error'
        await supabase
          .from('audios')
          .update({ status: 'error' })
          .eq('id', audioId)
          .eq('user_id', user.id);

        // Save error to database
        const errorMessage = transcriptionError instanceof Error ? transcriptionError.message : 'Unknown error';
        await supabase
          .from('transcriptions')
          .insert({
            id: audioId,
            audio_id: audioId,
            user_id: user.id,
            original_text: '',
            edited_text: '',
            segments: [],
            provider: provider,
            status: 'error',
            error_message: errorMessage,
          });

        // Save error to Supabase Storage
        await supabase.storage
          .from('transcriptions')
          .upload(`${user.id}/${audioId}.error`, JSON.stringify({ error: errorMessage }), {
            contentType: 'application/json',
            upsert: true,
          });
      } catch (errorSaveError) {
        console.error('Failed to save error to Supabase:', errorSaveError);
      }

      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to transcribe audio',
          details: transcriptionError instanceof Error ? transcriptionError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Transcribe API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getContentType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'm4a':
      return 'audio/mp4';
    case 'ogg':
      return 'audio/ogg';
    case 'webm':
      return 'audio/webm';
    default:
      return 'audio/mpeg';
  }
}