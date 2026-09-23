import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { createClient } from "@/lib/supabase/server";
import { getUserNotifications } from "@/lib/notifications";

export async function DashboardShell({
  email,
  children,
}: {
  email?: string;
  children: React.ReactNode;
}) {
  const { data: { user } } = await createClient().auth.getUser();
  const notifications = user ? await getUserNotifications(user.id) : [];
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar email={email} />
      <div className="min-w-0 md:ml-72">
        <Topbar notifications={notifications} />
        <div className="pb-20 md:pb-0">{children}</div>
      </div>
    </div>
  );
}
