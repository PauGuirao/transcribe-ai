import { NextRequest, NextResponse } from 'next/server';
import {
  BatchQueryBuilder,
  createOptimizedSupabaseClient,
  QueryPerformanceTracker,
} from '@/lib/database-optimized';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createOptimizedSupabaseClient();
    const queryTracker = QueryPerformanceTracker.getInstance();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const batchQuery = new BatchQueryBuilder(supabase);
    const userOrgData = await queryTracker.trackQuery(
      'verifyUserWithOrganization',
      () => batchQuery.verifyUserWithOrganization(user.id),
    );

    if (!userOrgData.organization) {
      return NextResponse.json({ error: 'User is not part of any organization' }, { status: 404 });
    }

    const orgId = userOrgData.organization.id as string;

    // Members (with profiles join) + active billing window in parallel.
    const [membersData, orgWindow] = await Promise.all([
      queryTracker.trackQuery(
        'getOrganizationMembersWithProfiles',
        () => batchQuery.getOrganizationMembersWithProfiles(orgId),
      ),
      // Pull the billing window so we can scope per-user minutes to the
      // active period only (rather than lifetime usage).
      supabase
        .from('organizations')
        .select('billing_period_end')
        .eq('id', orgId)
        .single(),
    ]);

    const memberRows = (membersData ?? []) as any[];

    // Compute "this period" = the 30 days ending at billing_period_end, or the
    // last 30 days if billing window isn't set (free / one-off accounts).
    const periodEnd = orgWindow?.data?.billing_period_end
      ? new Date(orgWindow.data.billing_period_end as string)
      : null;
    const periodStart = periodEnd
      ? new Date(periodEnd.getTime() - 30 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const memberUserIds = memberRows.map((m) => m.user_id).filter(Boolean);

    // Single round-trip: fetch completed audios for all org members since the
    // period start. We sum on the server (in JS) to keep this Postgres-agnostic.
    const usageByUserId = new Map<string, number>();
    if (memberUserIds.length > 0) {
      const { data: audioRows, error: audioErr } = await supabase
        .from('audios')
        .select('user_id, duration_seconds')
        .in('user_id', memberUserIds)
        .eq('status', 'completed')
        .gte('created_at', periodStart.toISOString());

      if (audioErr) {
        console.warn('[api/org/members] audio usage fetch failed:', audioErr.message);
      } else {
        for (const row of (audioRows ?? []) as Array<{ user_id: string; duration_seconds: number | null }>) {
          const cur = usageByUserId.get(row.user_id) ?? 0;
          usageByUserId.set(row.user_id, cur + (row.duration_seconds ?? 0));
        }
      }
    }

    // Annotate each member with their minutes used (rounded to whole minutes).
    const annotatedMembers = memberRows.map((m) => {
      const secs = usageByUserId.get(m.user_id) ?? 0;
      return { ...m, minutes_used: Math.round(secs / 60) };
    });

    const responseData = {
      organization: userOrgData.organization,
      members: annotatedMembers,
      currentUserRole: userOrgData.memberRole,
      period: {
        start: periodStart.toISOString(),
        end: periodEnd ? periodEnd.toISOString() : null,
      },
    };

    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        'Cache-Control': 'private, no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Vary': 'Cookie, Authorization',
      },
    });
  } catch (error) {
    console.error('Error fetching organization members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
