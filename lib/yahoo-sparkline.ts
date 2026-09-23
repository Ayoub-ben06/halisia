import "server-only";

import { unstable_cache } from "next/cache";
import YahooFinance from "yahoo-finance2";

type Chart = { quotes?: { close?: number | null }[] };

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

async function fetchCloses(ticker: string): Promise<number[]> {
  try {
    const period1 = new Date(Date.now() - 31 * 86_400_000);
    const chart = (await yahooFinance.chart(ticker, { period1, interval: "1d" })) as unknown as Chart;
    return (chart.quotes ?? []).map((row) => row.close).filter((close): close is number => typeof close === "number" && Number.isFinite(close));
  } catch {
    return [];
  }
}

const cachedCloses = unstable_cache(fetchCloses, ["yahoo-sparkline-1mo"], { revalidate: 3600 });

/** Daily closes over the last month, for the watchlist sparklines. */
export async function fetchSparklines(tickers: string[]): Promise<Record<string, number[]>> {
  const entries = await Promise.all(tickers.map(async (ticker) => [ticker, await cachedCloses(ticker)] as const));
  return Object.fromEntries(entries);
}
