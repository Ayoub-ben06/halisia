import { redirect } from "next/navigation";
import YahooFinance from "yahoo-finance2";
import { AssetPageView } from "@/components/asset/asset-page-view";
import type { ETFScreeningDisplay } from "@/components/asset/etf-screening-block";
import type { AssetAlert, HistoryPoint, SimilarAsset } from "@/components/asset/asset-analytics";
import { createClient } from "@/lib/supabase/server";
import { getScreeningResult } from "@/lib/halal-screening";
import type { ScreeningResult } from "@/lib/aaoifi/types";
import { estimateDividendsReceived } from "@/lib/aaoifi/dividends";
import { calculatePurification } from "@/lib/aaoifi/purification";
import { findETF, isETFScreeningStale, screenETF } from "@/lib/etf/etf-screener";
import { saveETFScreening } from "@/lib/etf/etf-persistence";
import { fetchYahooHistory } from "@/lib/yahoo-history";
import { getEntitlement } from "@/lib/entitlements";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export const dynamic = "force-dynamic";

export default async function AssetPage({ params }: { params: { ticker: string } }) {
  const ticker = decodeURIComponent(params.ticker).toUpperCase();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const access = await getEntitlement(user.id);

  let quote;
  let marketTicker = ticker;
  for (const candidate of [ticker, `${ticker}.PA`, `${ticker}.L`, `${ticker}.AS`]) {
    try {
      const candidateQuote = await yahooFinance.quote(candidate);
      if (candidateQuote) {
        quote = candidateQuote;
        marketTicker = candidate;
        break;
      }
    } catch {
      // Try the next listing for ETFs that are listed on multiple exchanges.
    }
  }
  if (!quote) redirect("/dashboard?error=asset-not-found");

  const [details, assetsResult, cryptoResult, goldResult, historyRows, alertResult, similarResult] = await Promise.all([
    yahooFinance.quoteSummary(marketTicker, { modules: ["assetProfile", "summaryDetail", "financialData", "defaultKeyStatistics"] }).catch(() => null),
    supabase.from("assets").select("*").eq("user_id", user.id),
    supabase.from("crypto_assets").select("*").eq("user_id", user.id),
    supabase.from("gold_assets").select("*").eq("user_id", user.id),
    fetchYahooHistory(marketTicker, 365),
    supabase.from("watchlist_alerts").select("id, alert_type, price_target, is_active").eq("user_id", user.id).in("ticker", Array.from(new Set([ticker, ticker.split(/[.=]/)[0]]))),
    supabase.from("screening_cache").select("ticker, result").eq("status", "COMPLIANT").neq("ticker", ticker).limit(10),
  ]);
  const history: HistoryPoint[] = historyRows;
  const alerts = (alertResult.data ?? []) as AssetAlert[];
  const similarRows = similarResult.data ?? [];
  const similarCandidates = similarRows.filter((row) => row.ticker !== ticker).slice(0, 3);
  const similar: SimilarAsset[] = (await Promise.all(similarCandidates.map(async (row) => {
    try {
      const similarQuote = await yahooFinance.quote(row.ticker);
      return { ticker: row.ticker, name: similarQuote.longName ?? similarQuote.shortName ?? row.ticker, price: similarQuote.regularMarketPrice ?? null, changePercent: similarQuote.regularMarketChangePercent ?? null };
    } catch {
      return { ticker: row.ticker, name: row.ticker, price: null, changePercent: null };
    }
  }))).slice(0, 3);

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
  const name = quote.longName ?? quote.shortName ?? quote.displayName ?? ticker;
  const profile = details?.assetProfile;
  const marketCap = quote.marketCap ?? details?.summaryDetail?.marketCap;
  const low = quote.fiftyTwoWeekLow;
  const high = quote.fiftyTwoWeekHigh;
  const rangePosition = typeof currentPrice === "number" && typeof low === "number" && typeof high === "number" && high > low
    ? Math.min(100, Math.max(0, ((currentPrice - low) / (high - low)) * 100))
    : 50;
  const isCrypto = quote.quoteType === "CRYPTOCURRENCY";
  const isETF = quote.quoteType === "ETF";
  let etfScreening: ETFScreeningDisplay | null = null;
  if (isETF) {
    const definition = findETF(ticker);
    if (definition) {
      const { data: cached } = await supabase.from("etf_screening").select("*").eq("ticker", definition.ticker).maybeSingle();
      const saved = cached && !isETFScreeningStale(cached.last_updated) ? cached : await (async () => {
        const { result, holdings } = await screenETF(definition, marketTicker);
        return saveETFScreening(definition, result, holdings);
      })();
      etfScreening = saved as ETFScreeningDisplay;
    }
  }
  let screening: ScreeningResult | null = null;
  let screeningError = "";
  if (!isCrypto && !isETF) {
    try {
      screening = (await getScreeningResult(ticker)).result;
    } catch (error) {
      screeningError = error instanceof Error ? error.message : "Unknown error";
    }
  }
  let dividendsReceived: number | null = null;
  let purificationAmount: number | null = null;
  if (!isCrypto && !isETF && screening?.purificationRatio != null && fortuneoHolding && quantity !== null) {
    dividendsReceived = await estimateDividendsReceived(ticker, quantity, fortuneoHolding.purchase_date);
    purificationAmount = dividendsReceived !== null ? calculatePurification(screening.purificationRatio, dividendsReceived) : null;
  }

  return (
    <AssetPageView
      ticker={ticker}
      name={name}
      initials={baseTicker.slice(0, 2)}
      exchange={quote.fullExchangeName ?? quote.exchange ?? "—"}
      quoteType={quote.quoteType}
      currentPrice={typeof currentPrice === "number" ? currentPrice : null}
      dayChange={quote.regularMarketChange}
      dayChangePercent={quote.regularMarketChangePercent}
      low={low}
      high={high}
      rangePosition={rangePosition}
      currency={currency}
      quantity={quantity}
      averagePrice={averagePrice}
      currentValue={currentValue}
      invested={invested}
      gain={gain}
      gainPercent={gainPercent}
      account={account}
      isCrypto={isCrypto}
      isETF={isETF}
      screening={screening}
      screeningError={screeningError}
      etfScreening={etfScreening}
      purificationRatio={screening?.purificationRatio ?? null}
      purificationAmount={purificationAmount}
      dividendsReceived={dividendsReceived}
      hasFortuneoHolding={Boolean(fortuneoHolding)}
      history={history}
      alerts={alerts}
      similar={similar}
      stats={{
        per: details?.summaryDetail?.trailingPE ?? null,
        dividendYield: details?.summaryDetail?.dividendYield ?? null,
        beta: details?.defaultKeyStatistics?.beta ?? details?.summaryDetail?.beta ?? null,
        averageVolume: details?.summaryDetail?.averageVolume ?? null,
      }}
      marketCap={marketCap}
      sector={profile?.industryDisp ?? profile?.sectorDisp ?? profile?.sector ?? undefined}
      country={profile?.country ?? undefined}
      businessSummary={profile?.longBusinessSummary}
      isPremium={access.plan !== "free"}
    />
  );
}
