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
  paid: process.env.STRIPE_PRICE_PRO,
  group: process.env.STRIPE_PRICE_GROUP,
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

  const { plan, invitationEmail, organizationName, organizationSettings, users } = await request.json();

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

  // Determine quantity based on plan and provided users
  let quantity = 1;
  if (plan === "group") {
    const parsedUsers = Number(users);
    if (!parsedUsers || parsedUsers < 1 || !Number.isFinite(parsedUsers)) {
      return NextResponse.json({ error: "Número de usuarios inválido para el plan grupal." }, { status: 400 });
    }
    quantity = Math.floor(parsedUsers);
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
    // Configure payment methods based on plan type
    const paymentMethodTypes = plan === "group" 
      ? ["card", "sepa_debit"] // Bank transfers for group plans
      : ["card"]; // Only cards for regular plans

    const sessionConfig: any = {
      mode: "subscription",
      payment_method_types: paymentMethodTypes,
      line_items: [
        {
          price: priceId,
          quantity,
        },
      ],
      success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment/cancel`,
      customer_email: user.email ?? undefined,
      metadata: {
        userId: user.id,
        plan,
        ...(plan === "group" ? { numberOfUsers: String(quantity) } : {}),
      },
    };

    // Add group plan specific metadata
    if (plan === "group" && invitationEmail && organizationName) {
      sessionConfig.metadata.invitationEmail = invitationEmail;
      sessionConfig.metadata.organizationName = organizationName;
      if (organizationSettings) {
        sessionConfig.metadata.organizationSettings = JSON.stringify(organizationSettings);
      }
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe session creation error:", error);
    return NextResponse.json(
      { error: "No se pudo iniciar el checkout." },
      { status: 500 }
    );
  }
}
