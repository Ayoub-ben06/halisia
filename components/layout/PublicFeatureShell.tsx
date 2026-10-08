"use client";

import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { I18nProvider } from "@/components/providers/i18n-provider";

export function PublicFeatureShell({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <div className="min-h-screen bg-background text-foreground">
        <PublicNavbar />
        {children}
        <div className="mt-16">
          <SiteFooter />
        </div>
      </div>
    </I18nProvider>
  );
}
