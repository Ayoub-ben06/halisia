import "server-only";

export type YahooHistoryPoint = { date: string; price: number };

function candidates(ticker: string) {
  const normalized = ticker.trim().toUpperCase();
  const base = normalized.split(/[.=-]/)[0];
  return Array.from(new Set([normalized, base, `${base}.SI`, `${base}.SG`, `${base}.PA`, `${base}.L`, `${base}.AS`, `${base}.DE`, `${base}.MI`]));
}

async function fetchChart(ticker: string, days: number): Promise<YahooHistoryPoint[]> {
  const end = Math.floor(Date.now() / 1000);
  const start = end - days * 86_400;
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`);
  url.searchParams.set("period1", String(start));
  url.searchParams.set("period2", String(end));
  url.searchParams.set("interval", "1d");
  const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Yahoo chart HTTP ${response.status}`);
  const payload = await response.json() as { chart?: { result?: Array<{ timestamp?: number[]; indicators?: { quote?: Array<{ close?: Array<number | null> }> } }> } };
  const result = payload.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  return timestamps.map((timestamp, index) => ({ date: new Date(timestamp * 1000).toISOString(), price: closes[index] ?? null })).filter((point): point is YahooHistoryPoint => typeof point.price === "number" && Number.isFinite(point.price));
}

export async function fetchYahooHistory(ticker: string, days = 365) {
  for (const candidate of candidates(ticker)) {
    try {
      const history = await fetchChart(candidate, days);
      if (history.length) return history;
    } catch {
      // Try the next listing/suffix.
    }
  }
  return [];
}
