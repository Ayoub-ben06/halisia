"use client";

import { usePathname } from "next/navigation";
import { AssetSearch } from "@/components/dashboard/asset-search";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import type { AppNotification } from "@/lib/notifications";

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

  return (
    <header className="sticky top-0 z-40 flex min-h-20 items-center gap-5 bg-background/90 px-4 backdrop-blur-md sm:px-8">
      <h1 className="hidden shrink-0 text-2xl font-bold lg:block">
        {getPageTitle(pathname)}
      </h1>
      <div className="ml-auto flex w-full max-w-xl items-center gap-3">
        <AssetSearch variant="v1" />
        <NotificationBell notifications={notifications} />
      </div>
    </header>
  );
}
