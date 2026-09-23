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
  const { data: { session } } = await createClient().auth.getSession();
  const content = <PricingView />;
  if (searchParams.app === "1" && session) {
    return <DashboardShell email={session.user.email}>{content}</DashboardShell>;
  }
  return <PublicFeatureShell>{content}</PublicFeatureShell>;
}
