import { PublicFeatureShell } from "@/components/layout/PublicFeatureShell";
import { PricingView } from "@/components/pricing/pricing-view";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: { app?: string };
}) {
  const { data: { user } } = await createClient().auth.getUser();
  const content = <PricingView />;
  if (searchParams.app === "1" && user) {
    return <DashboardShell email={user.email}>{content}</DashboardShell>;
  }
  return <PublicFeatureShell>{content}</PublicFeatureShell>;
}
