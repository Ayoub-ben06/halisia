import "server-only";

import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export type YahooPriceAsset = {
  isin: string;
  ticker?: string | null;
  name?: string;
  currency?: string;
};

export type YahooPriceMap = Record<string, number | null>;

function tickerFromName(name?: string): string | null {
  return name?.match(/\(([A-Z0-9.-]+)\)\s*$/)?.[1] ?? null;
}

async function quoteFromSearch(identifier: string) {
  const result = await yahooFinance.search(identifier);
  const symbol = result.quotes[0]?.symbol;

  if (typeof symbol !== "string" || !symbol) return null;
  return yahooFinance.quote(symbol);
}

async function fetchAssetPrice(asset: YahooPriceAsset): Promise<number | null> {
  try {
    let quote = await quoteFromSearch(asset.isin || asset.ticker || "");

    // An ISIN can resolve to a London listing in GBP/USD even when the portfolio
    // holds its Paris listing in EUR. Prefer the Fortuneo symbol on Paris in that case.
    if (asset.currency && quote?.currency !== asset.currency) {
      const baseTicker = asset.ticker ?? tickerFromName(asset.name);

      if (baseTicker) {
        try {
          const currencyMatchedQuote = await yahooFinance.quote(`${baseTicker}.PA`);
          if (currencyMatchedQuote.currency === asset.currency) quote = currencyMatchedQuote;
        } catch {
          // Keep the ISIN search result if the currency-specific symbol is unavailable.
        }
      }
    }

    return typeof quote?.regularMarketPrice === "number" ? quote.regularMarketPrice : null;
  } catch (error) {
    console.error(`Yahoo Finance price unavailable for ${asset.isin}:`, error);
    return null;
  }
}

export async function fetchYahooPrices(assets: YahooPriceAsset[]): Promise<YahooPriceMap> {
  const entries = await Promise.all(
    assets.map(async (asset) => [asset.isin, await fetchAssetPrice(asset)] as const),
  );

  return Object.fromEntries(entries);
}
