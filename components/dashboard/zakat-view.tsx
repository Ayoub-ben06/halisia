"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CalendarDays, CheckCircle2, ChevronDown, CircleDollarSign, Coins, Droplets, HandCoins, Info, Landmark, Scale, ShieldAlert, Sparkles, TrendingUp, TriangleAlert, WalletCards } from "lucide-react";
import { ZakatCalculatorWizard, type ZakatWizardValues } from "@/components/dashboard/zakat-calculator-wizard";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ZakatAsset = { id: string; name: string; category: "Actions conformes" | "Actions à vérifier" | "ETF islamique" | "Or" | "Bitcoin" | "Crypto" | "Cash"; value: number; status: "compliant" | "debated" | "non_compliant" | "unknown"; purchaseDate: string; illicitRatio: number };
const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
const categoryIcons: Record<ZakatAsset["category"], typeof TrendingUp> = { "Actions conformes": TrendingUp, "Actions à vérifier": TriangleAlert, "ETF islamique": Landmark, Or: Coins, Bitcoin: CircleDollarSign, Crypto: CircleDollarSign, Cash: WalletCards };

export function ZakatView({ assets, nisab, initialPaymentDate, isAuthenticated }: { assets: ZakatAsset[]; nisab: number; initialPaymentDate: string; isAuthenticated: boolean }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [includeBitcoin, setIncludeBitcoin] = useState(true);
  const [paid, setPaid] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardValues, setWizardValues] = useState<ZakatWizardValues | null>(null);
  const [paymentDate, setPaymentDate] = useState(initialPaymentDate);
  const [paymentDateSaved, setPaymentDateSaved] = useState(Boolean(initialPaymentDate));
  const [savingPaymentDate, setSavingPaymentDate] = useState(false);
  useEffect(() => { setPaid(localStorage.getItem(`zakat-paid-${year}`) === "true"); }, [year]);
  const calculation = useMemo(() => {
    const reference = new Date(`${year}-12-31T23:59:59`);
    const eligible = assets.filter((asset) => new Date(asset.purchaseDate) <= reference && (includeBitcoin || asset.category !== "Bitcoin"));
    const categories = Array.from(eligible.reduce((map, asset) => { const entry = map.get(asset.category) ?? { category: asset.category, value: 0, status: asset.status }; entry.value += asset.value; map.set(asset.category, entry); return map; }, new Map<ZakatAsset["category"], { category: ZakatAsset["category"]; value: number; status: ZakatAsset["status"] }>()).values());
    const addCategory = (category: ZakatAsset["category"], value: number) => { if (value <= 0) return; const existing = categories.find((item) => item.category === category); if (existing) existing.value += value; else categories.push({ category, value, status: "compliant" }); };
    if (wizardValues) { addCategory("Cash", wizardValues.cash + (wizardValues.includeIncome ? wizardValues.salary + wizardValues.otherIncome : 0)); addCategory("Or", wizardValues.goldGrams * (nisab / 85)); addCategory("Cash", wizardValues.silverGrams * 0.95); }
    const grossZakatable = categories.reduce((sum, item) => item.status === "non_compliant" ? sum : sum + item.value, 0);
    const zakatable = Math.max(0, grossZakatable - (wizardValues?.debts ?? 0));
    const reached = zakatable >= nisab;
    const zakat = reached ? zakatable * 0.025 : 0;
    const purificationRows = eligible.filter((asset) => asset.illicitRatio > 0).map((asset) => ({ ...asset, amount: asset.value * asset.illicitRatio / 100 }));
    const purification = purificationRows.reduce((sum, asset) => sum + asset.amount, 0);
    const earliest = wizardValues?.startDate ? new Date(wizardValues.startDate) : eligible.map((asset) => new Date(asset.purchaseDate)).sort((a, b) => a.getTime() - b.getTime())[0];
    const months = earliest ? Math.max(0, Math.floor((reference.getTime() - earliest.getTime()) / 2_629_800_000)) : 0;
    return { eligible, categories, zakatable, reached, zakat, purificationRows, purification, earliest, months };
  }, [assets, includeBitcoin, nisab, wizardValues, year]);
  const total = calculation.zakat + calculation.purification;
  function markPaid() { const next = !paid; setPaid(next); localStorage.setItem(`zakat-paid-${year}`, String(next)); }
  async function saveZakatProfile(values: ZakatWizardValues) {
    setWizardValues(values);
    setIncludeBitcoin(values.includeBitcoin);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
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

  return <div className="mx-auto max-w-[1280px] p-4 text-[#ffffff] sm:p-8">
    <header className="text-center"><span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary"><Sparkles className="h-3.5 w-3.5" />Calcul certifié AAOIFI · Résultat en direct</span><h1 className="mt-5 text-3xl font-bold">Calculez votre Zakat {year}</h1><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#a9a291]">Retrouvez automatiquement votre assiette zakatable, votre purification et le suivi du Hawl à partir de votre portefeuille.</p><label className="relative mt-6 inline-block"><span className="sr-only">Année de référence</span><select value={year} onChange={(event) => setYear(Number(event.target.value))} className="h-11 appearance-none rounded-lg border border-[#344038] bg-[#1a1c1a] pl-4 pr-10 text-sm outline-none focus:border-[#c9a84c]">{[currentYear, currentYear - 1, currentYear - 2].map((item) => <option key={item} value={item}>Année de référence : {item}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-[#a9a291]" /></label></header>
    <section className="mt-8 grid gap-5 lg:grid-cols-3"><SummaryCard icon={Coins} label="Zakat à verser" value={euro.format(calculation.zakat)} badge={calculation.reached ? "Nisab atteint" : "Sous le nisab"} tone="gold"><button type="button" onClick={() => setWizardOpen(true)} className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#9a8035] text-sm text-[#e6c364] hover:bg-[#c9a84c]/10"><Scale className="h-4 w-4" />Modifier ou voir le calcul</button></SummaryCard><SummaryCard icon={Droplets} label="Purification totale" value={euro.format(calculation.purification)} badge={calculation.purification > 0 ? "Action requise" : "À jour"} tone="orange" /><SummaryCard icon={HandCoins} label="Total à donner" value={euro.format(total)} badge={paid ? "Versement enregistré" : undefined} tone="light"><button type="button" onClick={markPaid} className={`mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border text-sm ${paid ? "border-emerald-500/50 text-halal-compliant" : "border-[#9a8035] text-[#e6c364] hover:bg-[#c9a84c]/10"}`}><CheckCircle2 className="h-4 w-4" />{paid ? "Marqué comme versé" : "Marquer comme versé"}</button></SummaryCard></section>
    <section id="detail-zakat" className="mt-10"><Title icon={Info}>Détail du calcul Zakat</Title><div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-t-xl border border-white/[0.05] border-l-[#c9a84c] bg-[#1a1c1a] px-5 py-4 text-xs"><span><strong>Nisab {year} :</strong> {euro.format(nisab)} <span className="text-[#8f8878]">(85 g d’or)</span>　 <strong>Patrimoine :</strong> {euro.format(calculation.zakatable)}</span><span className={calculation.reached ? "flex items-center gap-2 text-halal-compliant" : "flex items-center gap-2 text-halal-debated"}>{calculation.reached ? <CheckCircle2 className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4" />}{calculation.reached ? "Vous dépassez le nisab" : "Nisab non atteint"}</span></div><div className="overflow-x-auto rounded-b-xl border border-t-0 border-white/[0.05]"><table className="w-full min-w-[700px] text-sm"><thead className="bg-[#1a1c1a] text-left text-[11px] uppercase tracking-wider text-[rgba(255,255,255,0.6)]"><tr><th className="px-4 py-4">Catégorie</th><th className="px-4 py-4 text-right">Valeur</th><th className="px-4 py-4 text-center">Zakatable</th><th className="px-4 py-4 text-right">Zakat (2,5 %)</th></tr></thead><tbody>{calculation.categories.map((item) => { const Icon = categoryIcons[item.category]; const allowed = item.status !== "non_compliant"; return <tr key={item.category} className="border-t border-white/[0.05] bg-[#1a1c1a] hover:bg-[#1c211d]"><td className="px-4 py-4"><span className="flex items-center gap-2"><Icon className="h-4 w-4 text-[#c9a84c]" />{item.category}</span></td><td className="px-4 py-4 text-right">{euro.format(item.value)}</td><td className={`px-4 py-4 text-center ${allowed ? item.status === "debated" ? "text-halal-debated" : "text-halal-compliant" : "text-[#8f8878]"}`}>{allowed ? item.status === "debated" ? "Optionnel" : "Oui" : "Non (purification)"}</td><td className="px-4 py-4 text-right text-[#e6c364]">{euro.format(calculation.reached && allowed ? item.value * 0.025 : 0)}</td></tr>; })}{!calculation.categories.length && <tr><td colSpan={4} className="px-4 py-10 text-center text-[#8f8878]">Aucun actif pour cette année.</td></tr>}</tbody></table></div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2"><div className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-[#1a1c1a] p-5"><div><p className="font-semibold">Incluez-vous le Bitcoin dans votre Zakat ?</p><p className="mt-2 max-w-md text-xs leading-5 text-[#a9a291]">Les avis divergent sur la zakatabilité des cryptomonnaies. Activez ce choix selon votre avis de référence.</p></div><button type="button" role="switch" aria-checked={includeBitcoin} onClick={() => setIncludeBitcoin(!includeBitcoin)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${includeBitcoin ? "bg-[#c9a84c]" : "bg-[#3a403b]"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${includeBitcoin ? "left-6" : "left-1"}`} /></button></div><div className="rounded-xl border border-white/[0.05] bg-[#1a1c1a] p-5"><p className="font-semibold">Période du Hawl</p><p className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#a9a291]"><CalendarDays className="h-4 w-4" />Date de référence : {calculation.earliest ? calculation.earliest.toLocaleDateString("fr-FR") : "—"}<span className="text-[#4d544e]">|</span>Durée : {calculation.months} mois</p></div></div>
      <div className="mt-5 rounded-xl border border-white/[0.05] border-l-2 border-l-[#c9a84c] bg-[#1a1c1a] p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="flex items-center gap-2 font-semibold"><CalendarDays className="h-4 w-4 text-[#c9a84c]" />Date annuelle de paiement de la Zakat</p>
            <p className="mt-2 text-xs leading-5 text-[#a9a291]">Choisissez la date à laquelle vous souhaitez payer votre Zakat chaque année. Elle sera utilisée pour votre rappel annuel.</p>
          </div>
          {isAuthenticated ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input type="date" value={paymentDate} onChange={(event) => { setPaymentDate(event.target.value); setPaymentDateSaved(false); }} className="h-11 min-w-[190px] border-[#344038] bg-[#151b18] [color-scheme:dark] focus:border-[#c9a84c]" />
              <Button type="button" onClick={() => void savePaymentDate()} disabled={!paymentDate || savingPaymentDate} className="h-11 whitespace-nowrap">
                {savingPaymentDate ? "Enregistrement…" : paymentDateSaved ? "Date enregistrée ✓" : "Enregistrer la date"}
              </Button>
            </div>
          ) : (
            <a href="/login?redirect=/zakat" className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg bg-[#c9a84c] px-5 text-sm font-bold text-[#111412] hover:bg-[#e6c364]">Se connecter pour ajouter une date</a>
          )}
        </div>
      </div>
    </section>
    <section className="mt-10"><Title icon={Droplets}>Détail de la purification</Title><p className="mt-2 text-xs text-[#a9a291]">Revenus issus de sources non conformes à reverser selon les ratios financiers disponibles.</p><div className="mt-5 overflow-x-auto rounded-xl border border-white/[0.05]"><table className="w-full min-w-[720px] text-sm"><thead className="bg-[#1a1c1a] text-left text-[11px] uppercase tracking-wider text-[rgba(255,255,255,0.6)]"><tr><th className="px-4 py-4">Actif</th><th className="px-4 py-4 text-right">Valeur position</th><th className="px-4 py-4 text-right">Revenus non conformes</th><th className="px-4 py-4 text-right">Montant à purifier</th><th className="px-4 py-4 text-right">Statut</th></tr></thead><tbody>{calculation.purificationRows.map((asset) => <tr key={asset.id} className="border-t border-white/[0.05] bg-[#1a1c1a]"><td className="px-4 py-4 font-medium">{asset.name}</td><td className="px-4 py-4 text-right">{euro.format(asset.value)}</td><td className="px-4 py-4 text-right text-halal-debated">{asset.illicitRatio.toFixed(1).replace(".", ",")} %</td><td className="px-4 py-4 text-right">{euro.format(asset.amount)}</td><td className="px-4 py-4 text-right"><span className="inline-flex items-center gap-1 rounded-full border border-orange-500/40 bg-orange-500/10 px-2.5 py-1 text-xs text-halal-debated"><ShieldAlert className="h-3 w-3" />À purifier</span></td></tr>)}{!calculation.purificationRows.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-[#8f8878]">Aucun revenu non conforme identifié.</td></tr>}</tbody><tfoot><tr className="border-t border-white/[0.05] bg-[#1a1c1a]"><td colSpan={3} className="px-4 py-4 text-right font-semibold">Total purification :</td><td className="px-4 py-4 text-right font-bold text-halal-debated">{euro.format(calculation.purification)}</td><td /></tr></tfoot></table></div></section>
    <section className="mx-auto mt-16 max-w-4xl"><div className="text-center"><h2 className="text-2xl font-bold">Questions fréquentes sur la Zakat</h2><p className="mt-2 text-xs text-[#a9a291]">Comprendre les règles Shariah et l’application pratique de votre obligation éthique.</p></div><div className="mt-7 space-y-3">{zakatFaqs.map(([question, answer]) => <details key={question} className="group rounded-xl border border-white/[0.05] bg-[#1a1c1a] px-5 py-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold">{question}<ChevronDown className="h-4 w-4 shrink-0 text-[#c9a84c] transition-transform group-open:rotate-180" /></summary><p className="mt-3 border-t border-white/[0.05] pt-3 text-xs leading-5 text-[#a9a291]">{answer}</p></details>)}</div></section>
    <section className="mx-auto mt-14 max-w-4xl rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/[0.08] to-[#1a1c1a] p-7 text-center sm:p-9"><h2 className="text-2xl font-bold">Fatigué de recalculer chaque année ?</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#a9a291]">Halisia calcule votre Zakat automatiquement, suit votre Hawl et prépare le détail de votre purification.</p><button type="button" onClick={() => setWizardOpen(true)} className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-[#c9a84c] px-5 text-sm font-bold text-[#111412] hover:bg-[#e6c364]"><Scale className="h-4 w-4" />Lancer le calcul guidé</button></section>
    <ZakatCalculatorWizard open={wizardOpen} onOpenChange={setWizardOpen} defaultStartDate={assets.map((asset) => asset.purchaseDate).sort()[0]} initialIncludeBitcoin={includeBitcoin} onComplete={(values) => { void saveZakatProfile(values); }} />
  </div>;
}

const zakatFaqs = [
  ["C’est quoi le Nisab ?", "Le Nisab est le seuil minimal de patrimoine à partir duquel la Zakat devient obligatoire. Halisia utilise comme référence la valeur de 85 grammes d’or."],
  ["Doit-on zakater sur les actions et ETF ?", "Les actifs détenus dans une intention d’investissement sont intégrés selon la méthode retenue et leur durée de détention."],
  ["Comment calculer la Zakat sur l’or et les bijoux ?", "La valeur de l’or éligible est comparée au Nisab puis intégrée à l’assiette au taux de 2,5 % lorsque les conditions sont remplies."],
  ["Le Bitcoin et les cryptomonnaies sont-ils zakatables ?", "Les avis divergent. Le calculateur permet d’inclure ou d’exclure le Bitcoin selon votre avis de référence."],
] as const;

function SummaryCard({ icon: Icon, label, value, badge, tone, children }: { icon: typeof Coins; label: string; value: string; badge?: string; tone: "gold" | "orange" | "light"; children?: ReactNode }) { const color = tone === "orange" ? "text-halal-debated" : tone === "gold" ? "text-[#c9a84c]" : "text-[#ffffff]"; return <article className="min-h-[174px] rounded-2xl border border-white/[0.05] bg-[#1a1c1a] p-6"><div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm text-[rgba(255,255,255,0.6)]"><Icon className={`h-4 w-4 ${color}`} />{label}</span>{badge && <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${tone === "orange" ? "bg-halal-debated/10 text-halal-debated" : "bg-halal-compliant/10 text-halal-compliant"}`}>{badge}</span>}</div><p className={`mt-4 text-2xl font-bold ${color}`}>{value}</p>{children}</article>; }
function Title({ icon: Icon, children }: { icon: typeof Info; children: ReactNode }) { return <h2 className="flex items-center gap-2 text-xl font-bold"><Icon className="h-5 w-5 text-[#c9a84c]" />{children}</h2>; }
