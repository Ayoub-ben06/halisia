import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import type { Database } from "@/types";
import { getAppUrl, getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST() {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const admin = createAdminClient();
  const { data: subscription } = await admin.from("subscriptions").select("stripe_customer_id").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (!subscription?.stripe_customer_id) return NextResponse.json({ error: "Aucun abonnement Stripe actif." }, { status: 404 });
  const portal = await getStripe().billingPortal.sessions.create({ customer: subscription.stripe_customer_id, return_url: `${getAppUrl()}/settings/abonnement` });
  return NextResponse.json({ url: portal.url });
}
