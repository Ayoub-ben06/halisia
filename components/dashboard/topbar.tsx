"use client";

import { Bell, ShieldCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import { AssetSearch } from "@/components/dashboard/asset-search";

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
  return pageTitles[pathname] ?? "Halisia";
}

export function Topbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 flex min-h-20 items-center gap-5 bg-background/90 px-4 backdrop-blur-md sm:px-8">
      <h1 className="hidden shrink-0 text-2xl font-bold lg:block">
        {getPageTitle(pathname)}
      </h1>
      <div className="ml-auto flex w-full max-w-xl items-center gap-3">
        <AssetSearch variant="v1" />
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1a1c1a]"
        >
          <Bell className="h-5 w-5 text-[#d0c5b2]" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#c9a84c]" />
        </button>
      </div>
      <div className="hidden items-center gap-2 rounded-full border border-[#c9a84c]/20 bg-[#c9a84c]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[#e6c364] xl:flex">
        <ShieldCheck className="h-4 w-4" />
        Compte certifié
      </div>
    </header>
  );
}
