import Link from "next/link";
import { PublicNavbar } from "@/components/layout/PublicNavbar";

export function PublicFeatureShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background text-foreground">
    <PublicNavbar />
    {children}
    <footer className="mt-16 border-t border-border"><div className="mx-auto flex max-w-[1280px] flex-col justify-between gap-5 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:px-8"><p>© 2026 Halisia Inc. Tous droits réservés.</p><div className="flex gap-5"><Link href="#">Politique de confidentialité</Link><Link href="#">Mentions légales</Link><Link href="#">Méthodologie Shariah</Link></div></div></footer>
  </div>;
}
