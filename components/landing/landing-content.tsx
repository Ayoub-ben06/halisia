"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, ChevronDown, CircleAlert, Coins, Mail, Search, ShieldCheck, TrendingUp } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import type { TranslationKey } from "@/lib/i18n";

function checkpoints(items: string[]) {
  return (
    <ul className="mt-6 space-y-3 text-sm text-[#c9c0af]">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#c9a84c]" />
          {item}
        </li>
      ))}
    </ul>
  );
}

function MockupFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-2xl border border-[#c9a84c]/35 bg-[#0d1722] p-4 shadow-[0_0_55px_rgba(201,168,76,0.12)] sm:p-6 ${className}`}>
      <div className="mb-5 flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-[#ef4444]/70" />
        <span className="h-2 w-2 rounded-full bg-[#f59e0b]/70" />
        <span className="h-2 w-2 rounded-full bg-[#10b981]/70" />
        <span className="ml-auto h-2 w-24 rounded-full bg-white/10" />
      </div>
      {children}
    </div>
  );
}

function DashboardMockup() {
  const { t } = useI18n();
  const rows = [
    ["AAPL", "Apple Inc.", t("statusCompliant"), "text-[#10b981]"],
    ["TSLA", "Tesla Inc.", t("statusToReview"), "text-[#f59e0b]"],
    ["BNP.PA", "BNP Paribas", t("statusNonCompliant"), "text-[#ef4444]"],
    ["XAU", t("landingMockPhysicalGold"), t("statusCompliant"), "text-[#10b981]"],
  ] as const;

  return (
    <div className="relative mx-auto max-w-[920px]">
      <MockupFrame>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            [t("totalValue"), "24 680 €"],
            [t("totalPerformance"), "+12,4 %"],
            [t("estimatedZakat"), "311,25 €"],
          ].map(([label, value], index) => (
            <div key={label} className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-4">
              <p className="text-[10px] uppercase tracking-wider text-[#8d9aa8]">{label}</p>
              <p className={`mt-3 text-xl font-bold ${index === 1 ? "text-[#10b981]" : index === 2 ? "text-[#e6c364]" : "text-white"}`}>{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.035] p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#c9c0af]">{t("landingMockComplianceScore")}</span>
            <strong className="text-[#10b981]">84% · {t("landingMockExcellent")}</strong>
          </div>
          <div className="mt-3 h-2 rounded-full bg-white/10">
            <div className="h-full w-[84%] rounded-full bg-gradient-to-r from-[#c9a84c] to-[#10b981]" />
          </div>
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.07]">
          <div className="grid grid-cols-[1fr_auto] gap-4 bg-white/[0.045] px-4 py-3 text-[10px] uppercase tracking-wider text-[#8d9aa8]">
            <span>{t("portfolioAsset")}</span>
            <span>{t("statusColumn")}</span>
          </div>
          {rows.map(([ticker, name, status, color]) => (
            <div key={ticker} className="grid grid-cols-[1fr_auto] items-center gap-4 border-t border-white/[0.06] px-4 py-3 text-xs">
              <span>
                <strong className="text-white">{ticker}</strong>
                <span className="ml-2 text-[#8d9aa8]">{name}</span>
              </span>
              <span className={color}>
                {status}{" "}
                {status === t("statusCompliant") ? "✓" : status === t("statusToReview") ? "⚠" : "✕"}
              </span>
            </div>
          ))}
        </div>
      </MockupFrame>
      <div className="absolute -right-3 -top-5 hidden animate-[float_4s_ease-in-out_infinite] items-center gap-2 rounded-full border border-[#10b981]/30 bg-[#10261f] px-4 py-2 text-xs text-[#a7f3d0] shadow-xl sm:flex">
        {t("landingMockAirLiquideAlert")} <span className="text-[#789084]">{t("landingMockMinutesAgo")}</span>
      </div>
      <div className="absolute -bottom-5 -left-3 hidden animate-pulse items-center gap-2 rounded-full border border-[#f59e0b]/30 bg-[#2d2110] px-4 py-2 text-xs text-[#fcd58b] shadow-xl sm:flex">
        {t("landingMockTeslaReclassified")}
      </div>
    </div>
  );
}

