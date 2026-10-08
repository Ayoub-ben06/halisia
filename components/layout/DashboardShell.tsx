import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { createClient } from "@/lib/supabase/server";
import { getUserNotifications } from "@/lib/notifications";
import { I18nProvider } from "@/components/providers/i18n-provider";
import type { AppLanguage } from "@/lib/i18n";

export async function DashboardShell({
  email,
  children,
}: {
  email?: string;
  children: React.ReactNode;
}) {
  const { data: { user } } = await createClient().auth.getUser();
  const notifications = user ? await getUserNotifications(user.id) : [];
  const { data: preferences } = user
    ? await createClient().from("user_preferences").select("language").eq("user_id", user.id).maybeSingle()
    : { data: null };
  const language: AppLanguage = preferences?.language === "en" ? "en" : "fr";
  return (
    <I18nProvider initialLanguage={language}>
      <div className="min-h-screen bg-background text-foreground">
        <Sidebar email={email} />
        <div className="min-w-0 md:ml-72">
          <Topbar notifications={notifications} />
          <div className="pb-20 md:pb-0">{children}</div>
        </div>
      </div>
    </I18nProvider>
  );
}
