import { NextResponse } from "next/server";
import { getUserOrganizationInfo } from "./auth-callback-helpers";

export interface RedirectDecision {
  url: string;
  reason: string;
}

export async function determineRedirectAfterAuth(
  supabase: any,
  userId: string,
  origin: string
): Promise<RedirectDecision> {
  // Get user's organization information
  const { organizationId, organizationName, planType } = await getUserOrganizationInfo(supabase, userId);
  
  if (organizationId && organizationName) {
    // For free and pro plans, always redirect to dashboard
    if (planType === 'free' || planType === 'pro') {
      return {
        url: `${origin}/dashboard`,
        reason: "free_or_pro_plan_user"
      };
    }
    
    // For organization plans, check if organization has default name that needs to be changed
    if (organizationName === "test") {
      return {
        url: `${origin}/organization`,
        reason: "organization_setup_required"
      };
    } else {
      return {
        url: `${origin}/dashboard`,
        reason: "organization_exists"
      };
    }
  } else {
    // No organization - redirect to dashboard for individual users
    return {
      url: `${origin}/dashboard`,
      reason: "no_organization_individual_user"
    };
  }
}

export function createRedirectResponse(decision: RedirectDecision): NextResponse {
  console.log(`Redirecting to ${decision.url} (reason: ${decision.reason})`);
  return NextResponse.redirect(decision.url);
}

export function createFallbackRedirect(origin: string): NextResponse {
  const redirectUrl = `${origin}/dashboard`;
  console.log(`Fallback redirect to ${redirectUrl}`);
  return NextResponse.redirect(redirectUrl);
}