function ScreeningMockup() {
  const { t } = useI18n();
  const metrics = [
    [t("landingMockImpureRevenue"), "0,74 %", "≤ 5 %"],
    [t("landingMockRibawiDebt"), "1,95 %", "≤ 30 %"],
    [t("landingMockInterestPlacements"), "0,71 %", "≤ 30 %"],
    [t("landingMockLiquidity"), "8,20 %", "≤ 70 %"],
  ] as const;

  return (
    <MockupFrame>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[#8d9aa8]">{t("landingMockAaoifiAnalysis")}</p>
          <h3 className="mt-2 text-xl font-bold">
            Apple Inc. <span className="text-xs font-normal text-[#10b981]">{t("statusCompliant").toUpperCase()}</span>
          </h3>
        </div>
        <ShieldCheck className="h-7 w-7 text-[#c9a84c]" />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {metrics.map(([label, value, limit]) => (
          <div key={label} className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-3">
            <p className="text-[10px] text-[#8d9aa8]">{label}</p>
            <p className="mt-2 text-lg font-bold text-white">
              {value} <span className="text-[#10b981]">✓</span>
            </p>
            <p className="mt-1 text-[10px] text-[#8d9aa8]">{t("landingMockLimit").replace("{limit}", limit)}</p>
          </div>
        ))}
      </div>
    </MockupFrame>
  );
}

function ZakatMockup() {
  const { t } = useI18n();
  const lines = [
    [t("zakatCategoryCompliantStocks"), "201,00 €"],
    [t("gold"), "12,25 €"],
    [t("cash"), "98,00 €"],
  ] as const;

  return (
    <MockupFrame>
      <p className="text-xs text-[#8d9aa8]">{t("landingMockZakatCalculator").replace("{year}", "2026")}</p>
      <p className="mt-2 text-3xl font-bold text-[#e6c364]">311,25 €</p>
      <p className="mt-1 text-xs text-[#8d9aa8]">{t("landingMockAmountToPay")}</p>
      <div className="mt-5 space-y-3">
        {lines.map(([label, value]) => (
          <div key={label} className="flex justify-between border-b border-white/[0.06] pb-3 text-sm">
            <span className="text-[#c9c0af]">{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-2 rounded-lg bg-[#c9a84c]/10 p-3 text-xs text-[#e6c364]">
        <Coins className="h-4 w-4" /> {t("landingMockNisabAutoUpdated")}
      </div>
    </MockupFrame>
  );
}

function AlertMockup() {
  const { t } = useI18n();
  return (
    <MockupFrame>
      <div className="rounded-xl border border-[#f59e0b]/30 bg-[#2d2110] p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-[#fcd58b]">
          <CircleAlert className="h-5 w-5" /> {t("landingMockTeslaReclassified").replace("⚠️ ", "")}
        </div>
        <p className="mt-4 text-sm leading-6 text-[#ded2bd]">{t("landingMockShariahStatusChanged")}</p>
        <div className="mt-4 flex items-center justify-between rounded-lg bg-black/20 p-3 text-xs">
          <span className="text-[#a9a291]">{t("landingMockAaoifiDeadline")}</span>
          <strong className="text-[#fcd58b]">{t("landingMockDaysCount").replace("{count}", "90")}</strong>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-lg border border-white/[0.07] bg-white/[0.035] p-3 text-xs text-[#c9c0af]">
        <Mail className="h-4 w-4 text-[#c9a84c]" /> {t("landingMockNotificationSent")}
      </div>
    </MockupFrame>
  );
}

export function LandingContent() {
  const { t } = useI18n();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("visible")),
      { threshold: 0.1 },
    );
    document.querySelectorAll(".fade-in-section").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const faqItems: Array<[TranslationKey, TranslationKey]> = [
    ["landingFaq1Question", "landingFaq1Answer"],
    ["landingFaq2Question", "landingFaq2Answer"],
    ["landingFaq3Question", "landingFaq3Answer"],
    ["landingFaq4Question", "landingFaq4Answer"],
    ["landingFaq5Question", "landingFaq5Answer"],
  ];

  const freePricingFeatures: TranslationKey[] = [
    "landingPricingFreeFeature1",
    "landingPricingFreeFeature2",
    "landingPricingFreeFeature3",
    "landingPricingFreeFeature4",
    "landingPricingFreeFeature5",
    "landingPricingFreeFeature6",
    "landingPricingFreeFeature7",
    "landingPricingFreeFeature8",
  ];

  const premiumPricingFeatures: TranslationKey[] = [
    "landingPricingPremiumFeature1",
    "landingPricingPremiumFeature2",
    "landingPricingPremiumFeature3",
    "landingPricingPremiumFeature4",
    "landingPricingPremiumFeature5",
    "landingPricingPremiumFeature6",
    "landingPricingPremiumFeature7",
    "landingPricingPremiumFeature8",
  ];

  return (
    <>
      <ScreenerLandingSection />
      <section id="apercu" className="fade-in-section scroll-mt-24 border-t border-white/[0.06] bg-[#07111c] px-6 py-24 sm:px-10">
        <div className="mx-auto max-w-[1180px]">
          <div className="text-center">
            <span className="rounded-full bg-white/[0.06] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[#a9a291]">{t("landingProductEyebrow")}</span>
            <h2 className="mt-5 text-3xl font-bold sm:text-4xl">{t("landingProductTitle")}</h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#a9a291]">{t("landingProductSubtitle")}</p>
          </div>
          <div className="mt-12">
            <DashboardMockup />
          </div>
        </div>
      </section>
      <section id="brokers" className="fade-in-section scroll-mt-24 border-y border-white/[0.06] bg-[#0d1b2a] px-6 py-12 sm:px-10">
        <div className="mx-auto max-w-[1180px] text-center">
          <p className="text-sm font-semibold text-[#e8e0d2]">{t("landingBrokersTitle")}</p>
          <div className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-3">
            {["Trade Republic", "Degiro", "Fortuneo", "Bitpanda"].map((broker) => (
              <span key={broker} className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-[#132236] px-4 py-2.5 text-sm text-[#d7d1c5]">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#c9a84c]/15 text-[10px] text-[#e6c364]">{broker[0]}</span>
                {broker}
              </span>
            ))}
          </div>
          <p className="mt-6 text-xs text-[#8d9aa8]">{t("landingBrokersHint")}</p>
        </div>
      </section>
      <section id="fonctionnalites" className="scroll-mt-24 px-6 py-24 sm:px-10">
        <div className="mx-auto max-w-[1180px]">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#c9a84c]">{t("navFeatures")}</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">{t("landingFeaturesTitle")}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[#a9a291]">{t("landingFeaturesSubtitle")}</p>
          </div>
          <div className="mt-16 space-y-24">
            <article className="fade-in-section grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
              <ScreeningMockup />
              <div>
                <span className="text-sm font-semibold text-[#e6c364]">{t("landingFeatureScreeningEyebrow")}</span>
                <h3 className="mt-4 text-3xl font-bold leading-tight">{t("landingFeatureScreeningTitle")}</h3>
                <p className="mt-5 text-sm leading-7 text-[#c9c0af]">{t("landingFeatureScreeningDesc")}</p>
                {checkpoints([t("landingFeatureScreeningCheckpoint1"), t("landingFeatureScreeningCheckpoint2"), t("landingFeatureScreeningCheckpoint3")])}
              </div>
            </article>
            <article className="fade-in-section grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
              <div className="lg:order-1">
                <span className="text-sm font-semibold text-[#e6c364]">{t("landingFeatureZakatEyebrow")}</span>
                <h3 className="mt-4 text-3xl font-bold leading-tight">{t("landingFeatureZakatTitle")}</h3>
                <p className="mt-5 text-sm leading-7 text-[#c9c0af]">{t("landingFeatureZakatDesc")}</p>
                {checkpoints([t("landingFeatureZakatCheckpoint1"), t("landingFeatureZakatCheckpoint2"), t("landingFeatureZakatCheckpoint3")])}
              </div>
              <div className="lg:order-2">
                <ZakatMockup />
              </div>
            </article>
            <article className="fade-in-section grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
              <AlertMockup />
              <div>
                <span className="text-sm font-semibold text-[#e6c364]">{t("landingFeatureAlertsEyebrow")}</span>
                <h3 className="mt-4 text-3xl font-bold leading-tight">{t("landingFeatureAlertsTitle")}</h3>
                <p className="mt-5 text-sm leading-7 text-[#c9c0af]">{t("landingFeatureAlertsDesc")}</p>
                {checkpoints([t("landingFeatureAlertsCheckpoint1"), t("landingFeatureAlertsCheckpoint2"), t("landingFeatureAlertsCheckpoint3")])}
              </div>
            </article>
          </div>
        </div>
      </section>
      <section id="outils-gratuits" className="fade-in-section scroll-mt-24 bg-[#07111c] px-6 py-24 sm:px-10">
        <div className="mx-auto max-w-[1050px]">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#c9a84c]">{t("landingFreeToolsEyebrow")}</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">{t("landingFreeToolsTitle")}</h2>
            <p className="mt-4 text-sm text-[#a9a291]">{t("landingFreeToolsSubtitle")}</p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <FreeToolCard icon={Coins} title={t("landingFreeToolsZakatTitle")} text={t("landingFreeToolsZakatDesc")} href="/zakat-gratuit" zakat />
            <FreeToolCard icon={Search} title={t("landingFreeToolsScreenerTitle")} text={t("landingFreeToolsScreenerDesc")} href="/screener" />
          </div>
          <p className="mt-8 text-center text-sm italic text-[#8d9aa8]">{t("landingFreeToolsMusaffaNote")}</p>
        </div>
      </section>
      <section id="tarifs" className="fade-in-section scroll-mt-24 px-6 py-24 sm:px-10">
        <div className="mx-auto max-w-[980px]">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#c9a84c]">{t("landingPricingEyebrow")}</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">{t("landingPricingTitle")}</h2>
            <p className="mt-4 text-sm text-[#a9a291]">{t("landingPricingSubtitle")}</p>
          </div>
          <div className="mx-auto mt-12 grid max-w-[860px] gap-6 md:grid-cols-2">
            <PricingCard title={t("landingPricingFreeTitle")} price="0€" subtitle={t("landingPricingFreeSubtitle")} features={freePricingFeatures.map((key) => t(key))} href="/onboarding/welcome" />
            <PricingCard premium title={t("landingPricingPremiumTitle")} price="9,99€" subtitle={t("landingPricingPremiumSubtitle")} features={premiumPricingFeatures.map((key) => t(key))} href="mailto:hello@halisia.finance" />
          </div>
          <p className="mt-8 text-center text-xs text-[#8d9aa8]">{t("landingPricingBetaNote")}</p>
        </div>
      </section>
      <section id="faq" className="fade-in-section scroll-mt-24 bg-[#07111c] px-6 py-24 sm:px-10">
        <div className="mx-auto max-w-[900px]">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">{t("landingFaqTitle")}</h2>
          </div>
          <div className="mt-10 space-y-3">
            {faqItems.map(([questionKey, answerKey]) => (
              <details key={questionKey} className="group rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                  {t(questionKey)}
                  <ChevronDown className="h-4 w-4 shrink-0 text-[#c9a84c] transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-4 border-t border-white/[0.07] pt-4 text-sm leading-7 text-[#a9a291]">{t(answerKey)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <section id="cta-final" className="fade-in-section scroll-mt-24 relative overflow-hidden px-6 py-28 text-center sm:px-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(201,168,76,0.13),transparent_58%)]" />
        <div className="relative">
          <h2 className="text-3xl font-bold sm:text-5xl">{t("landingCtaTitle")}</h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-[#c9c0af]">{t("landingCtaSubtitle")}</p>
          <Link href="/onboarding/welcome" className="mt-8 inline-flex h-14 items-center gap-3 rounded-full bg-[#d2ad45] px-8 text-sm font-bold text-[#4d3b0d] shadow-[0_9px_28px_rgba(201,168,76,0.23)] hover:bg-[#dfbd58]">
            {t("landingCtaButton")} <TrendingUp className="h-4 w-4" />
          </Link>
          <p className="mt-5 text-xs text-[#8d9aa8]">{t("landingCtaNote")}</p>
        </div>
      </section>
    </>
  );
}

function ScreenerLandingSection() {
  const { t } = useI18n();
  return (
    <section id="screener" className="fade-in-section scroll-mt-24 border-b border-white/[0.06] bg-[#111412] px-6 py-24 sm:px-10">
      <div className="mx-auto grid max-w-[1180px] items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#c9a84c]">{t("landingScreenerEyebrow")}</p>
          <h2 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">{t("landingScreenerTitle")}</h2>
          <p className="mt-5 max-w-xl text-sm leading-7 text-[#c9c0af]">{t("landingScreenerDesc")}</p>
          {checkpoints([t("landingScreenerCheckpoint1"), t("landingScreenerCheckpoint2"), t("landingScreenerCheckpoint3")])}
          <Link href="/screener" className="mt-8 inline-flex h-11 items-center gap-2 rounded-lg bg-[#d2ad45] px-5 text-sm font-bold text-[#4d3b0d] hover:bg-[#dfbd58]">
            {t("landingOpenScreener")} <span>→</span>
          </Link>
        </div>
        <div>
          <ScreeningMockup />
        </div>
      </div>
    </section>
  );
}

function FreeToolCard({ icon: Icon, title, text, href, zakat = false }: { icon: typeof Coins; title: string; text: string; href: string; zakat?: boolean }) {
  const { t } = useI18n();
  const [salary, setSalary] = useState(0);
  const [investments, setInvestments] = useState(0);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ ticker: string; name: string }>>([]);
  const [screening, setScreening] = useState<{ name: string; status: string; revenue?: number } | null>(null);
  const [searching, setSearching] = useState(false);
  const zakatBase = salary + investments;

  async function searchAssets(value: string) {
    setSearch(value);
    setScreening(null);
    if (!value.trim()) return setSuggestions([]);
    setSearching(true);
    try {
      const response = await fetch(`/api/search-assets?q=${encodeURIComponent(value)}`);
      setSuggestions(response.ok ? (await response.json()).slice(0, 4) : []);
    } finally {
      setSearching(false);
    }
  }

  async function selectAsset(asset: { ticker: string; name: string }) {
    setSearch(asset.ticker);
    setSuggestions([]);
    setSearching(true);
    try {
      const response = await fetch("/api/alpha-screening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: asset.ticker }),
      });
      const data = await response.json();
      const revenue = data.criteria?.find((criterion: { key?: string }) => criterion.key === "impureRevenue")?.ratio;
      const status =
        data.status === "COMPLIANT"
          ? t("statusCompliant").toUpperCase()
          : data.status === "NON_COMPLIANT"
            ? t("statusNonCompliant").toUpperCase()
            : t("statusToReview").toUpperCase();
      setScreening({ name: data.companyName ?? asset.name, status, revenue });
    } finally {
      setSearching(false);
    }
  }

  return (
    <article className="rounded-2xl border border-white/[0.09] bg-[#0d1722] p-6 sm:p-8">
      <Icon className="h-10 w-10 text-[#c9a84c]" />
      <h3 className="mt-5 text-xl font-bold">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#a9a291]">{text}</p>
      <div className="mt-6 rounded-xl border border-white/[0.07] bg-[#07111c] p-4 text-sm">
        {zakat ? (
          <>
            <input
              type="number"
              min="0"
              value={salary || ""}
              onChange={(event) => setSalary(Number(event.target.value) || 0)}
              placeholder={t("landingFreeToolSalaryPlaceholder")}
              className="mb-2 h-10 w-full rounded-lg border border-white/[0.08] bg-[#151b18] px-3 text-white outline-none focus:border-[#c9a84c]"
            />
            <input
              type="number"
              min="0"
              value={investments || ""}
              onChange={(event) => setInvestments(Number(event.target.value) || 0)}
              placeholder={t("landingFreeToolInvestmentsPlaceholder")}
              className="h-10 w-full rounded-lg border border-white/[0.08] bg-[#151b18] px-3 text-white outline-none focus:border-[#c9a84c]"
            />
            <div className="mt-4 flex justify-between border-t border-white/[0.08] pt-3">
              <span className="font-semibold">{zakatBase > 5950 ? t("estimatedZakat") : t("landingFreeToolResult")}</span>
              <strong className="text-[#e6c364]">
                {zakatBase > 5950 ? `${(zakatBase * 0.025).toFixed(2).replace(".", ",")} €` : t("nisabNotReached")}
              </strong>
            </div>
          </>
        ) : (
          <div className="relative">
            <div className="flex items-center gap-3 rounded-lg border border-white/[0.08] px-3 py-2 text-[#a9a291]">
              <Search className="h-4 w-4" />
              <input
                value={search}
                onChange={(event) => void searchAssets(event.target.value)}
                placeholder={t("landingFreeToolSearchPlaceholder")}
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#8d9aa8]"
              />
            </div>
            {(suggestions.length > 0 || searching) && (
              <div className="absolute left-0 right-0 top-12 z-10 overflow-hidden rounded-lg border border-white/[0.08] bg-[#1a1c1a] shadow-xl">
                {searching ? (
                  <p className="p-3 text-xs text-[#a9a291]">{t("searching")}</p>
                ) : (
                  suggestions.map((asset) => (
                    <button
                      type="button"
                      key={asset.ticker}
                      onClick={() => void selectAsset(asset)}
                      className="block w-full border-b border-white/[0.06] px-3 py-2 text-left text-xs hover:bg-white/[0.05]"
                    >
                      <strong>{asset.ticker}</strong>
                      <span className="ml-2 text-[#a9a291]">{asset.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
            {screening && (
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <strong>{screening.name}</strong>
                  <span className={screening.status === t("statusCompliant").toUpperCase() ? "text-[#10b981]" : "text-[#f59e0b]"}>{screening.status}</span>
                </div>
                <p className="mt-2 text-xs text-[#a9a291]">
                  {t("landingFreeToolImpureRevenue")}{" "}
                  {screening.revenue == null ? t("landingFreeToolUnknown") : `${(screening.revenue * 100).toFixed(2).replace(".", ",")} %`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      <Link href={href} className="mt-6 flex h-11 items-center justify-center rounded-lg border border-[#c9a84c] text-sm font-semibold text-[#e6c364] hover:bg-[#c9a84c]/10">
        {zakat ? t("landingFreeToolCalculateDetail") : t("landingFreeToolViewFullAnalysis")} <span className="ml-2">→</span>
      </Link>
      <p className="mt-3 text-center text-[11px] text-[#8d9aa8]">{t("landingFreeToolNoSignup")}</p>
    </article>
  );
}

function PricingCard({ title, price, subtitle, features, href, premium = false }: { title: string; price: string; subtitle: string; features: string[]; href: string; premium?: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function joinWaitlist(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const response = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setSaving(false);
    if (response.ok) setSaved(true);
  }

  return (
    <article className={`relative rounded-2xl border p-7 ${premium ? "border-[#c9a84c] bg-[#132236] shadow-[0_0_30px_rgba(201,168,76,0.15)]" : "border-[#1e3248] bg-[#132236]"}`}>
      {premium && <span className="absolute right-5 top-5 rounded-full bg-[#c9a84c]/15 px-3 py-1 text-[10px] font-bold text-[#e6c364]">{t("landingPricingComingSoon")}</span>}
      <p className="text-sm font-semibold text-[#c9c0af]">{title}</p>
      <p className={`mt-4 text-4xl font-bold ${premium ? "text-[#e6c364]" : "text-white"}`}>{price}</p>
      <p className="mt-1 text-xs text-[#8d9aa8]">{subtitle}</p>
      <ul className="mt-7 space-y-3 text-sm">
        {features.map((feature, index) => (
          <li key={feature} className={`flex gap-2 ${index > 3 && !premium ? "text-[#687586]" : "text-[#d7d1c5]"}`}>
            <span className={index > 3 && !premium ? "text-[#687586]" : "text-[#10b981]"}>{index > 3 && !premium ? "✕" : "✓"}</span>
            {feature}
          </li>
        ))}
      </ul>
      {premium ? (
        <button type="button" onClick={() => setOpen(true)} className="mt-8 flex h-11 w-full items-center justify-center rounded-lg bg-[#d2ad45] text-sm font-semibold text-[#4d3b0d] hover:bg-[#dfbd58]">
          {t("landingPricingNotifyLaunch")}
        </button>
      ) : (
        <Link href={href} className="mt-8 flex h-11 w-full items-center justify-center rounded-lg border border-[#c9a84c] text-sm font-semibold text-[#e6c364] hover:bg-[#c9a84c]/10">
          {t("landingPricingStartFree")}
        </Link>
      )}
      {open && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-[#c9a84c]/40 bg-[#1a1c1a] p-7 shadow-2xl">
            <button type="button" onClick={() => setOpen(false)} aria-label={t("close")} className="absolute right-4 top-3 text-xl text-[#a9a291]">
              ×
            </button>
            {saved ? (
              <>
                <h3 className="text-xl font-bold">{t("landingPricingWaitlistJoined")}</h3>
                <p className="mt-3 text-sm text-[#a9a291]">{t("landingPricingWaitlistJoinedDesc")}</p>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold">{t("landingPricingNotifyTitle")}</h3>
                <p className="mt-2 text-sm text-[#a9a291]">{t("landingPricingNotifyDesc")}</p>
                <form onSubmit={joinWaitlist} className="mt-5 space-y-3">
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="vous@exemple.com"
                    className="h-11 w-full rounded-lg border border-white/[0.1] bg-[#151b18] px-3 text-sm text-white outline-none focus:border-[#c9a84c]"
                  />
                  <button disabled={saving} className="h-11 w-full rounded-lg bg-[#d2ad45] text-sm font-bold text-[#4d3b0d] disabled:opacity-60">
                    {saving ? t("saving") : t("landingPricingJoinWaitlist")}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
