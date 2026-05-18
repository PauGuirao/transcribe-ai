import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getCachedUserProfile, apiCache } from '@/lib/cache';

export async function POST(request: NextRequest) {
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
      }
    );
    
    // Get the current user (admin performing the action)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to find organization ID
    const userProfile = await getCachedUserProfile(user.id, supabase);
    
    if (!userProfile?.current_organization_id) {
      return NextResponse.json({ error: 'User is not part of any organization' }, { status: 404 });
    }

    // Check if current user is admin or owner
    const { data: currentUserMember, error: memberCheckError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', userProfile.current_organization_id)
      .eq('user_id', user.id)
      .single();

    if (memberCheckError || !currentUserMember || !['admin', 'owner'].includes(currentUserMember.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get the user ID to remove from request body
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Prevent removing the owner
    const { data: targetMember, error: targetMemberError } = await supabase
      .from('organization_members')
      .select('role, user_id')
      .eq('organization_id', userProfile.current_organization_id)
      .eq('user_id', userId)
      .single();

    if (targetMemberError || !targetMember) {
      return NextResponse.json({ error: 'User not found in organization' }, { status: 404 });
    }

    if (targetMember.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove organization owner' }, { status: 400 });
    }

    // Get user profile for the user being removed
    const targetUserProfile = await getCachedUserProfile(userId, supabase);
    if (!targetUserProfile) {
      return NextResponse.json({ error: 'Target user profile not found' }, { status: 404 });
    }

    // Derive a personal-org name from the removed user's profile.
    const firstName = (targetUserProfile.full_name || '').split(' ')[0]
      || (targetUserProfile.email?.split('@')[0])
      || 'Grup';
    const personalOrgName = `${firstName}'s Grup`;

    // Create a new free-plan personal organization for the removed user.
    // Matches the schema written by provisionUserAccount.
    const { data: newOrganization, error: orgCreateError } = await supabase
      .from('organizations')
      .insert({
        name: personalOrgName,
        owner_id: userId,
        plan: 'free',
        minutes_per_month: 60,
        minutes_used_this_period: 0,
        max_members: 1,
        subscription_status: null,
        settings: {}
      })
      .select()
      .single();

    if (orgCreateError || !newOrganization) {
      console.error('Error creating new organization:', orgCreateError);
      return NextResponse.json({ error: 'Failed to create new organization' }, { status: 500 });
    }

    // Add the user as owner of the new organization
    const { error: newMemberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: newOrganization.id,
        user_id: userId,
        role: 'owner',
        joined_at: new Date().toISOString()
      });

    if (newMemberError) {
      console.error('Error adding user to new organization:', newMemberError);
      // Try to clean up the created organization
      await supabase.from('organizations').delete().eq('id', newOrganization.id);
      return NextResponse.json({ error: 'Failed to set up new organization' }, { status: 500 });
    }

    // Update the user's current organization to the new one
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({ current_organization_id: newOrganization.id })
      .eq('id', userId);

    if (profileUpdateError) {
      console.error('Error updating user profile:', profileUpdateError);
      // Continue with removal even if profile update fails
    }

    // Remove the user from the current organization
    const { error: removeError } = await supabase
      .from('organization_members')
      .delete()
      .eq('organization_id', userProfile.current_organization_id)
      .eq('user_id', userId);

    if (removeError) {
      console.error('Error removing user from organization:', removeError);
      return NextResponse.json({ error: 'Failed to remove user from organization' }, { status: 500 });
    }

    // Invalidate relevant caches to ensure immediate updates
    apiCache.invalidateByPrefix(`members:${userProfile.current_organization_id}`);
    apiCache.invalidateByPrefix(`profile:${userId}`);
    apiCache.invalidateByPrefix(`org:${userProfile.current_organization_id}`);
    apiCache.invalidateByPrefix(`org:${newOrganization.id}`);

    return NextResponse.json({
      success: true,
      message: 'User successfully removed from organization and new organization created',
      newOrganizationId: newOrganization.id
    });

  } catch (error) {
    console.error('Error removing user from organization:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}