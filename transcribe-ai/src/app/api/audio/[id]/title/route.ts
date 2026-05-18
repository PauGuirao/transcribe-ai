import { NextRequest, NextResponse } from 'next/server';
import { getAuth, jsonError } from '@/lib/api-helpers';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { customName } = await request.json();

    if (!customName || typeof customName !== 'string' || customName.trim().length === 0) {
      return jsonError('Custom name is required and must be a non-empty string', { status: 400 });
    }

    const { supabase, user, error: userError } = await getAuth();
    if (userError || !user) {
      return jsonError('Authentication required. Please sign in.', { status: 401 });
    }

    // Verify the audio file belongs to the authenticated user
    const { data: audioFile, error: audioError } = await supabase
      .from('audios')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (audioError || !audioFile) {
      return jsonError('Audio file not found', { status: 404 });
    }

    if (audioFile.user_id !== user.id) {
      return jsonError('Access denied', { status: 403 });
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
      return jsonError('Failed to update custom name', { status: 500 });
    }

    return NextResponse.json({
      success: true,
      audio: updatedAudio,
    });
  } catch (error) {
    console.error('Error updating audio custom name:', error);
    return jsonError('Failed to update custom name', { status: 500 });
  }
}