import YahooFinance from "yahoo-finance2";
import { normalizeCurrency } from "./fx";
import type { FinancialValue } from "./types";

type YahooQuote = { marketCap?: number; regularMarketPrice?: number; currency?: string; financialCurrency?: string };
type YahooChart = { quotes?: { date?: Date | string; close?: number | null }[] };

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
const AVERAGE_MONTHS = 36;
const MIN_MONTHLY_POINTS = 12;

// Debt and interest-bearing securities are compared to a trailing 36-month
// average market capitalisation (Musaffa's documented method) so that a
// temporary price dip does not flip a verdict. The historical capitalisation
// is reconstructed as currentMarketCap × close_t / currentPrice, which keeps
// every share class included in Yahoo's marketCap but ignores share-count
// changes (buybacks, issuance) over the window.
export async function getAverageMarketCap(symbol: string, fiscalPeriod: string, quote?: YahooQuote, sharesOutstanding?: number): Promise<FinancialValue | undefined> {
  const current = quote ?? await (yahooFinance.quote(symbol) as Promise<unknown> as Promise<YahooQuote>).catch(() => undefined);
  const price = current?.regularMarketPrice;
  const hasPrice = typeof price === "number" && Number.isFinite(price) && price > 0;
  // Prices of London, Johannesburg and Tel Aviv listings are quoted in minor
  // units (pence…), while Yahoo's marketCap is already in the major unit.
  const { code: currency, factor } = normalizeCurrency(current?.currency ?? current?.financialCurrency ?? "USD");
  // Some listings (ASX, NSE…) have no marketCap in the quote: it is rebuilt
  // from the share count reported in the latest balance sheet.
  const marketCap = current?.marketCap ?? (hasPrice && sharesOutstanding ? price * factor * sharesOutstanding : undefined);
  if (typeof marketCap !== "number" || !Number.isFinite(marketCap) || marketCap <= 0) return undefined;
  const field = current?.marketCap ? "marketCap" : "cours × actions en circulation";
  const instantaneous: FinancialValue = { value: marketCap, currency, source: { provider: "Yahoo Finance", document: "quote", fiscalPeriod, field }, confidence: "MEDIUM" };
  if (!hasPrice) return instantaneous;
  const period1 = new Date();
  period1.setMonth(period1.getMonth() - AVERAGE_MONTHS);
  const chart = await (yahooFinance.chart(symbol, { period1, interval: "1mo" }) as Promise<unknown> as Promise<YahooChart>).catch(() => undefined);
  const closes = (chart?.quotes ?? []).map((row) => row.close).filter((close): close is number => typeof close === "number" && Number.isFinite(close) && close > 0).slice(-AVERAGE_MONTHS);
  if (closes.length < MIN_MONTHLY_POINTS) return instantaneous;
  const averageClose = closes.reduce((sum, close) => sum + close, 0) / closes.length;
  return { value: marketCap * (averageClose / price), currency, source: { provider: "Yahoo Finance", document: "chart 1mo", fiscalPeriod, field: `${field} moyenne ${closes.length} mois` }, confidence: "MEDIUM" };
}
