"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Calculator, LayoutDashboard, LogOut, SearchCheck, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const links = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Portefeuille", href: "/portfolio", icon: BarChart3 },
  { label: "Screening", href: "/screening", icon: SearchCheck },
  { label: "Zakat", href: "/zakat", icon: Calculator },
  { label: "Paramètres", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-[#30352f] bg-[#191d1a] md:flex">
      <div className="flex h-[124px] flex-col justify-center px-6"><span className="text-xl font-bold text-[#d5b34f]">Halisia</span><span className="mt-1 text-sm text-[#cfc5b2]">Private Banking</span></div>
      <nav className="flex-1 space-y-1">
        {links.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 border-r-2 border-transparent px-6 py-3.5 text-sm text-[#cfc5b2] transition-colors hover:bg-[#272b28] hover:text-[#e2e3df]",
              pathname === href && "border-[#d5b34f] bg-[#292d29] text-[#d5b34f]",
            )}
          >
            <Icon className="h-4 w-4" />{label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-[#30352f] p-4">
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start gap-3 text-[#cfc5b2] hover:bg-[#272b28] hover:text-white"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </Button>
      </div>
    </aside>
  );
}
