import { PublicFeatureShell } from "@/components/layout/PublicFeatureShell";
import { ScreeningView } from "@/components/screening/screening-view";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ScreeningPage({
  searchParams,
}: {
  searchParams: { app?: string; symbol?: string };
}) {
  const { data: { user } } = await createClient().auth.getUser();
  const content = <ScreeningView initialSymbol={searchParams.symbol} />;
  if (searchParams.app === "1" && user) {
    return <DashboardShell email={user.email}>{content}</DashboardShell>;
  }
  return <PublicFeatureShell>{content}</PublicFeatureShell>;
}
