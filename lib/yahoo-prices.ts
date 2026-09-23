import "server-only";

import { unstable_cache } from "next/cache";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export type YahooPriceAsset = {
  isin: string;
  ticker?: string | null;
  name?: string;
  currency?: string;
};

export type YahooPriceMap = Record<string, number | null>;
export type YahooMarketData = { price: number | null; changePercent: number | null };

const YAHOO_TIMEOUT_MS = 4_000;

async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Délai Yahoo Finance dépassé")),
      YAHOO_TIMEOUT_MS,
    );

    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function tickerFromName(name?: string): string | null {
  return name?.match(/\(([A-Z0-9.-]+)\)\s*$/)?.[1] ?? null;
}

// Les ETF HSBC sont détenus sur Euronext Paris dans Halisia. La recherche par
// ISIN Yahoo renvoie parfois la ligne londonienne (devise différente), donc on
// privilégie explicitement le symbole Paris connu.
const preferredSymbols: Record<string, string> = {
  HIWS: "HIWS.PA",
  HIPS: "HIPS.PA",
  HIES: "HIES.PA",
};

async function quoteForAsset(asset: YahooPriceAsset) {
  const ticker = (asset.ticker ?? tickerFromName(asset.name) ?? "").toUpperCase();
  const preferred = preferredSymbols[ticker] ?? (ticker.endsWith(".PA") ? ticker : null);
  if (preferred) {
    try {
      const quote = await withTimeout(yahooFinance.quote(preferred));
      if (typeof quote.regularMarketPrice === "number") return quote;
    } catch {
      // Fallback to ISIN search below when the listing is temporarily unavailable.
    }
  }
  return quoteFromSearch(asset.isin || asset.ticker || "");
}

async function quoteFromSearch(identifier: string) {
  const result = await withTimeout(yahooFinance.search(identifier));
  const symbol = result.quotes[0]?.symbol;

  if (typeof symbol !== "string" || !symbol) return null;
  return withTimeout(yahooFinance.quote(symbol));
}

async function fetchAssetPrice(asset: YahooPriceAsset): Promise<number | null> {
  try {
    let quote = await quoteForAsset(asset);

    // An ISIN can resolve to a London listing in GBP/USD even when the portfolio
    // holds its Paris listing in EUR. Prefer the Fortuneo symbol on Paris in that case.
    if (asset.currency && quote?.currency !== asset.currency) {
      const baseTicker = asset.ticker ?? tickerFromName(asset.name);

      if (baseTicker) {
        try {
          const currencyMatchedQuote = await withTimeout(yahooFinance.quote(`${baseTicker}.PA`));
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

export async function fetchYahooMarketData(
  assets: YahooPriceAsset[],
): Promise<Record<string, YahooMarketData>> {
  const entries = await Promise.all(
    assets.map(async (asset) => {
      try {
        let quote = await quoteForAsset(asset);
        if (asset.currency && quote?.currency !== asset.currency) {
          const baseTicker = asset.ticker ?? tickerFromName(asset.name);
          if (baseTicker) {
            try {
              const matched = await withTimeout(yahooFinance.quote(`${baseTicker}.PA`));
              if (matched.currency === asset.currency) quote = matched;
            } catch { /* keep the original quote */ }
          }
        }
        return [asset.isin, {
          price: typeof quote?.regularMarketPrice === "number" ? quote.regularMarketPrice : null,
          changePercent: typeof quote?.regularMarketChangePercent === "number" ? quote.regularMarketChangePercent : null,
        }] as const;
      } catch {
        return [asset.isin, { price: null, changePercent: null }] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}

async function loadYahooPrices(assets: YahooPriceAsset[]): Promise<YahooPriceMap> {
  const entries = await Promise.all(
    assets.map(async (asset) => [asset.isin, await fetchAssetPrice(asset)] as const),
  );

  return Object.fromEntries(entries);
}

const getCachedYahooPrices = unstable_cache(
  loadYahooPrices,
  ["yahoo-portfolio-prices-v2"],
  { revalidate: 300 },
);

export async function fetchYahooPrices(assets: YahooPriceAsset[]): Promise<YahooPriceMap> {
  if (assets.length === 0) return {};
  return getCachedYahooPrices(assets);
}
