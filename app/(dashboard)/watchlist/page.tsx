import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFxRate, normalizeCurrency } from "@/lib/aaoifi/fx";
import { fetchYahooQuotes } from "@/lib/yahoo-quote";
import { fetchSparklines } from "@/lib/yahoo-sparkline";
import { assetHalalStatus, getTickerScreenings, isStockAssetType } from "@/lib/halal-screening";
import {
  WatchlistView,
  type WatchlistAlert,
  type WatchlistItem,
} from "@/components/watchlist/watchlist-view";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [watchlistResult, alertsResult, preferencesResult] = await Promise.all([
    supabase
      .from("watchlist")
      .select("*")
      .eq("user_id", user.id)
      .order("added_at", { ascending: false }),
    supabase
      .from("watchlist_alerts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  const loadError = watchlistResult.error ?? alertsResult.error ?? preferencesResult.error;
  if (loadError) {
    throw new Error(`Impossible de charger la watchlist : ${loadError.message}`);
  }

  const watchlistRows = watchlistResult.data ?? [];
  const tickers = watchlistRows.map((row) => row.ticker);
  const [quotes, sparklines, screenings] = await Promise.all([
    fetchYahooQuotes(tickers),
    fetchSparklines(tickers),
    getTickerScreenings(watchlistRows.filter((row) => isStockAssetType(row.type)).map((row) => row.ticker)),
  ]);

  const candidates = await Promise.all(watchlistRows.map(async (row) => {
    const quote = quotes[row.ticker];
    const halalStatus = assetHalalStatus(row, screenings);
    const sourceCurrency = quote?.currency;
    const source = sourceCurrency ? normalizeCurrency(sourceCurrency) : null;
    const rate = source && source.code !== "EUR" ? await getFxRate(sourceCurrency!, "EUR") : 1;
    const factor = source?.factor ?? 1;
    const price = quote?.price != null && rate != null ? quote.price * factor * rate : null;
    const change = quote?.change != null && rate != null ? quote.change * factor * rate : null;

    return {
      id: row.id,
      ticker: row.ticker,
      isin: row.isin,
      name: row.name,
      exchange: row.exchange,
      type: row.type,
      addedAt: row.added_at,
      price,
      change,
      currency: "EUR",
      changePercent: quote?.changePercent ?? null,
      halalStatus,
      sparkline: sparklines[row.ticker] ?? [],
      isEurQuote: source?.code === "EUR",
    };
  }));
  const items: WatchlistItem[] = Array.from(candidates.reduce((unique, item) => {
    const key = item.name.trim().toLocaleLowerCase("fr-FR");
    const previous = unique.get(key);
    if (!previous || (item.isEurQuote && !previous.isEurQuote) || (item.price != null && previous.price == null)) unique.set(key, item);
    return unique;
  }, new Map<string, (typeof candidates)[number]>()).values()).map(({ isEurQuote: _isEurQuote, ...item }) => item);

  const alerts: WatchlistAlert[] = (alertsResult.data ?? []).map((row) => ({
    id: row.id,
    ticker: row.ticker,
    name: row.name,
    alertType: row.alert_type,
    priceTarget: row.price_target != null ? Number(row.price_target) : null,
    isActive: row.is_active,
  }));

  return (
    <WatchlistView
      items={items}
      alerts={alerts}
      complianceAlertsEnabled={preferencesResult.data?.compliance_alerts_enabled ?? false}
      priceAlertsEnabled={preferencesResult.data?.price_alerts_enabled ?? false}
    />
  );
}
