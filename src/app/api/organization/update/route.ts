import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { QueryOptimizer, queryPerformanceAnalyzer } from '@/lib/query-optimizer';

export async function PATCH(request: NextRequest) {
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

    // Get user's current organization and check if they're admin/owner
    const queryOptimizer = new QueryOptimizer(supabase);
    const startTime = Date.now();

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

    // Use optimized role check
    const userRole = await queryOptimizer.getUserRoleInOrganization(
      user.id, 
      userProfile.current_organization_id
    );

    if (!userRole || !['admin', 'owner'].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, description } = body;

    // Validate required fields
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Organization name is required' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Organization name must be at least 2 characters long' },
        { status: 400 }
      );
    }

    if (trimmedName.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Organization name must be less than 100 characters' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {
      name: trimmedName,
      updated_at: new Date().toISOString()
    };

    // Add description if provided
    if (description !== undefined) {
      if (typeof description === 'string') {
        const trimmedDescription = description.trim();
        if (trimmedDescription.length > 500) {
          return NextResponse.json(
            { success: false, error: 'Description must be less than 500 characters' },
            { status: 400 }
          );
        }
        updateData.description = trimmedDescription;
      } else {
        return NextResponse.json(
          { success: false, error: 'Description must be a string' },
          { status: 400 }
        );
      }
    }

    // Update organization
    const { data: updatedOrg, error: updateError } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', userProfile.current_organization_id)
      .select('id, name, image_url, updated_at')
      .single();

    if (updateError) {
      console.error('Error updating organization:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update organization' },
        { status: 500 }
      );
    }

    // Track query performance
    const queryTime = Date.now() - startTime;
    queryPerformanceAnalyzer.trackQuery('organization_update', queryTime);

    return NextResponse.json({
      success: true,
      organization: updatedOrg
    });

  } catch (error) {
    console.error('Error updating organization:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}