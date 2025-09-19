import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  console.log("=== AUTH CALLBACK ROUTE HIT ===");
  console.log("Full URL:", request.url);
  console.log("Auth callback - Code:", code ? `present (${code.substring(0, 10)}...)` : "missing");
  console.log("Auth callback - Next:", next);
  console.log("Auth callback - Origin:", origin);
  console.log("All search params:", Object.fromEntries(searchParams.entries()));

  if (code) {
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
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      console.log("Auth callback - Success, redirecting to:", `${origin}${next}`);
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("Auth callback error:", error);
    // If there's an error with the code exchange, redirect to error page
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  console.log("Auth callback - No code, redirecting to error page");
  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
