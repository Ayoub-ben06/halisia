import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import type { Database } from "@/types";
import { getAppUrl, getStripe, getStripePriceId } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeNextPath } from "@/lib/safe-redirect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { plan?: string; returnTo?: string };
  if (body.plan !== "monthly" && body.plan !== "yearly") {
    return NextResponse.json({ error: "Plan invalide." }, { status: 400 });
  }
  if (!user.email) return NextResponse.json({ error: "Votre compte n’a pas d’adresse email." }, { status: 400 });

  try {
    const stripe = getStripe();
    const admin = createAdminClient();
    const { data: existing } = await admin.from("subscriptions").select("stripe_customer_id,status,current_period_end").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (existing && ["active", "trialing", "past_due"].includes(existing.status) && (!existing.current_period_end || new Date(existing.current_period_end).getTime() > Date.now())) {
      return NextResponse.json({ error: "Un abonnement existe déjà pour ce compte." }, { status: 409 });
    }
    const customerId = existing?.stripe_customer_id ?? (await stripe.customers.create({ email: user.email, metadata: { user_id: user.id } })).id;
    const cancelPath = safeNextPath(body.returnTo, "/tarifs");
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: getStripePriceId(body.plan), quantity: 1 }],
      success_url: `${getAppUrl()}/dashboard?stripe=success`,
      cancel_url: `${getAppUrl()}${cancelPath}?stripe=cancelled`,
      customer: customerId,
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
