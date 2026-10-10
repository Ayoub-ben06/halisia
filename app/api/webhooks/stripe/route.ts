import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handledEvents = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_succeeded",
  "invoice.paid",
  "invoice.payment_failed",
]);

function subscriptionValues(subscription: Stripe.Subscription, userId?: string | null) {
  const item = subscription.items.data[0];
  const plan: "monthly" | "yearly" = subscription.metadata.plan === "yearly" || subscription.metadata.plan === "monthly"
    ? subscription.metadata.plan
    : item?.price.id === process.env.STRIPE_PRICE_YEARLY ? "yearly" : "monthly";
  return {
    user_id: userId ?? subscription.metadata.user_id ?? null,
    stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
    stripe_subscription_id: subscription.id,
    stripe_price_id: item?.price.id ?? null,
    plan,
    status: subscription.status,
    current_period_start: item?.current_period_start ? new Date(item.current_period_start * 1000).toISOString() : null,
    current_period_end: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
    trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  };
}

async function saveSubscription(subscription: Stripe.Subscription, userId?: string | null) {
  const admin = createAdminClient();
  const known = await admin.from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();
  if (known.error) throw known.error;
  const resolvedUserId = userId ?? subscription.metadata.user_id ?? known.data?.user_id;
  // Stripe can deliver subscription.created before checkout.session.completed.
  // The checkout event will persist it once the user ID is available.
  if (!resolvedUserId) {
    console.warn(`Stripe subscription ${subscription.id} received without a Halisia user ID`);
    return;
  }
  const { error } = await admin.from("subscriptions").upsert(
    subscriptionValues(subscription, resolvedUserId),
    { onConflict: "stripe_subscription_id" },
  );
  if (error) throw error;
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET est manquant." }, { status: 500 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Signature Stripe absente." }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch (error) {
    console.error("Invalid Stripe webhook signature", error);
    return NextResponse.json({ error: "Signature Stripe invalide." }, { status: 400 });
  }

  if (!handledEvents.has(event.type)) return NextResponse.json({ received: true });

  try {
    const admin = createAdminClient();
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (subscriptionId) {
          const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
          await saveSubscription(subscription, session.metadata?.user_id ?? session.client_reference_id);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await saveSubscription(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const { error } = await admin.from("subscriptions").update({
          status: "canceled",
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("stripe_subscription_id", subscription.id);
        if (error) throw error;
        break;
      }
      case "invoice.paid":
      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceSubscription = invoice.parent?.subscription_details?.subscription;
        const subscriptionId = typeof invoiceSubscription === "string" ? invoiceSubscription : invoiceSubscription?.id;
        if (subscriptionId) {
          const { error } = await admin.from("subscriptions").update({
            status: event.type === "invoice.payment_succeeded" ? "active" : "past_due",
            updated_at: new Date().toISOString(),
          }).eq("stripe_subscription_id", subscriptionId);
          if (error) throw error;
        }
        break;
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Stripe webhook processing failed for ${event.id}`, error);
    return NextResponse.json({ error: "Traitement du webhook impossible." }, { status: 500 });
  }
}
