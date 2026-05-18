import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { apiCache, CACHE_HEADERS, createCachedResponse, getCachedUserProfile, CACHE_DURATIONS } from "@/lib/cache";

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client with user session
    const cookieStore = await cookies();
    const supabaseClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: CACHE_HEADERS.NO_CACHE }
      );
    }

    // Check cache first
    const cacheKey = apiCache.generateKey("organization-invite", { userId: user.id });
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return createCachedResponse(cached, "SHORT");
    }

    // Use enhanced caching for user profile
    const userProfile = await getCachedUserProfile(user.id, supabaseClient);
    
    if (!userProfile?.current_organization_id) {
      return NextResponse.json(
        { error: "User profile not found or no organization" },
        { status: 404, headers: CACHE_HEADERS.NO_CACHE }
      );
    }

    // Check if user has permission to view invitations
    const { data: memberData, error: memberError } = await supabaseClient
      .from("organization_members")
      .select("role")
      .eq("organization_id", userProfile.current_organization_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !memberData) {
      return NextResponse.json(
        { error: "User is not a member of this organization" },
        { status: 403, headers: CACHE_HEADERS.NO_CACHE }
      );
    }

    if (!["admin", "owner"].includes(memberData.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions to view invitations" },
        { status: 403, headers: CACHE_HEADERS.NO_CACHE }
      );
    }

    // Check if organization already has an invitation token
    const { data: existingInvite, error: checkError } = await supabaseClient
      .from("invitations")
      .select("token")
      .eq("organization_id", userProfile.current_organization_id)
      .single();

    let responseData;

    if (checkError && checkError.code === 'PGRST116') {
      // No existing invitation found
      responseData = { inviteUrl: null, token: null };
    } else if (existingInvite) {
      // Return existing invitation
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
      const inviteUrl = `${baseUrl}/invite/${existingInvite.token}`;
      
      responseData = {
        inviteUrl,
        token: existingInvite.token
      };
    } else {
      console.error("Error checking existing invitation:", checkError);
      return NextResponse.json(
        { error: "Failed to check invitation" },
        { status: 500, headers: CACHE_HEADERS.NO_CACHE }
      );
    }

    // Cache the successful response with proper TTL for invitations
    apiCache.set(cacheKey, responseData, CACHE_DURATIONS.INVITATIONS);

    return createCachedResponse(responseData, "SHORT");

  } catch (error) {
    console.error("Error in GET invite API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: CACHE_HEADERS.NO_CACHE }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabaseClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    // Get the current user session
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use enhanced caching for user profile
    const userProfile = await getCachedUserProfile(user.id, supabaseClient);
    
    if (!userProfile?.current_organization_id) {
      return NextResponse.json(
        { error: "User profile or organization not found" },
        { status: 404 }
      );
    }

    // Check if user has permission to invite (admin or owner)
    const { data: memberData, error: memberError } = await supabaseClient
      .from("organization_members")
      .select("role")
      .eq("organization_id", userProfile.current_organization_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !memberData) {
      return NextResponse.json(
        { error: "User is not a member of this organization" },
        { status: 403 }
      );
    }

    if (!["admin", "owner"].includes(memberData.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions to create invitations" },
        { status: 403 }
      );
    }

    // Check if organization already has an invitation token
    const { data: existingInvite, error: checkError } = await supabaseClient
      .from("invitations")
      .select("token")
      .eq("organization_id", userProfile.current_organization_id)
      .single();

    let inviteToken;

    if (checkError && checkError.code === 'PGRST116') {
      // No existing invitation, create a new one
      inviteToken = uuidv4();
      
      const { error: insertError } = await supabaseClient
        .from("invitations")
        .insert({
          organization_id: userProfile.current_organization_id,
          token: inviteToken
        });

      if (insertError) {
        console.error("Error creating invitation token:", insertError);
        return NextResponse.json(
          { error: "Failed to create invitation" },
          { status: 500 }
        );
      }
    } else if (existingInvite) {
      // Use existing invitation token
      inviteToken = existingInvite.token;
    } else {
      console.error("Error checking existing invitation:", checkError);
      return NextResponse.json(
        { error: "Failed to check invitation" },
        { status: 500 }
      );
    }

    // Generate invitation URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
    const inviteUrl = `${baseUrl}/invite/${inviteToken}`;

    return NextResponse.json({
      inviteUrl,
      token: inviteToken
    });

  } catch (error) {
    console.error("Error in invite API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}