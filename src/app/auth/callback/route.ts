import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Enhanced logging for production debugging
  const logData = {
    timestamp: new Date().toISOString(),
    url: request.url,
    code: code ? `present (${code.substring(0, 10)}...)` : "missing",
    origin,
    allParams: Object.fromEntries(searchParams.entries()),
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer')
  };
  
  console.log("=== AUTH CALLBACK ROUTE HIT ===");
  console.log(JSON.stringify(logData, null, 2));

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
      const redirectUrl = `${origin}/dashboard`;
      console.log("=== AUTH SUCCESS ===");
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        action: "successful_redirect",
        redirectUrl,
        origin
      }, null, 2));
      return NextResponse.redirect(redirectUrl);
    }

    console.log("=== AUTH ERROR ===");
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      action: "auth_error",
      error: error.message,
      errorCode: error.status,
      redirectUrl: `${origin}/auth/auth-code-error`
    }, null, 2));
    // If there's an error with the code exchange, redirect to error page
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  // No code parameter - this shouldn't happen in normal OAuth flow
  console.log("=== NO AUTH CODE ===");
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    action: "no_code_redirect",
    redirectUrl: `${origin}/auth/auth-code-error`,
    searchParams: Object.fromEntries(searchParams.entries())
  }, null, 2));
  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
