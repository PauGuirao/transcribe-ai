import type { SupabaseClient } from "@supabase/supabase-js";
import { mailerooService } from "@/lib/maileroo";

export interface ProfileData {
  id: string;
  welcome_sent: boolean;
  current_organization_id: string | null;
}

/**
 * Sends a welcome email to a user if `welcome_sent` is still false on their
 * profile, then flips the flag. Failures are swallowed — auth flow should
 * never break because of an email outage.
 */
export async function sendWelcomeEmailIfNeeded(
  supabase: SupabaseClient,
  user: { id: string; email?: string | null; user_metadata?: Record<string, any> | null },
  profile: Pick<ProfileData, "welcome_sent">
): Promise<void> {
  if (profile.welcome_sent) return;
  if (!user.email) return;

  try {
    const displayName =
      (user.user_metadata?.full_name as string | undefined) ??
      user.email.split("@")[0];

    await mailerooService.sendWelcomeEmail(user.email, displayName);
    console.log(`[auth-callback-helpers] Welcome email sent to ${user.email}`);

    await supabase
      .from("profiles")
      .update({ welcome_sent: true })
      .eq("id", user.id);
  } catch (emailError) {
    console.error(
      "[auth-callback-helpers] Failed to send welcome email:",
      emailError
    );
  }
}
