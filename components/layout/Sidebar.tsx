"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeEuro,
  Coins,
  Eye,
  History,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Settings,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navSections = [
  {
    links: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Screening", href: "/screening?app=1", icon: ShieldCheck },
      { label: "Zakat", href: "/zakat?app=1", icon: Coins },
    ],
  },
  {
    label: "Gestion",
    links: [
      { label: "Portefeuille", href: "/portfolio", icon: WalletCards },
      { label: "Watchlist", href: "/watchlist", icon: Eye },
      { label: "Historique", href: "/historique", icon: History },
    ],
  },
  {
    label: "Compte",
    links: [
      { label: "Tarifs / Abonnements", href: "/tarifs?app=1", icon: BadgeEuro },
      { label: "Paramètres", href: "/settings", icon: Settings },
    ],
  },
];

const navLinks = navSections.flatMap((section) => section.links);
const mobilePrimary = ["/dashboard", "/portfolio", "/screening?app=1", "/zakat?app=1"];
const mobileTabs = navLinks.filter((link) => mobilePrimary.includes(link.href));
const mobileMore = navLinks.filter((link) => !mobilePrimary.includes(link.href));

function isActive(pathname: string, href: string) {
  href = href.split("?")[0];
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  if (href === "/portfolio") {
    return pathname === "/portfolio" || pathname.startsWith("/asset/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ email }: { email?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const initials =
    email?.split("@")[0].split(/[._-]/)[0]?.charAt(0).toUpperCase() ?? "H";

  async function handleLogout() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  function linkClass(href: string, compact = false) {
    const active = isActive(pathname, href);
    return [
      "flex items-center transition-colors",
      compact
        ? "flex-1 flex-col justify-center gap-1 py-2"
        : "gap-3 rounded-xl px-4 py-3 text-sm font-semibold",
      active
        ? compact
          ? "text-primary"
          : "bg-white/10 text-primary"
        : compact
          ? "text-muted-foreground hover:text-foreground"
          : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
    ].join(" ");
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-72 flex-col border-r border-border bg-[#191c1a] md:flex">
        <Link href="/dashboard" className="border-b border-border px-8 py-6">
          <p className="text-2xl font-bold text-primary">Halisia</p>
          <p className="mt-1 text-xs text-muted-foreground">Patrimoine halal</p>
        </Link>

        <nav className="flex-1 overflow-y-auto px-4 py-6">
          {navSections.map((section, sectionIndex) => (
            <div
              key={section.label ?? "principal"}
              className={sectionIndex === 0 ? "" : "mt-8"}
            >
              {section.label && (
                <p className="mb-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-primary/45">
                  {section.label}
                </p>
              )}
              <div className="space-y-1">
                {section.links.map(({ label, href, icon: Icon }) => (
                  <Link key={href} href={href} className={linkClass(href)}>
                    <Icon className="h-5 w-5 shrink-0" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-muted-foreground">
                {email ?? "Utilisateur"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              aria-label="Se déconnecter"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <nav aria-label="Navigation mobile" className="fixed inset-x-0 bottom-0 z-50 flex border-t border-border bg-[#191c1a] px-1 py-1 md:hidden">
        {mobileTabs.map(({ label, href, icon: Icon }) => (
          <Link key={href} href={href} className={linkClass(href, true)}>
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{label === "Portefeuille" ? "Portef." : label}</span>
          </Link>
        ))}
        <details className="group relative flex flex-1">
          <summary className={`${linkClass("/__more", true)} cursor-pointer list-none [&::-webkit-details-marker]:hidden ${mobileMore.some((link) => isActive(pathname, link.href)) ? "text-primary" : ""}`}>
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium">Plus</span>
          </summary>
          <div className="absolute bottom-14 right-1 w-56 overflow-hidden rounded-xl border border-border bg-[#191c1a] py-2 shadow-2xl">
            {mobileMore.map(({ label, href, icon: Icon }) => (
              <Link key={href} href={href} className={`flex items-center gap-3 px-4 py-3 text-sm ${isActive(pathname, href) ? "text-primary" : "text-foreground hover:bg-white/5"}`}>
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
            <button type="button" onClick={() => void handleLogout()} className="flex w-full items-center gap-3 border-t border-border px-4 py-3 text-left text-sm text-muted-foreground hover:bg-white/5">
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </button>
          </div>
        </details>
      </nav>
    </>
  );
}
