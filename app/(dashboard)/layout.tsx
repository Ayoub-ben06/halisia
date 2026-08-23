import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: { session } } = await createClient().auth.getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen bg-[#0c100e] text-[#e2e3df]">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <Topbar email={session.user.email} />
        <main className="p-4 sm:p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
