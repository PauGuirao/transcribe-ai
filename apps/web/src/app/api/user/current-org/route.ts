import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
  Vary: 'Cookie, Authorization',
};

export async function PATCH(request: NextRequest) {
  try {
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
      },
    );

    // 1. Auth
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: NO_STORE_HEADERS },
      );
    }

    // 2. Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const orgId =
      typeof (body as { orgId?: unknown })?.orgId === 'string'
        ? ((body as { orgId: string }).orgId as string)
        : null;

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'orgId is required' },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    // 3. Verify membership
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError) {
      console.error('[api/user/current-org] membership lookup error:', membershipError);
      return NextResponse.json(
        { success: false, error: 'Failed to verify membership' },
        { status: 500, headers: NO_STORE_HEADERS },
      );
    }

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'You are not a member of this organization' },
        { status: 403, headers: NO_STORE_HEADERS },
      );
    }

    // 4. Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        current_organization_id: orgId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[api/user/current-org] update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to switch organization' },
        { status: 500, headers: NO_STORE_HEADERS },
      );
    }

    return NextResponse.json(
      { success: true, orgId },
      { status: 200, headers: NO_STORE_HEADERS },
    );
  } catch (err) {
    console.error('[api/user/current-org] unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
