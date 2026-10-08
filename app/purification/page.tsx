import { DashboardShell } from "@/components/layout/DashboardShell";
import { PurificationView } from "@/components/dashboard/purification-view";
import { createClient } from "@/lib/supabase/server";
import { displaySettings } from "@/lib/user-preferences";
import { getPortfolioPurification } from "@/lib/portfolio-purification";

export const dynamic = "force-dynamic";

export default async function PurificationPage() {
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) return null;
  const [purification, display] = await Promise.all([
    getPortfolioPurification(user),
    displaySettings(user),
  ]);

  return (
    <DashboardShell email={user.email}>
      <PurificationView {...purification} currency={display.currency} displayRate={display.rate} />
    </DashboardShell>
  );
}
