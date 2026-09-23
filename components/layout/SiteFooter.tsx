import Link from "next/link";

const links = [
  { href: "/methodologie", label: "Méthodologie Shariah" },
  { href: "/cgu", label: "Conditions d’utilisation" },
  { href: "/confidentialite", label: "Politique de confidentialité" },
  { href: "/mentions-legales", label: "Mentions légales" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.08]">
      <div className="mx-auto flex max-w-[1280px] flex-col justify-between gap-5 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:px-8">
        <div className="max-w-md space-y-2">
          <p>© {new Date().getFullYear()} Halisia. Tous droits réservés.</p>
          <p className="leading-5">Les analyses Halisia sont informatives : elles ne constituent ni un conseil en investissement ni une fatwa.</p>
        </div>
        <nav aria-label="Liens légaux" className="flex flex-wrap gap-x-5 gap-y-2">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-white">{link.label}</Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
