import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { customName } = await request.json();

    if (!customName || typeof customName !== 'string' || customName.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Custom name is required and must be a non-empty string' },
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
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    // Verify the audio file belongs to the authenticated user
    const { data: audioFile, error: audioError } = await supabase
      .from('audios')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (audioError || !audioFile) {
      return NextResponse.json(
        { success: false, error: 'Audio file not found' },
        { status: 404 }
      );
    }

    if (audioFile.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Update the custom name
    const { data: updatedAudio, error: updateError } = await supabase
      .from('audios')
      .update({ custom_name: customName.trim() })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating custom name:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update custom name' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      audio: updatedAudio,
    });
  } catch (error) {
    console.error('Error updating audio custom name:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update custom name' },
      { status: 500 }
    );
  }
}