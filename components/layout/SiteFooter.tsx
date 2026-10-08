"use client";

import Link from "next/link";
import { useI18n } from "@/components/providers/i18n-provider";
import type { TranslationKey } from "@/lib/i18n";

const links: { href: string; labelKey: TranslationKey }[] = [
  { href: "/methodologie", labelKey: "footerMethodology" },
  { href: "/cgu", labelKey: "footerTerms" },
  { href: "/confidentialite", labelKey: "footerPrivacy" },
  { href: "/mentions-legales", labelKey: "footerLegal" },
];

export function SiteFooter() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-white/[0.08]">
      <div className="mx-auto flex max-w-[1280px] flex-col justify-between gap-5 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:px-8">
        <div className="max-w-md space-y-2">
          <p>
            © {new Date().getFullYear()} Halisia. {t("footerCopyright")}
          </p>
          <p className="leading-5">{t("footerDisclaimer")}</p>
        </div>
        <nav aria-label={t("footerLegalNav")} className="flex flex-wrap gap-x-5 gap-y-2">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-white">
              {t(link.labelKey)}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
