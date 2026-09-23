import Link from "next/link";
import { Menu } from "lucide-react";

const navigation = [
  { label: "Fonctionnalités", href: "/#fonctionnalites" },
  { label: "Tarifs", href: "/tarifs" },
  { label: "Zakat Gratuit", href: "/zakat" },
  { label: "Screener", href: "/screening" },
];

export function PublicNavbar() {
  return (
    <header className="relative z-50 border-b border-white/[0.07] bg-[#141a18]/95 backdrop-blur-md">
      <nav
        aria-label="Navigation principale"
        className="mx-auto flex h-[81px] max-w-[1280px] items-center justify-between px-6 sm:px-10 lg:px-16"
      >
        <Link
          href="/"
          className="text-[23px] font-bold tracking-[-0.04em] text-[#f7f7f5]"
        >
          Halisia
        </Link>

        <div className="hidden items-center gap-10 md:flex lg:gap-[43px]">
          {navigation.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-[13.5px] font-medium tracking-[0.01em] text-[#c9c0ae] transition-colors hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3.5">
          <Link
            href="/login"
            className="hidden h-10 items-center justify-center rounded-full border border-white/[0.12] px-5 text-[13px] font-semibold text-[#f5f5f3] transition-colors hover:border-white/25 hover:bg-white/[0.04] sm:flex"
          >
            Se connecter
          </Link>
          <Link
            href="/register"
            className="flex h-10 items-center justify-center rounded-full bg-[#d2ad45] px-6 text-[13.5px] font-semibold text-[#4e3e10] shadow-[0_8px_24px_rgba(201,168,76,0.2)] transition-colors hover:bg-[#dfbd58] sm:px-[26px]"
          >
            Commencer
          </Link>
          <details className="group relative md:hidden">
            <summary aria-label="Ouvrir le menu" className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-white/[0.12] text-[#f5f5f3] [&::-webkit-details-marker]:hidden">
              <Menu className="h-5 w-5" />
            </summary>
            <div className="absolute right-0 top-12 w-56 overflow-hidden rounded-xl border border-white/[0.1] bg-[#141a18] py-2 shadow-2xl">
              {navigation.map((item) => (
                <Link key={item.label} href={item.href} className="block px-4 py-3 text-sm text-[#e6e1d6] hover:bg-white/[0.05]">
                  {item.label}
                </Link>
              ))}
              <Link href="/login" className="block border-t border-white/[0.08] px-4 py-3 text-sm font-semibold text-[#f2ca6e] hover:bg-white/[0.05]">
                Se connecter
              </Link>
            </div>
          </details>
        </div>
      </nav>
    </header>
  );
}
