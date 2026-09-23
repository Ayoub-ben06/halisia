import "server-only";

import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export type YahooQuoteData = {
  price: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string | null;
};

export async function fetchYahooQuote(ticker: string): Promise<YahooQuoteData> {
  try {
    const quote = await yahooFinance.quote(ticker);
    return {
      price:
        typeof quote.regularMarketPrice === "number"
          ? quote.regularMarketPrice
          : null,
      change:
        typeof quote.regularMarketChange === "number"
          ? quote.regularMarketChange
          : null,
      changePercent:
        typeof quote.regularMarketChangePercent === "number"
          ? quote.regularMarketChangePercent
          : null,
      currency: typeof quote.currency === "string" ? quote.currency : null,
    };
  } catch {
    return { price: null, change: null, changePercent: null, currency: null };
  }
}

export async function fetchYahooQuotes(
  tickers: string[],
): Promise<Record<string, YahooQuoteData>> {
  const entries = await Promise.all(
    tickers.map(async (ticker) => [ticker, await fetchYahooQuote(ticker)] as const),
  );
  return Object.fromEntries(entries);
}
