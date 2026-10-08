"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CalendarDays, CheckCircle2, ChevronDown, CircleDollarSign, Coins, Droplets, HandCoins, Info, Landmark, Scale, ShieldAlert, Sparkles, TrendingUp, TriangleAlert, WalletCards } from "lucide-react";
import { ZakatCalculatorWizard, type ZakatWizardValues } from "@/components/dashboard/zakat-calculator-wizard";
import { createClient } from "@/lib/supabase/client";
import { moneyFormatter } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/providers/i18n-provider";
import type { TranslationKey } from "@/lib/i18n";

/** `illicitRatio` is a percentage; `purificationAmount` = estimated dividends × impure revenue ratio (EUR). */
export type ZakatAsset = { id: string; name: string; category: "Actions conformes" | "Actions à vérifier" | "ETF islamique" | "Or" | "Bitcoin" | "Crypto" | "Cash"; value: number; status: "compliant" | "debated" | "non_compliant" | "unknown"; purchaseDate: string; illicitRatio: number; purificationAmount: number };
export type ZakatPayment = { id: string; paid_at: string; amount: number; currency: string };
const categoryIcons: Record<ZakatAsset["category"], typeof TrendingUp> = { "Actions conformes": TrendingUp, "Actions à vérifier": TriangleAlert, "ETF islamique": Landmark, Or: Coins, Bitcoin: CircleDollarSign, Crypto: CircleDollarSign, Cash: WalletCards };
const categoryLabelKeys: Record<ZakatAsset["category"], TranslationKey> = {
  "Actions conformes": "zakatCategoryCompliantStocks",
  "Actions à vérifier": "zakatCategoryStocksToVerify",
  "ETF islamique": "zakatCategoryIslamicEtf",
  Or: "gold",
  Bitcoin: "bitcoin",
  Crypto: "crypto",
  Cash: "cash",
};

