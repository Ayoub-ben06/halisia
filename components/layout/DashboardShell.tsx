import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/dashboard/topbar";

export function DashboardShell({
  email,
  children,
}: {
  email?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar email={email} />
      <div className="min-w-0 md:ml-72">
        <Topbar />
        <div className="pb-20 md:pb-0">{children}</div>
      </div>
    </div>
  );
}
