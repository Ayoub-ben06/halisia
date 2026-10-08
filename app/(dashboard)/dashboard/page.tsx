import { redirect } from "next/navigation";
import {
  DashboardContent,
  type DashboardMarketRow,
  type DashboardPortfolioRow,
} from "@/components/dashboard/dashboard-content";
import type { DashboardActiveAlert } from "@/components/dashboard/dashboard-alerts";
import { createClient } from "@/lib/supabase/server";
import {
  fetchYahooPrices,
  priceAssetsFor,
  priceKeyOf,
} from "@/lib/yahoo-prices";
import { fetchYahooQuotes } from "@/lib/yahoo-quote";
import { getLivePrices } from "@/lib/live-prices";
import {
  assetHalalStatus,
  getTickerScreenings,
  isStockAssetType,
  screeningTickerForAsset,
} from "@/lib/halal-screening";
import type { HalalStatus } from "@/lib/halal-status";
import { getUserNotifications } from "@/lib/notifications";
import { displaySettings, GOLD_NISAB_GRAMS, nisabBasisOf, SILVER_NISAB_GRAMS } from "@/lib/user-preferences";
import { getFxRate, normalizeCurrency } from "@/lib/aaoifi/fx";
import { etfHalalStatus, etfTickerForAsset } from "@/lib/etf/etf-status";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    assetsResult,
    cryptoResult,
    goldResult,
    livePrices,
    notifications,
    watchlistResult,
    activeAlertsResult,
    display,
  ] = await Promise.all([
    supabase.from("assets").select("*").eq("user_id", user.id),
    supabase.from("crypto_assets").select("*").eq("user_id", user.id),
    supabase.from("gold_assets").select("*").eq("user_id", user.id),
    getLivePrices(),
    getUserNotifications(user.id),
    supabase.from("watchlist").select("ticker, name").eq("user_id", user.id).order("added_at", { ascending: false }),
    supabase.from("watchlist_alerts").select("id, ticker, name, alert_type, price_target").eq("user_id", user.id).eq("is_active", true).order("created_at", { ascending: false }),
    displaySettings(user),
  ]);
  const assets = assetsResult.data ?? [];
  const crypto = cryptoResult.data ?? [];
  const gold = goldResult.data ?? [];
  const screeningTickers = assets
    .filter((asset) => isStockAssetType(asset.type))
    .map(screeningTickerForAsset)
    .filter((ticker): ticker is string => Boolean(ticker));
  const screenings = await getTickerScreenings(
    screeningTickers,
    Math.max(6, screeningTickers.length),
  );
  const etfTickers = assets.filter((asset) => asset.type === "etf").map(etfTickerForAsset).filter((ticker): ticker is string => Boolean(ticker));
  const { data: etfScreeningRows } = etfTickers.length
    ? await supabase.from("etf_screening").select("ticker, verdict").in("ticker", etfTickers)
    : { data: [] };
  const yahooPrices = await fetchYahooPrices(priceAssetsFor(assets));
  const watchlistRows = watchlistResult.data ?? [];
  const watchlistQuotes = await fetchYahooQuotes(watchlistRows.map((row) => row.ticker));
  const marketCandidates = await Promise.all(watchlistRows.map(async (row) => {
    const quote = watchlistQuotes[row.ticker];
    const sourceCurrency = quote?.currency;
    if (quote?.price == null || !sourceCurrency) {
      return { ticker: row.ticker, name: row.name, price: null, changePercent: quote?.changePercent ?? null, currency: "EUR", isEurQuote: false };
    }
    const source = normalizeCurrency(sourceCurrency);
    const rate = source.code === "EUR" ? 1 : await getFxRate(sourceCurrency, "EUR");
    return {
      ticker: row.ticker,
      name: row.name,
      price: rate == null ? null : quote.price * source.factor * rate,
      changePercent: quote.changePercent ?? null,
      currency: "EUR",
      isEurQuote: source.code === "EUR",
    } satisfies DashboardMarketRow & { isEurQuote?: boolean };
  }));
  const markets = Array.from(
    marketCandidates.reduce((unique, market) => {
      const key = market.name.trim().toLocaleLowerCase("fr-FR");
      const previous = unique.get(key);
      // Keep the EUR-listed quote when several exchanges represent the same company.
      if (!previous || (market.isEurQuote && !previous.isEurQuote) || (market.price != null && previous.price == null)) unique.set(key, market);
      return unique;
    }, new Map<string, DashboardMarketRow & { isEurQuote?: boolean }>()).values(),
  );
  const activeAlerts: DashboardActiveAlert[] = (activeAlertsResult.data ?? []).map((alert) => ({
    id: alert.id,
    ticker: alert.ticker,
    name: alert.name,
    alertType: alert.alert_type,
    priceTarget: alert.price_target == null ? null : Number(alert.price_target),
  }));

  const rows: DashboardPortfolioRow[] = [
    ...assets.map((asset) => {
      const invested = Number(asset.quantity) * Number(asset.average_buy_price);
      const priceKey = priceKeyOf(asset);
      const price =
        (priceKey ? yahooPrices[priceKey] : null) ??
        Number(asset.current_price ?? asset.average_buy_price);
      const value = Number(asset.quantity) * price;
      return {
        ticker:
          asset.ticker ??
          asset.name.match(/\(([^)]+)\)$/)?.[1] ??
          asset.type.toUpperCase(),
        detailTicker: asset.ticker ?? screeningTickerForAsset(asset),
        name: asset.name.replace(/\s*\([^)]+\)$/, ""),
        meta: `${asset.type === "etf" ? "ETF" : "ACTION"} • ${asset.account_type ?? asset.broker.toUpperCase()}`,
        value,
        performance: invested ? ((value - invested) / invested) * 100 : 0,
        status: asset.type === "etf" ? etfHalalStatus(asset, etfScreeningRows ?? []) : assetHalalStatus(asset, screenings),
      };
    }),
    ...crypto.map((asset) => {
      const price =
        asset.ticker === "BTC"
          ? (livePrices.btc_eur ?? Number(asset.current_price))
          : Number(asset.current_price);
      const value = Number(asset.quantity) * price;
      const invested = Number(asset.quantity) * Number(asset.average_buy_price);
      return {
        ticker: asset.ticker,
        detailTicker: `${asset.ticker}-EUR`,
        name: asset.name,
        meta: `CRYPTO • ${asset.broker.toUpperCase()}`,
        value,
        performance: invested ? ((value - invested) / invested) * 100 : 0,
        status: "debated" as const,
      };
    }),
    ...gold.map((asset) => {
      const price =
        livePrices.gold_eur_per_gram ?? Number(asset.current_price_per_gram);
      const value = Number(asset.quantity_grams) * price;
      const invested =
        Number(asset.quantity_grams) * Number(asset.average_buy_price_per_gram);
      return {
        ticker: asset.ticker,
        detailTicker: null,
        name: asset.name,
        meta: `MÉTAL • ${asset.broker.toUpperCase()}`,
        value,
        performance: invested ? ((value - invested) / invested) * 100 : 0,
        status: "compliant" as const,
      };
    }),
  ];

  const totalValue = rows.reduce((sum, row) => sum + row.value, 0);
  const totalInvested =
    assets.reduce(
      (sum, asset) =>
        sum + Number(asset.quantity) * Number(asset.average_buy_price),
      0,
    ) +
    crypto.reduce(
      (sum, asset) =>
        sum + Number(asset.quantity) * Number(asset.average_buy_price),
      0,
    ) +
    gold.reduce(
      (sum, asset) =>
        sum +
        Number(asset.quantity_grams) * Number(asset.average_buy_price_per_gram),
      0,
    );
  const performance = totalInvested
    ? ((totalValue - totalInvested) / totalInvested) * 100
    : 0;
  const goldPerGram = livePrices.gold_eur_per_gram ?? 70;
  const silverPerGram = livePrices.silver_eur_per_gram ?? 0.95;
  const nisab = nisabBasisOf(user) === "silver" ? silverPerGram * SILVER_NISAB_GRAMS : goldPerGram * GOLD_NISAB_GRAMS;
  const zakatableValue = rows
    .filter((row) => row.status !== "non_compliant")
    .reduce((sum, row) => sum + row.value, 0);
  const zakatEstimate = zakatableValue >= nisab ? zakatableValue * 0.025 : 0;
  const valueBy = (status: HalalStatus) =>
    rows
      .filter((row) => row.status === status)
      .reduce((sum, row) => sum + row.value, 0);
  const compliantValue = valueBy("compliant");
  const complianceScore = totalValue
    ? Math.round((compliantValue / totalValue) * 100)
    : 0;
  const breakdown = [
    { key: "statusCompliant" as const, value: compliantValue, color: "bg-green-500" },
    { key: "statusDoubtful" as const, value: valueBy("debated"), color: "bg-amber-500" },
    { key: "statusNonCompliant" as const, value: valueBy("non_compliant"), color: "bg-red-500" },
    { key: "notAnalyzed" as const, value: valueBy("unknown"), color: "bg-slate-500" },
  ];

  return (
    <DashboardContent
      totalValue={totalValue}
      totalInvested={totalInvested}
      performance={performance}
      zakatEstimate={zakatEstimate}
      zakatableValue={zakatableValue}
      nisabReached={zakatableValue >= nisab}
      complianceScore={complianceScore}
      breakdown={breakdown}
      rows={rows}
      notifications={notifications}
      activeAlerts={activeAlerts}
      markets={markets}
      displayCurrency={display.currency}
      displayRate={display.rate}
    />
  );
}
