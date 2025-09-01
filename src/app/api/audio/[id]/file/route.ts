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

    // Get audio file info from database
    const { data: audioFile, error: audioError } = await supabase
      .from('audios')
      .select('filename, storage_path, mime_type')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (audioError || !audioFile) {
      return NextResponse.json(
        { success: false, error: 'Audio file not found' },
        { status: 404 }
      );
    }

    // Download file from Supabase Storage
    const { data: fileData, error: storageError } = await supabase.storage
      .from('audio-files')
      .download(audioFile.storage_path);

    if (storageError || !fileData) {
      console.error('Storage download error:', storageError);
      return NextResponse.json(
        { success: false, error: 'Failed to download audio file' },
        { status: 500 }
      );
    }

    // Convert blob to array buffer
    const fileBuffer = await fileData.arrayBuffer();
    const contentType = audioFile.mime_type || getContentType(audioFile.filename);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Error serving audio file:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to serve audio file' },
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