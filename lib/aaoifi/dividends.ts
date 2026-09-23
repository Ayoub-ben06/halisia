import YahooFinance from "yahoo-finance2";

type ChartWithDividends = { events?: { dividends?: { amount?: number; date?: Date | string }[] } };

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
const DEFAULT_LOOKBACK_DAYS = 365;

// Estimated from Yahoo's per-share dividend history × the current quantity, so
// it ignores quantity changes since the purchase date. Without a purchase date
// the last 12 months are used. Returns null when the history is unavailable.
export async function estimateDividendsReceived(ticker: string, quantity: number, purchaseDate?: string | null, now = new Date()): Promise<number | null> {
  if (!(quantity > 0)) return 0;
  const parsed = purchaseDate ? new Date(purchaseDate) : null;
  const since = parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date(now.getTime() - DEFAULT_LOOKBACK_DAYS * 86_400_000);
  if (since >= now) return 0;
  try {
    const chart = await (yahooFinance.chart(ticker, { period1: since, events: "div" }) as Promise<unknown> as Promise<ChartWithDividends>);
    const perShare = (chart.events?.dividends ?? [])
      .filter((dividend) => dividend.date && new Date(dividend.date) >= since)
      .reduce((sum, dividend) => sum + (typeof dividend.amount === "number" && Number.isFinite(dividend.amount) ? dividend.amount : 0), 0);
    return perShare * quantity;
  } catch {
    return null;
  }
}
