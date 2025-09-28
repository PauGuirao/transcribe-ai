import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { apiCache, createCachedResponse, getCachedUserProfile, getCachedOrganizationMembers } from '@/lib/cache';
import { BatchQueryBuilder, createOptimizedSupabaseClient, QueryPerformanceTracker } from '@/lib/database-optimized';

export async function GET(request: NextRequest) {
  try {
    // Create optimized supabase client
    const supabase = await createOptimizedSupabaseClient();
    const queryTracker = QueryPerformanceTracker.getInstance();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use optimized batch query to get user with organization data
    const batchQuery = new BatchQueryBuilder(supabase);
    
    const userOrgData = await queryTracker.trackQuery(
      'verifyUserWithOrganization',
      () => batchQuery.verifyUserWithOrganization(user.id)
    );

    if (!userOrgData.organization) {
      return NextResponse.json({ error: 'User is not part of any organization' }, { status: 404 });
    }

    // Get organization members with profiles in a single optimized query
    const membersData = await queryTracker.trackQuery(
      'getOrganizationMembersWithProfiles',
      () => batchQuery.getOrganizationMembersWithProfiles(userOrgData.organization.id)
    );
    console.log('membersData', membersData);

    const responseData = {
      organization: userOrgData.organization,
      members: membersData,
      currentUserRole: userOrgData.memberRole
    };

    return createCachedResponse(responseData, 'SHORT');
  } catch (error) {
    console.error('Error fetching organization members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}