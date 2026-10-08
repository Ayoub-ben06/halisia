"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Menu } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { languageLabels, type AppLanguage, type TranslationKey } from "@/lib/i18n";

const navigation: { labelKey: TranslationKey; href: string; section?: string }[] = [
  { labelKey: "navFeatures", href: "/#fonctionnalites", section: "fonctionnalites" },
  { labelKey: "navPricing", href: "/#tarifs", section: "tarifs" },
  { labelKey: "navFreeZakat", href: "/zakat-gratuit" },
  { labelKey: "navHalalAnalyzer", href: "/screener" },
];

const languageFlags: Record<AppLanguage, string> = {
  fr: "🇫🇷",
  en: "🇬🇧",
};

function LanguageFlagButton() {
  const { language, setLanguage, t } = useI18n();
  const next: AppLanguage = language === "fr" ? "en" : "fr";

  return (
    <button
      type="button"
      onClick={() => setLanguage(next)}
      aria-label={`${t("switchLanguage")} — ${languageLabels[next]}`}
      title={`${languageLabels[language]} → ${languageLabels[next]}`}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.12] text-lg transition-colors hover:border-white/25 hover:bg-white/[0.04]"
    >
      <span aria-hidden="true">{languageFlags[language]}</span>
    </button>
  );
}

export function PublicNavbar() {
  const { t } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");
  const items = useMemo(
    () => navigation.map((item) => ({ ...item, label: t(item.labelKey) })),
    [t],
  );

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const sections = ["fonctionnalites", "tarifs", "faq"];
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && setActive(entry.target.id)),
      { rootMargin: "-25% 0px -65%" },
    );
    sections.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <header className={`sticky top-0 z-50 border-b border-white/[0.07] transition-colors ${scrolled ? "bg-[#141a18]/90 backdrop-blur-xl" : "bg-[#141a18]"}`}>
      <nav
        aria-label={t("navMain")}
        className="mx-auto flex h-[81px] max-w-[1280px] items-center justify-between px-6 sm:px-10 lg:px-16"
      >
        <Link href="/" className="text-[23px] font-bold tracking-[-0.04em] text-[#f7f7f5]">
          Halisia
        </Link>

        <div className="hidden items-center gap-10 md:flex lg:gap-[43px]">
          {items.map((item) => (
            <Link
              key={item.labelKey}
              href={item.href}
              className={`text-[13.5px] font-medium tracking-[0.01em] transition-colors hover:text-white ${active === item.section ? "text-[#e6c364]" : "text-[#c9c0ae]"}`}
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
            {t("authSignIn")}
          </Link>
          <Link
            href="/register"
            className="flex h-10 items-center justify-center rounded-full bg-[#d2ad45] px-6 text-[13.5px] font-semibold text-[#4e3e10] shadow-[0_8px_24px_rgba(201,168,76,0.2)] transition-colors hover:bg-[#dfbd58] sm:px-[26px]"
          >
            {t("navGetStarted")}
          </Link>
          <details className="group relative md:hidden">
            <summary aria-label={t("navOpenMenu")} className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-white/[0.12] text-[#f5f5f3] [&::-webkit-details-marker]:hidden">
              <Menu className="h-5 w-5" />
            </summary>
            <div className="absolute right-0 top-12 w-56 overflow-hidden rounded-xl border border-white/[0.1] bg-[#141a18] py-2 shadow-2xl">
              {items.map((item) => (
                <Link key={item.labelKey} href={item.href} className="block px-4 py-3 text-sm text-[#e6e1d6] hover:bg-white/[0.05]">
                  {item.label}
                </Link>
              ))}
              <Link href="/login" className="block border-t border-white/[0.08] px-4 py-3 text-sm font-semibold text-[#f2ca6e] hover:bg-white/[0.05]">
                {t("authSignIn")}
              </Link>
            </div>
          </details>
          <LanguageFlagButton />
        </div>
      </nav>
    </header>
  );
}
