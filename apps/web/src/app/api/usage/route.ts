import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

type PlanId = 'free' | 'basic' | 'pro' | 'studio';
type Role = 'owner' | 'admin' | 'member';

interface OrgListEntry {
  id: string;
  name: string;
  imageUrl: string | null;
  plan: string;
  role: string;
  isCurrent: boolean;
}

interface UsageResponse {
  orgId: string;
  orgName: string;
  orgImageUrl: string | null;
  plan: PlanId;
  minutesUsed: number;
  minutesAllowance: number;
  minutesRemaining: number;
  percentUsed: number;
  periodEnd: string | null;
  role: Role;
  organizations: OrgListEntry[];
}

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
  Vary: 'Cookie, Authorization',
};

function clampPercent(used: number, allowance: number): number {
  if (!allowance || allowance <= 0) return used > 0 ? 100 : 0;
  const pct = (used / allowance) * 100;
  if (!Number.isFinite(pct) || pct < 0) return 0;
  return Math.min(Math.round(pct), 100);
}

export async function GET(_request: NextRequest) {
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
        { error: 'Unauthorized' },
        { status: 401, headers: NO_STORE_HEADERS },
      );
    }

    // 2. Read profile.current_organization_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('current_organization_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[api/usage] profile fetch error:', profileError);
      return NextResponse.json(
        { error: 'Failed to load profile' },
        { status: 500, headers: NO_STORE_HEADERS },
      );
    }

    const activeOrgId: string | null = profile?.current_organization_id ?? null;
    if (!activeOrgId) {
      return NextResponse.json(
        { error: 'No active organization' },
        { status: 409, headers: NO_STORE_HEADERS },
      );
    }

    // 3. Active org row
    const { data: activeOrg, error: activeOrgError } = await supabase
      .from('organizations')
      .select(
        'id, name, image_url, plan, minutes_used_this_period, minutes_per_month, billing_period_end',
      )
      .eq('id', activeOrgId)
      .single();

    if (activeOrgError || !activeOrg) {
      console.error('[api/usage] active org fetch error:', activeOrgError);
      return NextResponse.json(
        { error: 'Active organization not found' },
        { status: 404, headers: NO_STORE_HEADERS },
      );
    }

    // 4. User's role in active org
    const { data: activeMember, error: activeMemberError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', activeOrgId)
      .eq('user_id', user.id)
      .single();

    if (activeMemberError || !activeMember) {
      console.error('[api/usage] active member fetch error:', activeMemberError);
      return NextResponse.json(
        { error: 'Not a member of active organization' },
        { status: 403, headers: NO_STORE_HEADERS },
      );
    }

    // 5. All orgs the user is a member of (for switcher)
    const { data: memberships, error: membershipsError } = await supabase
      .from('organization_members')
      .select(
        'role, organization_id, organizations(id, name, image_url, plan)',
      )
      .eq('user_id', user.id);

    if (membershipsError) {
      console.error('[api/usage] memberships fetch error:', membershipsError);
    }

    const organizations: OrgListEntry[] = (memberships || [])
      .map((row: any) => {
        // Supabase returns the joined object as either an object or single-element array depending on relation.
        const org = Array.isArray(row.organizations)
          ? row.organizations[0]
          : row.organizations;
        if (!org) return null;
        return {
          id: org.id as string,
          name: (org.name as string) ?? '',
          imageUrl: (org.image_url as string | null) ?? null,
          plan: (org.plan as string) ?? 'free',
          role: (row.role as string) ?? 'member',
          isCurrent: org.id === activeOrgId,
        } satisfies OrgListEntry;
      })
      .filter((o): o is OrgListEntry => o !== null)
      .sort((a, b) => {
        if (a.isCurrent && !b.isCurrent) return -1;
        if (!a.isCurrent && b.isCurrent) return 1;
        return a.name.localeCompare(b.name);
      });

    const minutesUsed = Number(activeOrg.minutes_used_this_period ?? 0);
    const minutesAllowance = Number(activeOrg.minutes_per_month ?? 0);
    const minutesRemaining = Math.max(minutesAllowance - minutesUsed, 0);

    const body: UsageResponse = {
      orgId: activeOrg.id,
      orgName: activeOrg.name ?? '',
      orgImageUrl: (activeOrg.image_url as string | null) ?? null,
      plan: (activeOrg.plan as PlanId) ?? 'free',
      minutesUsed,
      minutesAllowance,
      minutesRemaining,
      percentUsed: clampPercent(minutesUsed, minutesAllowance),
      periodEnd: (activeOrg.billing_period_end as string | null) ?? null,
      role: (activeMember.role as Role) ?? 'member',
      organizations,
    };

    return NextResponse.json(body, { status: 200, headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('[api/usage] unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
