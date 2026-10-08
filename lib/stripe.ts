import "server-only";
import Stripe from "stripe";

let stripeClient: Stripe | undefined;

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY est requis.");
  stripeClient ??= new Stripe(secretKey);
  return stripeClient;
}

export function getStripePriceId(plan: "monthly" | "yearly") {
  const priceId = plan === "monthly"
    ? process.env.STRIPE_PRICE_MONTHLY
    : process.env.STRIPE_PRICE_YEARLY;
  if (!priceId) throw new Error(`STRIPE_PRICE_${plan.toUpperCase()} est requis.`);
  return priceId;
}

export function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
