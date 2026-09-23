import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AssetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    data: { session },
  } = await createClient().auth.getSession();
  if (!session) redirect("/login");

  return <DashboardShell email={session.user.email}>{children}</DashboardShell>;
}
