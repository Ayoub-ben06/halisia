import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { SiteFooter } from "@/components/layout/SiteFooter";

export function PublicFeatureShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background text-foreground">
    <PublicNavbar />
    {children}
    <div className="mt-16"><SiteFooter /></div>
  </div>;
}
