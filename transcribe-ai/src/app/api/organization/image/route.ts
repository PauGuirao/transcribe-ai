import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get session for worker auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return NextResponse.json(
        { success: false, error: 'Session required' },
        { status: 401 }
      );
    }

    // Get user's current organization and check if they're admin/owner
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('current_organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile?.current_organization_id) {
      return NextResponse.json(
        { success: false, error: 'No organization found' },
        { status: 404 }
      );
    }

    // Check user role in organization
    const { data: memberData, error: memberError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', userProfile.current_organization_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !memberData || !['admin', 'owner'].includes(memberData.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Upload to Cloudflare R2 via Worker
    const workerUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_WORKER_URL || 'https://transcribe-worker.guiraocastells.workers.dev';

    const workerFormData = new FormData();
    workerFormData.append('image', file);
    workerFormData.append('organizationId', userProfile.current_organization_id);

    const workerResponse = await fetch(`${workerUrl}/organization-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: workerFormData,
    });

    if (!workerResponse.ok) {
      const errorData = await workerResponse.json().catch(() => ({}));
      console.error('Worker upload error:', errorData);
      return NextResponse.json(
        { success: false, error: errorData.error || 'Failed to upload image' },
        { status: workerResponse.status }
      );
    }

    const workerResult = await workerResponse.json();

    // Update organization with new image URL
    const { data: updatedOrg, error: updateError } = await supabase
      .from('organizations')
      .update({
        image_url: workerResult.publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', userProfile.current_organization_id)
      .select('id, name, image_url')
      .single();

    if (updateError) {
      console.error('Error updating organization:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update organization' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      organization: updatedOrg,
      imageUrl: workerResult.publicUrl
    });

  } catch (error) {
    console.error('Error uploading organization image:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}