// PATCH /api/organization/members/role
// Body: { userId: string, role: 'admin' | 'member' }
//
// Promotes/demotes a member of the caller's active organization. Only owners
// and admins can call. Cannot change the owner's role. Cannot edit your own
// row (use the dedicated transfer-ownership flow for that).

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getCachedUserProfile } from '@/lib/cache';

type AllowedRole = 'admin' | 'member';
const ALLOWED_ROLES: AllowedRole[] = ['admin', 'member'];

export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      },
    );

    // 1) Caller must be authenticated.
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2) Caller must belong to an org.
    const userProfile = await getCachedUserProfile(user.id, supabase);
    if (!userProfile?.current_organization_id) {
      return NextResponse.json({ error: 'User is not part of any organization' }, { status: 404 });
    }
    const orgId = userProfile.current_organization_id;

    // 3) Caller must be admin or owner.
    const { data: callerMember, error: callerErr } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .single();
    if (callerErr || !callerMember || !['admin', 'owner'].includes(callerMember.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // 4) Parse + validate body.
    let body: { userId?: unknown; role?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const targetUserId = typeof body?.userId === 'string' ? body.userId : '';
    const nextRole = typeof body?.role === 'string' ? body.role : '';
    if (!targetUserId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    if (!ALLOWED_ROLES.includes(nextRole as AllowedRole)) {
      return NextResponse.json({ error: `role must be one of: ${ALLOWED_ROLES.join(', ')}` }, { status: 400 });
    }

    // 5) Disallow editing your own row (avoids accidental self-demote race).
    if (targetUserId === user.id) {
      return NextResponse.json({ error: 'You cannot change your own role' }, { status: 400 });
    }

    // 6) Look up the target member in this org.
    const { data: targetMember, error: targetErr } = await supabase
      .from('organization_members')
      .select('role, user_id')
      .eq('organization_id', orgId)
      .eq('user_id', targetUserId)
      .single();
    if (targetErr || !targetMember) {
      return NextResponse.json({ error: 'User not found in organization' }, { status: 404 });
    }
    if (targetMember.role === 'owner') {
      return NextResponse.json({ error: 'Cannot change the owner role' }, { status: 400 });
    }

    // 7) No-op short-circuit.
    if (targetMember.role === nextRole) {
      return NextResponse.json({ success: true, role: nextRole, noop: true });
    }

    // 8) Apply the change.
    const { error: updateErr } = await supabase
      .from('organization_members')
      .update({ role: nextRole })
      .eq('organization_id', orgId)
      .eq('user_id', targetUserId);

    if (updateErr) {
      console.error('[org/members/role] update failed:', updateErr);
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
    }

    return NextResponse.json({ success: true, role: nextRole });
  } catch (e) {
    console.error('[org/members/role] unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
