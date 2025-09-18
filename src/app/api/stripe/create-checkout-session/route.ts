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

const priceMap: Record<string, string | undefined> = {
  basic: process.env.STRIPE_PRICE_BASIC,
  pro: process.env.STRIPE_PRICE_PRO,
  premium: process.env.STRIPE_PRICE_PREMIUM,
};

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

  const { plan } = await request.json();

  if (!plan || typeof plan !== "string") {
    return NextResponse.json({ error: "Plan inválido." }, { status: 400 });
  }

  const priceId = priceMap[plan];

  if (!priceId) {
    return NextResponse.json(
      { error: "El plan seleccionado no está disponible." },
      { status: 400 }
    );
  }

  const origin =
    request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL;

  if (!origin) {
    return NextResponse.json(
      { error: "No se pudo determinar el origen para Stripe." },
      { status: 400 }
    );
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment/cancel`,
      customer_email: user.email ?? undefined,
      metadata: {
        userId: user.id,
        plan,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe session creation error:", error);
    return NextResponse.json(
      { error: "No se pudo iniciar el checkout." },
      { status: 500 }
    );
  }
}
