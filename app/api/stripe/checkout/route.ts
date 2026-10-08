import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import type { Database } from "@/types";
import { getAppUrl, getStripe, getStripePriceId } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { plan?: string };
  if (body.plan !== "monthly" && body.plan !== "yearly") {
    return NextResponse.json({ error: "Plan invalide." }, { status: 400 });
  }
  if (!user.email) return NextResponse.json({ error: "Votre compte n’a pas d’adresse email." }, { status: 400 });

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: getStripePriceId(body.plan), quantity: 1 }],
      success_url: `${getAppUrl()}/settings?stripe=success`,
      cancel_url: `${getAppUrl()}/tarifs?stripe=cancelled`,
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: { user_id: user.id, plan: body.plan },
      subscription_data: { metadata: { user_id: user.id, plan: body.plan } },
      allow_promotion_codes: true,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe Checkout error", error);
    const details = process.env.NODE_ENV !== "production" && error instanceof Error ? error.message : undefined;
    return NextResponse.json({ error: details ?? "Impossible de créer la session de paiement." }, { status: 500 });
  }
}
