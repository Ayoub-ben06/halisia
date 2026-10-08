import "server-only";

import { unstable_cache } from "next/cache";
import YahooFinance from "yahoo-finance2";
import { getFxRate } from "@/lib/aaoifi/fx";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export type YahooPriceAsset = {
  isin: string;
  ticker?: string | null;
  name?: string;
  /** Currency the price must be returned in (the currency of the position). */
  currency?: string;
  /** Key of the result entry; defaults to the ISIN. */
  key?: string;
};

export type YahooPriceMap = Record<string, number | null>;
export type YahooMarketData = { price: number | null; changePercent: number | null };

type Quote = { symbol?: string; currency?: string; regularMarketPrice?: number; regularMarketChangePercent?: number };

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

function keyOf(asset: YahooPriceAsset) {
  return asset.key ?? asset.isin;
}

// Les ETF HSBC sont détenus sur Euronext Paris dans Halisia. La recherche par
// ISIN Yahoo renvoie parfois la ligne londonienne (devise différente), donc on
// privilégie explicitement le symbole Paris connu.
const preferredSymbols: Record<string, string> = {
  HIWS: "HIWS.PA",
  HIPS: "HIPS.PA",
  HIES: "HIES.PA",
};

async function quoteForAsset(asset: YahooPriceAsset): Promise<Quote | null> {
  const ticker = (asset.ticker ?? tickerFromName(asset.name) ?? "").toUpperCase();
  // Without an ISIN the ticker is a Yahoo symbol chosen in the asset search.
  const preferred = preferredSymbols[ticker] ?? (ticker.endsWith(".PA") || (!asset.isin && ticker) ? ticker : null);
  if (preferred) {
    try {
      const quote = (await withTimeout(yahooFinance.quote(preferred))) as Quote;
      if (typeof quote.regularMarketPrice === "number") return quote;
    } catch {
      // Fallback to ISIN search below when the listing is temporarily unavailable.
    }
  }
  return quoteFromSearch(asset.isin || asset.ticker || "");
}

async function quoteFromSearch(identifier: string): Promise<Quote | null> {
  if (!identifier) return null;
  const result = await withTimeout(yahooFinance.search(identifier));
  const symbol = result.quotes[0]?.symbol;

  if (typeof symbol !== "string" || !symbol) return null;
  return (await withTimeout(yahooFinance.quote(symbol))) as Quote;
}

/**
 * Quote in the position currency: first a listing already quoted in that
 * currency (Paris line of a dual-listed stock), otherwise the price converted
 * at the day's rate. Returns null rather than a price in the wrong currency.
 */
async function quoteInCurrency(asset: YahooPriceAsset): Promise<{ price: number | null; changePercent: number | null }> {
  let quote = await quoteForAsset(asset);
  if (asset.currency && quote?.currency && quote.currency !== asset.currency) {
    const baseTicker = (asset.ticker ?? tickerFromName(asset.name))?.replace(/\.[A-Z]+$/, "");
    if (baseTicker) {
      try {
        const parisQuote = (await withTimeout(yahooFinance.quote(`${baseTicker}.PA`))) as Quote;
        if (parisQuote.currency === asset.currency && typeof parisQuote.regularMarketPrice === "number") quote = parisQuote;
      } catch {
        // No Paris listing: the price is converted below.
      }
    }
  }
  const price = typeof quote?.regularMarketPrice === "number" ? quote.regularMarketPrice : null;
  const changePercent = typeof quote?.regularMarketChangePercent === "number" ? quote.regularMarketChangePercent : null;
  if (price === null || !asset.currency || !quote?.currency || quote.currency === asset.currency) return { price, changePercent };
  const rate = await getFxRate(quote.currency, asset.currency);
  return { price: rate === null ? null : price * rate, changePercent };
}

async function fetchAssetPrice(asset: YahooPriceAsset): Promise<number | null> {
  try {
    return (await quoteInCurrency(asset)).price;
  } catch (error) {
    console.error(`Yahoo Finance price unavailable for ${keyOf(asset)}:`, error);
    return null;
  }
}

export async function fetchYahooMarketData(
  assets: YahooPriceAsset[],
): Promise<Record<string, YahooMarketData>> {
  const entries = await Promise.all(
    assets.map(async (asset) => {
      try {
        return [keyOf(asset), await quoteInCurrency(asset)] as const;
      } catch {
        return [keyOf(asset), { price: null, changePercent: null }] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}

async function loadYahooPrices(assets: YahooPriceAsset[]): Promise<YahooPriceMap> {
  const entries = await Promise.all(
    assets.map(async (asset) => [keyOf(asset), await fetchAssetPrice(asset)] as const),
  );

  return Object.fromEntries(entries);
}

const getCachedYahooPrices = unstable_cache(
  loadYahooPrices,
  ["yahoo-portfolio-prices-v3"],
  { revalidate: 300 },
);

export async function fetchYahooPrices(assets: YahooPriceAsset[]): Promise<YahooPriceMap> {
  if (assets.length === 0) return {};
  return getCachedYahooPrices(assets);
}

/** Price inputs for stored positions: keyed by ISIN, or by ticker when there is none. */
export function priceAssetsFor(assets: { isin: string | null; ticker: string | null; name: string; currency: string; type?: string }[]): YahooPriceAsset[] {
  return assets
    .filter((asset) => (asset.isin || asset.ticker) && asset.type !== "cash")
    .map((asset) => ({ isin: asset.isin ?? "", ticker: asset.ticker, name: asset.name, currency: asset.currency, key: asset.isin || asset.ticker! }));
}

export function priceKeyOf(asset: { isin: string | null; ticker: string | null }): string | null {
  return asset.isin || asset.ticker || null;
}
