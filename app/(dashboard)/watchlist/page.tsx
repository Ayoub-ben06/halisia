import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchYahooQuotes } from "@/lib/yahoo-quote";
import { resolveHalalStatus } from "@/lib/halal-status";
import { sparklinePoints } from "@/lib/sparkline";
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

  const [watchlistResult, alertsResult] = await Promise.all([
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
  ]);

  const loadError = watchlistResult.error ?? alertsResult.error;
  if (loadError) {
    throw new Error(`Impossible de charger la watchlist : ${loadError.message}`);
  }

  const watchlistRows = watchlistResult.data ?? [];
  const quotes = await fetchYahooQuotes(watchlistRows.map((row) => row.ticker));

  const items: WatchlistItem[] = watchlistRows.map((row) => {
    const quote = quotes[row.ticker];
    const halalStatus = resolveHalalStatus(row.ticker, row.name);
    const price = quote?.price ?? null;
    const changePercent = quote?.changePercent ?? null;
    const positive = (changePercent ?? 0) >= 0;

    return {
      id: row.id,
      ticker: row.ticker,
      isin: row.isin,
      name: row.name,
      exchange: row.exchange,
      type: row.type,
      addedAt: row.added_at,
      price,
      change: quote?.change ?? null,
      changePercent,
      halalStatus,
      sparkline:
        price != null ? sparklinePoints(row.ticker, price, positive) : [],
    };
  });

  const alerts: WatchlistAlert[] = (alertsResult.data ?? []).map((row) => ({
    id: row.id,
    ticker: row.ticker,
    name: row.name,
    alertType: row.alert_type,
    priceTarget: row.price_target != null ? Number(row.price_target) : null,
    isActive: row.is_active,
  }));

  return <WatchlistView items={items} alerts={alerts} />;
}