export function ZakatView({ assets, nisab, nisabBasis = "gold", goldPricePerGram, silverPricePerGram, initialPaymentDate, initialPayments = [], firstInvestmentDate, isAuthenticated, displayCurrency = "EUR", displayRate = 1 }: { assets: ZakatAsset[]; nisab: number; nisabBasis?: "gold" | "silver"; goldPricePerGram: number; silverPricePerGram: number; initialPaymentDate: string; initialPayments?: ZakatPayment[]; firstInvestmentDate?: string; isAuthenticated: boolean; displayCurrency?: string; displayRate?: number }) {
  const { t, language } = useI18n();
  const locale = language === "en" ? "en-US" : "fr-FR";
  const euro = useMemo(() => moneyFormatter(displayCurrency, displayRate), [displayCurrency, displayRate]);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [includeBitcoin, setIncludeBitcoin] = useState(true);
  const [payments, setPayments] = useState(initialPayments);
  const [guestPaid, setGuestPaid] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const yearPayments = payments.filter((payment) => payment.paid_at.startsWith(String(year)));
  const paid = isAuthenticated ? yearPayments.length > 0 : guestPaid;
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardValues, setWizardValues] = useState<ZakatWizardValues | null>(null);
  const [paymentDate, setPaymentDate] = useState(initialPaymentDate);
  const [paymentDateSaved, setPaymentDateSaved] = useState(Boolean(initialPaymentDate));
  const [savingPaymentDate, setSavingPaymentDate] = useState(false);
  const faqs = useMemo(
    () =>
      [
        ["zakatFaq1Question", "zakatFaq1Answer"],
        ["zakatFaq2Question", "zakatFaq2Answer"],
        ["zakatFaq3Question", "zakatFaq3Answer"],
        ["zakatFaq4Question", "zakatFaq4Answer"],
      ] as const satisfies ReadonlyArray<[TranslationKey, TranslationKey]>,
    [],
  );
  useEffect(() => { if (!isAuthenticated) setGuestPaid(localStorage.getItem(`zakat-paid-${year}`) === "true"); }, [year, isAuthenticated]);
  const calculation = useMemo(() => {
    const reference = new Date(`${year}-12-31T23:59:59`);
    const eligible = assets.filter((asset) => new Date(asset.purchaseDate) <= reference && (includeBitcoin || asset.category !== "Bitcoin"));
    const categories = Array.from(eligible.reduce((map, asset) => { const entry = map.get(asset.category) ?? { category: asset.category, value: 0, status: asset.status }; entry.value += asset.value; map.set(asset.category, entry); return map; }, new Map<ZakatAsset["category"], { category: ZakatAsset["category"]; value: number; status: ZakatAsset["status"] }>()).values());
    const addCategory = (category: ZakatAsset["category"], value: number) => { if (value <= 0) return; const existing = categories.find((item) => item.category === category); if (existing) existing.value += value; else categories.push({ category, value, status: "compliant" }); };
    if (wizardValues) { addCategory("Cash", wizardValues.cash + (wizardValues.includeIncome ? wizardValues.salary + wizardValues.otherIncome : 0)); addCategory("Or", wizardValues.goldGrams * goldPricePerGram); addCategory("Cash", wizardValues.silverGrams * silverPricePerGram); }
    const grossZakatable = categories.reduce((sum, item) => item.status === "non_compliant" ? sum : sum + item.value, 0);
    const zakatable = Math.max(0, grossZakatable - (wizardValues?.debts ?? 0));
    const reached = zakatable >= nisab;
    const zakat = reached ? zakatable * 0.025 : 0;
    const purificationRows = eligible.filter((asset) => asset.purificationAmount > 0).map((asset) => ({ ...asset, amount: asset.purificationAmount }));
    const purification = purificationRows.reduce((sum, asset) => sum + asset.amount, 0);
    const earliest = wizardValues?.startDate ? new Date(wizardValues.startDate) : eligible.map((asset) => new Date(asset.purchaseDate)).sort((a, b) => a.getTime() - b.getTime())[0];
    const months = earliest ? Math.max(0, Math.floor((reference.getTime() - earliest.getTime()) / 2_629_800_000)) : 0;
    return { eligible, categories, zakatable, reached, zakat, purificationRows, purification, earliest, months };
  }, [assets, includeBitcoin, nisab, wizardValues, year, goldPricePerGram, silverPricePerGram]);
  const total = calculation.zakat + calculation.purification;
  async function markPaid() {
    if (!isAuthenticated) { const next = !guestPaid; setGuestPaid(next); localStorage.setItem(`zakat-paid-${year}`, String(next)); return; }
    setSavingPayment(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (paid) {
        const { error } = await supabase.from("zakat_payments").delete().in("id", yearPayments.map((payment) => payment.id));
        if (!error) setPayments((current) => current.filter((payment) => !payment.paid_at.startsWith(String(year))));
      } else {
        const paidAt = year === currentYear ? new Date().toISOString().slice(0, 10) : `${year}-12-31`;
        const { data, error } = await supabase.from("zakat_payments").insert({ user_id: user.id, paid_at: paidAt, amount: total, currency: "EUR" }).select("id, paid_at, amount, currency").single();
        if (!error && data) setPayments((current) => [data as ZakatPayment, ...current]);
      }
    } finally {
      setSavingPayment(false);
    }
  }
  async function saveZakatProfile(values: ZakatWizardValues) {
    setWizardValues(values);
    setIncludeBitcoin(values.includeBitcoin);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("zakat_profile").upsert({
      user_id: user.id,
      start_date: values.startDate,
      include_bitcoin: values.includeBitcoin,
      include_income: values.includeIncome,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        zakat_profile: {
          ...(user.user_metadata?.zakat_profile ?? {}),
          startDate: values.startDate,
          includeBitcoin: values.includeBitcoin,
          includeIncome: values.includeIncome,
        },
      },
    });
  }
  async function savePaymentDate() {
    if (!paymentDate || !isAuthenticated) return;
    setSavingPaymentDate(true);
    setPaymentDateSaved(false);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSavingPaymentDate(false);
      return;
    }
    const { error } = await supabase
      .from("user_preferences")
      .upsert(
        { user_id: user.id, zakat_payment_date: paymentDate },
        { onConflict: "user_id" },
      );
    setSavingPaymentDate(false);
    setPaymentDateSaved(!error);
  }

  const paidLabel = paid
    ? yearPayments[0]
      ? t("paidOnCancel").replace("{date}", new Date(yearPayments[0].paid_at).toLocaleDateString(locale))
      : t("markAsPaid")
    : t("markAsPaid");

  return <div className="mx-auto max-w-[1280px] p-4 text-[#ffffff] sm:p-8">
    <header className="text-center"><span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary"><Sparkles className="h-3.5 w-3.5" />{t("zakatMethodBadge")}</span><h1 className="mt-5 text-3xl font-bold">{t("calculateYourZakat").replace("{year}", String(year))}</h1><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#a9a291]">{t("zakatHeroSubtitle")}</p><label className="relative mt-6 inline-block"><span className="sr-only">{t("referenceYear")}</span><select value={year} onChange={(event) => setYear(Number(event.target.value))} className="h-11 appearance-none rounded-lg border border-[#344038] bg-[#1a1c1a] pl-4 pr-10 text-sm outline-none focus:border-[#c9a84c]">{[currentYear, currentYear - 1, currentYear - 2].map((item) => <option key={item} value={item}>{t("referenceYearLabel").replace("{year}", String(item))}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-[#a9a291]" /></label></header>
    <section className="mt-8 grid gap-5 lg:grid-cols-3"><SummaryCard icon={Coins} label={t("zakatToPay")} value={euro.format(calculation.zakat)} badge={calculation.reached ? t("nisabReached") : t("belowNisab")} tone="gold"><button type="button" onClick={() => setWizardOpen(true)} className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#9a8035] text-sm text-[#e6c364] hover:bg-[#c9a84c]/10"><Scale className="h-4 w-4" />{t("editOrViewCalculation")}</button></SummaryCard><SummaryCard icon={Droplets} label={t("totalPurification")} value={euro.format(calculation.purification)} badge={calculation.purification > 0 ? t("actionRequired") : t("upToDate")} tone="orange" /><SummaryCard icon={HandCoins} label={t("totalToGive")} value={euro.format(total)} badge={paid ? t("paymentRecorded") : undefined} tone="light"><button type="button" onClick={() => void markPaid()} disabled={savingPayment} className={`mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border text-sm disabled:opacity-60 ${paid ? "border-emerald-500/50 text-halal-compliant" : "border-[#9a8035] text-[#e6c364] hover:bg-[#c9a84c]/10"}`}><CheckCircle2 className="h-4 w-4" />{paidLabel}</button></SummaryCard></section>
    <section id="detail-zakat" className="mt-10"><Title icon={Info}>{t("zakatCalculationDetail")}</Title><div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-t-xl border border-white/[0.05] border-l-[#c9a84c] bg-[#1a1c1a] px-5 py-4 text-xs"><span><strong>{t("nisabYearLabel").replace("{year}", String(year))}</strong> {euro.format(nisab)} <span className="text-[#8f8878]">({nisabBasis === "silver" ? t("nisabSilverHanafi") : t("nisabGoldGrams")})</span>　 <strong>{t("wealthLabel")} :</strong> {euro.format(calculation.zakatable)}</span><span className={calculation.reached ? "flex items-center gap-2 text-halal-compliant" : "flex items-center gap-2 text-halal-debated"}>{calculation.reached ? <CheckCircle2 className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4" />}{calculation.reached ? t("youExceedNisab") : t("nisabNotReached")}</span></div><div className="overflow-x-auto rounded-b-xl border border-t-0 border-white/[0.05]"><table className="w-full min-w-[700px] text-sm"><thead className="bg-[#1a1c1a] text-left text-[11px] uppercase tracking-wider text-[rgba(255,255,255,0.6)]"><tr><th className="px-4 py-4">{t("categoryColumn")}</th><th className="px-4 py-4 text-right">{t("valueColumn")}</th><th className="px-4 py-4 text-center">{t("zakatableColumn")}</th><th className="px-4 py-4 text-right">{t("zakatPercentColumn")}</th></tr></thead><tbody>{calculation.categories.map((item) => { const Icon = categoryIcons[item.category]; const allowed = item.status !== "non_compliant"; return <tr key={item.category} className="border-t border-white/[0.05] bg-[#1a1c1a] hover:bg-[#1c211d]"><td className="px-4 py-4"><span className="flex items-center gap-2"><Icon className="h-4 w-4 text-[#c9a84c]" />{t(categoryLabelKeys[item.category])}</span></td><td className="px-4 py-4 text-right">{euro.format(item.value)}</td><td className={`px-4 py-4 text-center ${allowed ? item.status === "debated" ? "text-halal-debated" : "text-halal-compliant" : "text-[#8f8878]"}`}>{allowed ? item.status === "debated" ? t("optional") : t("yesLabel") : t("noPurification")}</td><td className="px-4 py-4 text-right text-[#e6c364]">{euro.format(calculation.reached && allowed ? item.value * 0.025 : 0)}</td></tr>; })}{!calculation.categories.length && <tr><td colSpan={4} className="px-4 py-10 text-center text-[#8f8878]">{t("noAssetsForYear")}</td></tr>}</tbody></table></div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2"><div className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-[#1a1c1a] p-5"><div><p className="font-semibold">{t("includeBitcoinQuestion")}</p><p className="mt-2 max-w-md text-xs leading-5 text-[#a9a291]">{t("bitcoinZakatDisclaimer")}</p></div><button type="button" role="switch" aria-checked={includeBitcoin} onClick={() => setIncludeBitcoin(!includeBitcoin)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${includeBitcoin ? "bg-[#c9a84c]" : "bg-[#3a403b]"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${includeBitcoin ? "left-6" : "left-1"}`} /></button></div><div className="rounded-xl border border-white/[0.05] bg-[#1a1c1a] p-5"><p className="font-semibold">{t("hawlPeriod")}</p><p className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#a9a291]"><CalendarDays className="h-4 w-4" />{t("referenceDateLabel")} : {calculation.earliest ? calculation.earliest.toLocaleDateString(locale) : "—"}<span className="text-[#4d544e]">|</span>{t("durationLabel")} : {calculation.months} {t("monthsUnit")}</p></div></div>
      <div className="mt-5 rounded-xl border border-white/[0.05] border-l-2 border-l-[#c9a84c] bg-[#1a1c1a] p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="flex items-center gap-2 font-semibold"><CalendarDays className="h-4 w-4 text-[#c9a84c]" />{t("annualZakatPaymentDate")}</p>
            <p className="mt-2 text-xs leading-5 text-[#a9a291]">{t("annualZakatPaymentDateHint")}</p>
          </div>
          {isAuthenticated ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input type="date" value={paymentDate} onChange={(event) => { setPaymentDate(event.target.value); setPaymentDateSaved(false); }} className="h-11 min-w-[190px] border-[#344038] bg-[#151b18] [color-scheme:dark] focus:border-[#c9a84c]" />
              <Button type="button" onClick={() => void savePaymentDate()} disabled={!paymentDate || savingPaymentDate} className="h-11 whitespace-nowrap">
                {savingPaymentDate ? t("saving") : paymentDateSaved ? t("dateSaved") : t("saveDate")}
              </Button>
            </div>
          ) : (
            <a href="/login?next=%2Fzakat" className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg bg-[#c9a84c] px-5 text-sm font-bold text-[#111412] hover:bg-[#e6c364]">{t("signInToAddDate")}</a>
          )}
        </div>
      </div>
    </section>
    <section className="mt-10"><Title icon={Droplets}>{t("purificationDetailTitle")}</Title><p className="mt-2 text-xs text-[#a9a291]">{t("purificationDescription")}</p><div className="mt-5 overflow-x-auto rounded-xl border border-white/[0.05]"><table className="w-full min-w-[720px] text-sm"><thead className="bg-[#1a1c1a] text-left text-[11px] uppercase tracking-wider text-[rgba(255,255,255,0.6)]"><tr><th className="px-4 py-4">{t("portfolioAsset")}</th><th className="px-4 py-4 text-right">{t("positionValue")}</th><th className="px-4 py-4 text-right">{t("nonCompliantIncome")}</th><th className="px-4 py-4 text-right">{t("amountToPurify")}</th><th className="px-4 py-4 text-right">{t("statusColumn")}</th></tr></thead><tbody>{calculation.purificationRows.map((asset) => <tr key={asset.id} className="border-t border-white/[0.05] bg-[#1a1c1a]"><td className="px-4 py-4 font-medium">{asset.name}</td><td className="px-4 py-4 text-right">{euro.format(asset.value)}</td><td className="px-4 py-4 text-right text-halal-debated">{asset.illicitRatio.toFixed(2).replace(".", locale === "fr-FR" ? "," : ".")} %</td><td className="px-4 py-4 text-right">{euro.format(asset.amount)}</td><td className="px-4 py-4 text-right"><span className="inline-flex items-center gap-1 rounded-full border border-orange-500/40 bg-orange-500/10 px-2.5 py-1 text-xs text-halal-debated"><ShieldAlert className="h-3 w-3" />{t("toPurify")}</span></td></tr>)}{!calculation.purificationRows.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-[#8f8878]">{t("noNonCompliantIncomeFound")}</td></tr>}</tbody><tfoot><tr className="border-t border-white/[0.05] bg-[#1a1c1a]"><td colSpan={3} className="px-4 py-4 text-right font-semibold">{t("totalPurification")} :</td><td className="px-4 py-4 text-right font-bold text-halal-debated">{euro.format(calculation.purification)}</td><td /></tr></tfoot></table></div></section>
    <section className="mt-16"><div className="text-center"><h2 className="text-2xl font-bold">{t("zakatFaqTitle")}</h2><p className="mt-2 text-xs text-[#a9a291]">{t("zakatFaqSubtitle")}</p></div><div className="mt-7 space-y-3">{faqs.map(([questionKey, answerKey]) => <details key={questionKey} className="group rounded-xl border border-white/[0.05] bg-[#1a1c1a] px-5 py-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold">{t(questionKey)}<ChevronDown className="h-4 w-4 shrink-0 text-[#c9a84c] transition-transform group-open:rotate-180" /></summary><p className="mt-3 border-t border-white/[0.05] pt-3 text-xs leading-5 text-[#a9a291]">{t(answerKey)}</p></details>)}</div></section>
    <section className="mx-auto mt-14 max-w-4xl rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/[0.08] to-[#1a1c1a] p-7 text-center sm:p-9"><h2 className="text-2xl font-bold">{t("tiredOfRecalculating")}</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#a9a291]">{t("halisiaZakatAuto")}</p><button type="button" onClick={() => setWizardOpen(true)} className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-[#c9a84c] px-5 text-sm font-bold text-[#111412] hover:bg-[#e6c364]"><Scale className="h-4 w-4" />{t("startGuidedCalculation")}</button></section>
    <ZakatCalculatorWizard open={wizardOpen} onOpenChange={setWizardOpen} defaultStartDate={firstInvestmentDate ?? assets.map((asset) => asset.purchaseDate).filter(Boolean).sort()[0]} initialIncludeBitcoin={includeBitcoin} onComplete={(values) => { void saveZakatProfile(values); }} />
  </div>;
}

function SummaryCard({ icon: Icon, label, value, badge, tone, children }: { icon: typeof Coins; label: string; value: string; badge?: string; tone: "gold" | "orange" | "light"; children?: ReactNode }) { const color = tone === "orange" ? "text-halal-debated" : tone === "gold" ? "text-[#c9a84c]" : "text-[#ffffff]"; return <article className="min-h-[174px] rounded-2xl border border-white/[0.05] bg-[#1a1c1a] p-6"><div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm text-[rgba(255,255,255,0.6)]"><Icon className={`h-4 w-4 ${color}`} />{label}</span>{badge && <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${tone === "orange" ? "bg-halal-debated/10 text-halal-debated" : "bg-halal-compliant/10 text-halal-compliant"}`}>{badge}</span>}</div><p className={`mt-4 text-2xl font-bold ${color}`}>{value}</p>{children}</article>; }
function Title({ icon: Icon, children }: { icon: typeof Info; children: ReactNode }) { return <h2 className="flex items-center gap-2 text-xl font-bold"><Icon className="h-5 w-5 text-[#c9a84c]" />{children}</h2>; }
