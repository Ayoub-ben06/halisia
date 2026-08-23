"use client";

import { Bell, LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Topbar({ email }: { email?: string }) {
  const router = useRouter();
  const signOut = async () => {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  return (
    <header className="flex h-16 items-center gap-2 border-b border-[#30352f] bg-[#0c100e] px-4 sm:px-6">
      <span className="mr-auto text-2xl font-bold text-[#d5b34f]">Halisia</span>
      <Button variant="ghost" size="icon" aria-label="Notifications"><Bell className="h-5 w-5" /></Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full border bg-card" aria-label="Menu utilisateur">
            <User className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="truncate">{email ?? "Mon compte"}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={signOut}><LogOut className="mr-2 h-4 w-4" />Se déconnecter</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
