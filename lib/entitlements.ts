import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type EffectivePlan = "free" | "trial" | "premium";

export const FREE_LIMITS = { portfolioAssets: 5, watchlistAssets: 3 } as const;

function isPaidSubscription(status: string | null | undefined, periodEnd: string | null | undefined) {
  if (!status || !["active", "trialing", "past_due"].includes(status)) return false;
  return !periodEnd || new Date(periodEnd).getTime() > Date.now();
}

export async function getEntitlement(userId: string) {
  const admin = createAdminClient();
  const [{ data: entitlement }, { data: subscription }] = await Promise.all([
    admin.from("user_entitlements").select("*").eq("user_id", userId).maybeSingle(),
    admin.from("subscriptions").select("status,current_period_end").eq("user_id", userId)
      .in("status", ["active", "trialing", "past_due"]).order("current_period_end", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const paid = isPaidSubscription(subscription?.status, subscription?.current_period_end);
  const trialEndsAt = entitlement?.trial_ends_at;
  const trialActive = entitlement?.plan === "trial" && Boolean(trialEndsAt) && new Date(trialEndsAt as string).getTime() > Date.now();
  const plan: EffectivePlan = paid ? "premium" : trialActive ? "trial" : "free";
  return { entitlement, subscription, plan, limits: plan === "free" ? FREE_LIMITS : { portfolioAssets: Infinity, watchlistAssets: Infinity } };
}

export async function activateFreePlan(userId: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("user_entitlements").upsert({
    user_id: userId,
    plan: "free",
    onboarding_completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) throw error;
}

export async function activateTrial(userId: string) {
  const admin = createAdminClient();
  const { data: current, error: readError } = await admin.from("user_entitlements").select("*").eq("user_id", userId).maybeSingle();
  if (readError) throw readError;
  if (current?.trial_used_at || current?.trial_started_at) throw new Error("TRIAL_ALREADY_USED");
  const started = new Date();
  const ends = new Date(started.getTime() + 7 * 24 * 60 * 60 * 1000);
  const { error } = await admin.from("user_entitlements").upsert({
    user_id: userId,
    plan: "trial",
    trial_started_at: started.toISOString(),
    trial_ends_at: ends.toISOString(),
    trial_used_at: started.toISOString(),
    onboarding_completed_at: started.toISOString(),
    updated_at: started.toISOString(),
  }, { onConflict: "user_id" });
  if (error) throw error;
  return { startedAt: started.toISOString(), endsAt: ends.toISOString() };
}
