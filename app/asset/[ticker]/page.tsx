import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, WalletCards } from "lucide-react";
import YahooFinance from "yahoo-finance2";
import { ExpandableDescription } from "@/components/asset/expandable-description";
import { createClient } from "@/lib/supabase/server";
import { runAAOIFI } from "@/lib/aaoifi/engine";
import { getFinancialData } from "@/lib/aaoifi/data-provider";
import type { FinancialValue } from "@/lib/aaoifi/types";
import { estimateDividendsReceived } from "@/lib/aaoifi/dividends";
import { calculatePurification, formatPurificationRatio } from "@/lib/aaoifi/purification";

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
  let screening = null;
  let screeningError = "";
  try {
    const financialData = await getFinancialData(ticker);
    if (!financialData.marketCapitalization && typeof quote.marketCap === "number") financialData.marketCapitalization = { value: quote.marketCap, currency: quote.currency ?? "USD", source: { provider: "Yahoo Finance", fiscalPeriod: financialData.fiscalPeriod, field: "marketCap" }, confidence: "MEDIUM" } satisfies FinancialValue;
    screening = runAAOIFI(financialData);
  } catch (error) {
    screeningError = error instanceof Error ? error.message : "Erreur inconnue";
  }
  let dividendsReceived: number | null = null;
  if (screening?.purificationRatio != null && fortuneoHolding && quantity !== null) {
    dividendsReceived = await estimateDividendsReceived(ticker, quantity, fortuneoHolding.purchase_date);
    screening.purificationAmount = dividendsReceived !== null ? calculatePurification(screening.purificationRatio, dividendsReceived) : null;
  }
  const purificationText = screening?.purificationRatio == null
    ? null
    : !fortuneoHolding
      ? formatPurificationRatio(screening.purificationRatio)
      : dividendsReceived === null
        ? `${formatPurificationRatio(screening.purificationRatio)} (dividendes reçus indisponibles)`
        : screening.purificationAmount
          ? `Purification due : ${money.format(screening.purificationAmount)}`
          : "Aucune purification requise";
  const initials = baseTicker.slice(0, 2);

  return (
    <div className="min-h-screen bg-[#111412] text-[#ffffff]">
      <main className="mx-auto max-w-[1400px] p-4 sm:p-8">
        <Link href="/dashboard_v1" className="text-xs text-[rgba(255,255,255,0.6)] hover:text-[#c9a84c]">← Retour au dashboard</Link>

        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <section className="flex items-center gap-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#4d4637]/25 bg-[#1a1c1a] text-lg font-bold text-[#e6c364]">{initials}</div>
              <div><h1 className="text-3xl font-bold sm:text-4xl">{name}</h1><div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[rgba(255,255,255,0.6)]"><span>{ticker}</span><span>•</span><span>{quote.fullExchangeName ?? quote.exchange ?? "—"}</span><span>•</span><span className="rounded-full border border-[#4d4637]/30 px-2 py-0.5 text-[10px]">{typeLabel(quote.quoteType)}</span></div></div>
            </section>

            <section className="rounded-[2rem] border border-white/[0.05] bg-[#1a1c1a] p-6 sm:p-8">
              <div className="flex flex-wrap items-baseline gap-4"><p className="text-4xl font-bold">{typeof currentPrice === "number" ? money.format(currentPrice) : "—"}</p><p className={`font-bold ${positiveDay ? "text-[#e6c364]" : "text-red-500"}`}>{typeof dayChange === "number" ? `${dayChange >= 0 ? "+" : ""}${money.format(dayChange)}` : "—"} {typeof dayChangePercent === "number" ? `(${dayChangePercent >= 0 ? "+" : ""}${dayChangePercent.toFixed(2)} %)` : ""}</p></div>
              <div className="mt-6 border-t border-dotted border-[#c9a84c]/25 pt-5"><div className="relative h-1 rounded-full bg-[#333533]"><span className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#c9a84c]" style={{ left: `${rangePosition}%` }} /></div><div className="mt-4 flex justify-between text-xs text-[rgba(255,255,255,0.6)]"><span>52 sem. bas : {typeof low === "number" ? money.format(low) : "—"}</span><span>52 sem. haut : {typeof high === "number" ? money.format(high) : "—"}</span></div></div>
            </section>

            <section className={`rounded-[2rem] border p-6 sm:p-8 ${screening?.status === "COMPLIANT" ? "border-halal-compliant/30 bg-gradient-to-r from-halal-compliant/10 to-[#1a1c1a]" : "border-white/[0.05] bg-[#1a1c1a]"}`}>
              {screening ? <><h2 className={`flex items-center gap-3 text-2xl font-bold ${screening.status === "COMPLIANT" ? "text-halal-compliant" : screening.status === "NON_COMPLIANT" ? "text-halal-nonCompliant" : "text-halal-debated"}`}><CheckCircle2 className="h-6 w-6" />{screening.status}</h2><p className="mt-2 text-xs text-[rgba(255,255,255,0.6)]">{screening.methodology} · {screening.fiscalPeriod}</p>{(screening.reason || screening.note) && <div className="mt-5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-xs leading-5">{screening.reason && <p className="text-[#ffffff]">{screening.reason}</p>}{screening.note && <p className="mt-1 text-[rgba(255,255,255,0.6)]">{screening.note}</p>}</div>}{purificationText && <p className="mt-5 text-sm font-semibold text-[#e6c364]">{purificationText}{fortuneoHolding && dividendsReceived ? <span className="ml-2 text-[10px] font-normal text-[rgba(255,255,255,0.6)]">({(screening.purificationRatio! * 100).toFixed(2)} % de {money.format(dividendsReceived)} de dividendes estimés)</span> : null}</p>}<p className="mt-7 text-sm leading-6 text-[#ffffff]">{screening.business.explanation}</p><div className="mt-7 grid gap-4 sm:grid-cols-2">{screening.criteria.map((criterion) => <Metric key={criterion.key} label={criterion.label} value={criterion.ratio !== undefined ? `${(criterion.ratio * 100).toFixed(2)} %` : criterion.status} hint={criterion.threshold !== undefined ? `Limite : ${criterion.operator} ${(criterion.threshold * 100).toFixed(0)} %` : `Confiance : ${criterion.confidence}`} />)}</div><Link href={`/screening?symbol=${encodeURIComponent(screening.ticker)}`} className="mt-6 inline-block text-xs font-bold text-[#e6c364] hover:underline">Voir le détail complet du screening →</Link><p className="mt-5 text-[10px] leading-4 text-[rgba(255,255,255,0.6)]">Les résultats sont basés sur les critères AAOIFI et les données financières publiques disponibles. Certains cas limites nécessitent une vérification manuelle. Ce n&apos;est pas une fatwa.</p></> : <><h2 className="text-xl font-bold text-[rgba(255,255,255,0.6)]">Analyse AAOIFI indisponible</h2><p className="mt-3 text-sm text-[rgba(255,255,255,0.6)]">Les données financières publiques ne sont pas accessibles pour cet actif.</p>{screeningError && <p className="mt-3 break-words text-xs text-red-400">Détail technique : {screeningError}</p>}</>}
            </section>

            {profile?.longBusinessSummary && <section className="rounded-[2rem] border border-white/[0.05] bg-[#1a1c1a] p-6 sm:p-8"><h2 className="text-xl font-medium">À propos</h2><div className="mt-5"><ExpandableDescription text={profile.longBusinessSummary} /></div></section>}
          </div>

          <aside className="space-y-6 lg:col-span-4">
            <section className="rounded-[2rem] border border-white/[0.05] bg-[#1a1c1a] p-6 sm:p-8">
              <h2 className="flex items-center gap-2 text-lg font-medium"><WalletCards className="h-5 w-5 text-[#c9a84c]" />Dans votre portefeuille</h2>
              {quantity !== null ? <div className="mt-7 divide-y divide-white/[0.05] text-sm"><PortfolioDatum label="Quantité" value={quantity.toLocaleString("fr-FR", { maximumFractionDigits: 8 })} /><PortfolioDatum label="PRU" value={averagePrice !== null ? money.format(averagePrice) : "—"} /><PortfolioDatum label="Valeur actuelle" value={currentValue !== null ? money.format(currentValue) : "—"} /><PortfolioDatum label="Plus-value" value={gain !== null ? `${gain >= 0 ? "+" : ""}${money.format(gain)} ${gainPercent !== null ? `(${gainPercent >= 0 ? "+" : ""}${gainPercent.toFixed(1)} %)` : ""}` : "—"} accent={gain !== null ? gain >= 0 : undefined} /><PortfolioDatum label="Compte" value={account ?? "—"} badge /></div> : <p className="mt-7 text-sm text-[rgba(255,255,255,0.6)]">Cet actif n&apos;est pas présent dans votre portefeuille.</p>}
              <Link href="/dashboard_v1" className="mt-7 block rounded-xl border border-[#c9a84c] px-4 py-3 text-center text-xs font-bold text-[#e6c364] hover:bg-[#c9a84c]/10">Voir mon portefeuille</Link>
            </section>

            <section className="rounded-[2rem] border border-white/[0.05] bg-[#1a1c1a] p-6 sm:p-8"><h2 className="text-lg font-medium">Informations clés</h2><div className="mt-7 grid grid-cols-2 gap-x-6 gap-y-7"><KeyInfo label="Capitalisation" value={compact(marketCap, currency)} /><KeyInfo label="Secteur" value={profile?.industryDisp ?? profile?.sectorDisp ?? profile?.sector ?? "—"} /><KeyInfo label="Pays" value={profile?.country ?? "—"} /><KeyInfo label="Devise" value={currency} /></div></section>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) { return <div className="rounded-2xl bg-[#111412] p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.6)]">{label}</p><p className="mt-2 text-lg">{value}</p><p className="mt-1 text-[10px] text-[rgba(255,255,255,0.6)]">{hint}</p></div>; }
function PortfolioDatum({ label, value, accent, badge }: { label: string; value: string; accent?: boolean; badge?: boolean }) { return <div className="flex items-center justify-between gap-4 py-5"><span className="text-xs text-[rgba(255,255,255,0.6)]">{label}</span><span className={`${accent === true ? "font-bold text-[#e6c364]" : accent === false ? "font-bold text-red-500" : ""} ${badge ? "rounded bg-[#111412] px-3 py-1 text-[10px]" : "text-right"}`}>{value}</span></div>; }
function KeyInfo({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.6)]">{label}</p><p className="mt-2 text-sm">{value}</p></div>; }
