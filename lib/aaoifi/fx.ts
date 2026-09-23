import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
const cache = new Map<string, Promise<number | null>>();

// London quotes use pence ("GBp", "GBX"); everything else is an ISO code.
export function normalizeCurrency(currency: string): { code: string; factor: number } {
  if (currency === "GBp" || currency === "GBX") return { code: "GBP", factor: 0.01 };
  if (currency === "ZAc") return { code: "ZAR", factor: 0.01 };
  if (currency === "ILA") return { code: "ILS", factor: 0.01 };
  return { code: currency.toUpperCase(), factor: 1 };
}

async function fetchRate(from: string, to: string): Promise<number | null> {
  try {
    const quote = (await yahooFinance.quote(`${from}${to}=X`)) as { regularMarketPrice?: number };
    const rate = quote.regularMarketPrice;
    return typeof rate === "number" && Number.isFinite(rate) && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}

/** Multiplier converting an amount in `from` into `to`, or null when no rate is available. */
export async function getFxRate(from: string, to: string): Promise<number | null> {
  const source = normalizeCurrency(from);
  const target = normalizeCurrency(to);
  if (source.code === target.code) return source.factor / target.factor;
  const key = `${source.code}${target.code}`;
  if (!cache.has(key)) cache.set(key, fetchRate(source.code, target.code));
  const rate = await cache.get(key)!;
  return rate === null ? null : (rate * source.factor) / target.factor;
}
