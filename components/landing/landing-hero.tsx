"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";

export function LandingHero() {
  const { t } = useI18n();

  return (
    <section className="relative isolate min-h-[calc(100vh-81px)] px-6 pb-24 pt-[218px] text-center sm:px-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-35"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.065) 0.7px, transparent 0.8px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[330px] bg-[radial-gradient(ellipse_at_center,rgba(201,168,76,0.035),transparent_68%)]"
      />

      <div className="mx-auto flex max-w-[900px] flex-col items-center">
        <div className="mb-[33px] inline-flex h-[30px] items-center gap-2 rounded-full border border-white/[0.13] bg-white/[0.045] px-4 text-[12px] tracking-[0.035em] text-[#d2c7b4]">
          <span className="h-2 w-2 rounded-full bg-[#baa052]" />
          {t("landingHeroBadge")}
        </div>

        <h1 className="max-w-[850px] text-[45px] font-bold leading-[1.07] tracking-[-0.035em] text-[#f7f7f7] sm:text-[58px] lg:text-[68px]">
          {t("landingHeroTitle")}
          <span className="block text-[#f2ca6e]">{t("landingHeroTitleAccent")}</span>
        </h1>

        <p className="mt-[29px] max-w-[640px] text-[16px] leading-[1.7] text-[#c9c0af] sm:text-[17px]">
          {t("landingHeroSubtitle")}
        </p>

        <div className="mt-[40px] flex w-full flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/register"
            className="group flex h-[60px] w-full max-w-[257px] items-center justify-center gap-3 rounded-full bg-[#d2ad45] text-[14px] font-semibold text-[#4d3b0d] shadow-[0_9px_28px_rgba(201,168,76,0.23)] transition-all hover:-translate-y-0.5 hover:bg-[#dfbd58]"
          >
            {t("landingHeroCtaPrimary")}
            <ArrowRight className="h-[18px] w-[18px] transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/screening"
            className="flex h-[52px] w-full max-w-[220px] items-center justify-center rounded-full border border-white/[0.12] text-[13px] font-semibold text-[#f4f4f2] transition-colors hover:border-white/25 hover:bg-white/[0.04]"
          >
            {t("landingHeroCtaSecondary")}
          </Link>
        </div>

        <p className="mt-[48px] text-[12.5px] text-[#a9a291]">{t("landingHeroFootnote")}</p>
      </div>

      <div className="absolute inset-x-6 bottom-[96px] h-px bg-gradient-to-r from-transparent via-[#796934]/80 to-transparent sm:inset-x-16" />
    </section>
  );
}
