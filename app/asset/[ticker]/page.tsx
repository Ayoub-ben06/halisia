import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, CheckCircle2, WalletCards } from "lucide-react";
import YahooFinance from "yahoo-finance2";
import { AssetSearch } from "@/components/dashboard/asset-search";
import { ExpandableDescription } from "@/components/asset/expandable-description";
import { createClient } from "@/lib/supabase/server";
import { halalMock } from "@/lib/halal-mock";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

function typeLabel(type?: string) {
  if (type === "EQUITY") return "ACTION";
  if (type === "ETF") return "ETF";
  if (type === "CRYPTOCURRENCY") return "CRYPTO";
  return type ?? "ACTIF";
}

function compact(value?: number, currency?: string) {
  if (typeof value !== "number") return "—";
  return new Intl.NumberFormat("fr-FR", {
    notation: "compact",
    maximumFractionDigits: 1,
    ...(currency ? { style: "currency" as const, currency } : {}),
  }).format(value);
}

export const dynamic = "force-dynamic";

export default async function AssetPage({ params }: { params: { ticker: string } }) {
  const ticker = decodeURIComponent(params.ticker).toUpperCase();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let quote;
  try {
    quote = await yahooFinance.quote(ticker);
  } catch {
    redirect("/dashboard_v1?error=asset-not-found");
  }

  const [details, assetsResult, cryptoResult, goldResult] = await Promise.all([
    yahooFinance.quoteSummary(ticker, { modules: ["assetProfile", "summaryDetail", "financialData"] }).catch(() => null),
    supabase.from("assets").select("*").eq("user_id", user.id),
    supabase.from("crypto_assets").select("*").eq("user_id", user.id),
    supabase.from("gold_assets").select("*").eq("user_id", user.id),
  ]);

  const baseTicker = ticker.split(/[.=]/)[0];
  const fortuneoHolding = (assetsResult.data ?? []).find((asset) => {
    const tickerInName = asset.name.match(/\(([^)]+)\)\s*$/)?.[1]?.toUpperCase();
    return asset.ticker?.toUpperCase() === ticker || tickerInName === baseTicker;
  });
  const cryptoHolding = (cryptoResult.data ?? []).find((asset) => asset.ticker.toUpperCase() === baseTicker);
  const goldHolding = (goldResult.data ?? []).find((asset) => asset.ticker.toUpperCase() === baseTicker);
  const quantity = fortuneoHolding
    ? Number(fortuneoHolding.quantity)
    : cryptoHolding
      ? Number(cryptoHolding.quantity)
      : goldHolding
        ? Number(goldHolding.quantity_grams)
        : null;
  const averagePrice = fortuneoHolding
    ? Number(fortuneoHolding.average_buy_price)
    : cryptoHolding
      ? Number(cryptoHolding.average_buy_price)
      : goldHolding
        ? Number(goldHolding.average_buy_price_per_gram)
        : null;
  const account = fortuneoHolding?.account_type ?? (cryptoHolding || goldHolding ? "BITPANDA" : null);
  const currentPrice = quote.regularMarketPrice;
  const currentValue = quantity !== null && typeof currentPrice === "number" ? quantity * currentPrice : null;
  const invested = quantity !== null && averagePrice !== null ? quantity * averagePrice : null;
  const gain = currentValue !== null && invested !== null ? currentValue - invested : null;
  const gainPercent = gain !== null && invested ? (gain / invested) * 100 : null;
  const currency = quote.currency ?? details?.summaryDetail?.currency ?? "EUR";
  const money = new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 2 });
  const name = quote.longName ?? quote.shortName ?? quote.displayName ?? ticker;
  const profile = details?.assetProfile;
  const marketCap = quote.marketCap ?? details?.summaryDetail?.marketCap;
  const low = quote.fiftyTwoWeekLow;
  const high = quote.fiftyTwoWeekHigh;
  const rangePosition = typeof currentPrice === "number" && typeof low === "number" && typeof high === "number" && high > low
    ? Math.min(100, Math.max(0, ((currentPrice - low) / (high - low)) * 100))
    : 50;
  const dayChange = quote.regularMarketChange;
  const dayChangePercent = quote.regularMarketChangePercent;
  const positiveDay = (dayChange ?? 0) >= 0;
  const halal = halalMock[ticker];
  const initials = baseTicker.slice(0, 2);

  return (
    <div className="min-h-screen bg-[#0c0f0d] text-[#e2e3df]">
      <header className="flex h-20 items-center gap-5 border-b border-[#4d4637]/15 px-4 sm:px-8">
        <div className="w-full max-w-sm"><AssetSearch variant="v1" /></div>
        <div className="ml-auto flex items-center gap-3">
          <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1e201e]"><Bell className="h-4 w-4 text-[#d0c5b2]" /></button>
          <Link href="/dashboard_v1" className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#c9a84c]/20 bg-[#1e201e] text-[#c9a84c]"><WalletCards className="h-4 w-4" /></Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#c9a84c]/20 text-sm font-bold text-[#c9a84c]">{user.email?.charAt(0).toUpperCase()}</div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] p-4 sm:p-8">
        <Link href="/dashboard_v1" className="text-xs text-[#d0c5b2] hover:text-[#c9a84c]">← Retour au dashboard</Link>

        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <section className="flex items-center gap-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#4d4637]/25 bg-[#1e201e] text-lg font-bold text-[#e6c364]">{initials}</div>
              <div><h1 className="text-3xl font-bold sm:text-4xl">{name}</h1><div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#d0c5b2]"><span>{ticker}</span><span>•</span><span>{quote.fullExchangeName ?? quote.exchange ?? "—"}</span><span>•</span><span className="rounded-full border border-[#4d4637]/30 px-2 py-0.5 text-[10px]">{typeLabel(quote.quoteType)}</span></div></div>
            </section>

            <section className="rounded-[2rem] border border-[#4d4637]/20 bg-[#1e201e] p-6 sm:p-8">
              <div className="flex flex-wrap items-baseline gap-4"><p className="text-4xl font-bold">{typeof currentPrice === "number" ? money.format(currentPrice) : "—"}</p><p className={`font-bold ${positiveDay ? "text-[#e6c364]" : "text-red-500"}`}>{typeof dayChange === "number" ? `${dayChange >= 0 ? "+" : ""}${money.format(dayChange)}` : "—"} {typeof dayChangePercent === "number" ? `(${dayChangePercent >= 0 ? "+" : ""}${dayChangePercent.toFixed(2)} %)` : ""}</p></div>
              <div className="mt-6 border-t border-dotted border-[#c9a84c]/25 pt-5"><div className="relative h-1 rounded-full bg-[#333533]"><span className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#c9a84c]" style={{ left: `${rangePosition}%` }} /></div><div className="mt-4 flex justify-between text-xs text-[#d0c5b2]"><span>52 sem. bas : {typeof low === "number" ? money.format(low) : "—"}</span><span>52 sem. haut : {typeof high === "number" ? money.format(high) : "—"}</span></div></div>
            </section>

            <section className={`rounded-[2rem] border p-6 sm:p-8 ${halal?.status === "compliant" ? "border-[#c9a84c]/50 bg-gradient-to-r from-[#c9a84c]/10 to-[#1e201e]" : "border-[#4d4637]/20 bg-[#1e201e]"}`}>
              {halal ? <><h2 className={`flex items-center gap-3 text-2xl font-bold ${halal.status === "compliant" ? "text-[#e6c364]" : halal.status === "non_compliant" ? "text-red-500" : "text-amber-500"}`}><CheckCircle2 className="h-6 w-6" />{halal.status === "compliant" ? "CONFORME" : halal.status === "non_compliant" ? "NON CONFORME" : "DÉBATTU"}</h2><p className="mt-2 text-xs text-[#d0c5b2]">Basé sur les critères AAOIFI</p><p className="mt-7 text-sm leading-6 text-[#e2e3df]">{halal.reason}</p><div className="mt-7 grid gap-4 sm:grid-cols-3"><Metric label="Dette / capitalisation" value={halal.debtRatio ?? "—"} hint="Limite : 30 %" /><Metric label="Revenus illicites" value={halal.illicitRevenue ?? "—"} hint="Limite : 5 %" /><Metric label="Secteur" value={halal.sector ?? profile?.sectorDisp ?? profile?.sector ?? "—"} hint={profile?.industryDisp ?? profile?.industry ?? ""} /></div></> : <><h2 className="text-xl font-bold text-[#d0c5b2]">⏳ Analyse en cours</h2><p className="mt-3 text-sm text-[#d0c5b2]">Le statut de conformité de cet actif sera disponible prochainement.</p><p className="mt-6 text-xs text-[#d0c5b2]">Basé sur les critères AAOIFI</p></>}
            </section>

            {profile?.longBusinessSummary && <section className="rounded-[2rem] border border-[#4d4637]/20 bg-[#1e201e] p-6 sm:p-8"><h2 className="text-xl font-medium">À propos</h2><div className="mt-5"><ExpandableDescription text={profile.longBusinessSummary} /></div></section>}
          </div>

          <aside className="space-y-6 lg:col-span-4">
            <section className="rounded-[2rem] border border-[#4d4637]/20 bg-[#1e201e] p-6 sm:p-8">
              <h2 className="flex items-center gap-2 text-lg font-medium"><WalletCards className="h-5 w-5 text-[#c9a84c]" />Dans votre portefeuille</h2>
              {quantity !== null ? <div className="mt-7 divide-y divide-[#4d4637]/15 text-sm"><PortfolioDatum label="Quantité" value={quantity.toLocaleString("fr-FR", { maximumFractionDigits: 8 })} /><PortfolioDatum label="PRU" value={averagePrice !== null ? money.format(averagePrice) : "—"} /><PortfolioDatum label="Valeur actuelle" value={currentValue !== null ? money.format(currentValue) : "—"} /><PortfolioDatum label="Plus-value" value={gain !== null ? `${gain >= 0 ? "+" : ""}${money.format(gain)} ${gainPercent !== null ? `(${gainPercent >= 0 ? "+" : ""}${gainPercent.toFixed(1)} %)` : ""}` : "—"} accent={gain !== null ? gain >= 0 : undefined} /><PortfolioDatum label="Compte" value={account ?? "—"} badge /></div> : <p className="mt-7 text-sm text-[#d0c5b2]">Cet actif n&apos;est pas présent dans votre portefeuille.</p>}
              <Link href="/dashboard_v1" className="mt-7 block rounded-xl border border-[#c9a84c] px-4 py-3 text-center text-xs font-bold text-[#e6c364] hover:bg-[#c9a84c]/10">Voir mon portefeuille</Link>
            </section>

            <section className="rounded-[2rem] border border-[#4d4637]/20 bg-[#1e201e] p-6 sm:p-8"><h2 className="text-lg font-medium">Informations clés</h2><div className="mt-7 grid grid-cols-2 gap-x-6 gap-y-7"><KeyInfo label="Capitalisation" value={compact(marketCap, currency)} /><KeyInfo label="Secteur" value={profile?.industryDisp ?? profile?.sectorDisp ?? profile?.sector ?? "—"} /><KeyInfo label="Pays" value={profile?.country ?? "—"} /><KeyInfo label="Devise" value={currency} /></div></section>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) { return <div className="rounded-2xl bg-[#0c0f0d] p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-[#d0c5b2]">{label}</p><p className="mt-2 text-lg">{value}</p><p className="mt-1 text-[10px] text-[#d0c5b2]">{hint}</p></div>; }
function PortfolioDatum({ label, value, accent, badge }: { label: string; value: string; accent?: boolean; badge?: boolean }) { return <div className="flex items-center justify-between gap-4 py-5"><span className="text-xs text-[#d0c5b2]">{label}</span><span className={`${accent === true ? "font-bold text-[#e6c364]" : accent === false ? "font-bold text-red-500" : ""} ${badge ? "rounded bg-[#0c0f0d] px-3 py-1 text-[10px]" : "text-right"}`}>{value}</span></div>; }
function KeyInfo({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-bold uppercase tracking-wider text-[#d0c5b2]">{label}</p><p className="mt-2 text-sm">{value}</p></div>; }
