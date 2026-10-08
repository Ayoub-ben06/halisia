"use client";

import { usePathname } from "next/navigation";
import { AssetSearch } from "@/components/dashboard/asset-search";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import type { AppNotification } from "@/lib/notifications";
import { useI18n } from "@/components/providers/i18n-provider";

const pageTitles: Record<string, string> = {
  "/dashboard": "Tableau de Bord",
  "/portfolio": "Mon Portefeuille",
  "/watchlist": "Watchlist",
  "/zakat": "Zakat & Purification",
  "/screening": "Screening",
  "/historique": "Historique",
  "/tarifs": "Tarifs / Abonnements",
  "/settings": "Paramètres",
};

function getPageTitle(pathname: string) {
  if (pathname.startsWith("/asset/")) return "Détail de l’actif";
  if (pathname.startsWith("/settings")) return pageTitles["/settings"];
  return pageTitles[pathname] ?? "Halisia";
}

export function Topbar({ notifications = [] }: { notifications?: AppNotification[] }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const translatedTitle = pathname.startsWith("/asset/") ? t("assetDetail") : pathname.startsWith("/settings") ? t("settings") : pathname === "/dashboard" ? t("dashboard") : pathname === "/portfolio" ? t("portfolio") : pathname === "/watchlist" ? t("watchlist") : pathname === "/zakat" ? t("zakat") : pathname === "/screening" ? t("screening") : pathname === "/historique" ? t("history") : pathname === "/tarifs" ? t("pricing") : "Halisia";

  return (
    <header className="sticky top-0 z-40 flex min-h-20 items-center gap-5 bg-background/90 px-4 backdrop-blur-md sm:px-8">
      <h1 className="hidden shrink-0 text-2xl font-bold lg:block">
        {translatedTitle}
      </h1>
      <div className="ml-auto flex w-full max-w-xl items-center gap-3">
        <AssetSearch variant="v1" />
        <NotificationBell notifications={notifications} />
      </div>
    </header>
  );
}
