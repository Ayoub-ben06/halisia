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
  const { data: { session } } = await createClient().auth.getSession();
  const content = <ScreeningView initialSymbol={searchParams.symbol} />;
  if (searchParams.app === "1" && session) {
    return <DashboardShell email={session.user.email}>{content}</DashboardShell>;
  }
  return <PublicFeatureShell>{content}</PublicFeatureShell>;
}
