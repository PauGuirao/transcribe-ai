import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-06-20",
});

export async function POST(request: NextRequest) {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Necesitas iniciar sesión para continuar." },
      { status: 401 }
    );
  }

  try {
    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("current_organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.current_organization_id) {
      return NextResponse.json(
        { error: "No se encontró la organización." },
        { status: 404 }
      );
    }

    // Get organization with Stripe customer ID
    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .select("stripe_customer_id")
      .eq("id", profile.current_organization_id)
      .single();

    if (orgError || !organization?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No se encontró información de facturación para esta organización." },
        { status: 404 }
      );
    }

    const origin =
      request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL;

    if (!origin) {
      return NextResponse.json(
        { error: "No se pudo determinar el origen." },
        { status: 400 }
      );
    }

    // Create customer portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: organization.stripe_customer_id,
      return_url: `${origin}/team`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("Stripe customer portal error:", error);
    return NextResponse.json(
      { error: "No se pudo acceder al portal de facturación." },
      { status: 500 }
    );
  }
}