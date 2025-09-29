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
  const { organizationId, organizationName } = await getUserOrganizationInfo(supabase, userId);
  
  if (organizationId && organizationName) {
    // Check if organization has default name that needs to be changed
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
    return {
      url: `${origin}/organization`,
      reason: "no_organization"
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