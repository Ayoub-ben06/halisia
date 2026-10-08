import "server-only";

import { getFinancialData } from "@/lib/aaoifi/data-provider";
import { runAAOIFI } from "@/lib/aaoifi/engine";
import type { ScreeningResult } from "@/lib/aaoifi/types";
import type { HalalStatus } from "@/lib/halal-status";
import { createAdminClient } from "@/lib/supabase/admin";

export type TickerScreening = {
  status: HalalStatus;
  screeningStatus: ScreeningResult["status"] | null;
  purificationRatio: number | null;
  reason: string | null;
  screenedAt: string | null;
  result: ScreeningResult | null;
};

type CacheRow = { ticker: string; status: string; purification_ratio: number | null; reason: string | null; error: string | null; screened_at: string; result?: unknown };

const FRESH_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_SCREEN_BUDGET = 6;
const CONCURRENCY = 3;

export function toHalalStatus(status: string | null | undefined): HalalStatus {
  const normalized = status?.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (normalized === "COMPLIANT" || normalized === "HALAL") return "compliant";
  if (normalized === "NON_COMPLIANT" || normalized === "NOT_HALAL") return "non_compliant";
  if (normalized === "DOUBTFUL" || normalized === "REVIEW_REQUIRED") return "debated";
  return "unknown";
}

export function normalizeTicker(ticker: string) {
  return ticker.trim().toUpperCase();
}

export function isStockAssetType(type: string | null | undefined) {
  const normalized = (type ?? "").toLowerCase();
  return normalized === "stock" || normalized === "action" || normalized === "equity";
}

const ISIN_EXCHANGE_SUFFIX: Record<string, string> = {
  FR: ".PA", DE: ".DE", GB: ".L", CH: ".SW", NL: ".AS", IT: ".MI", ES: ".MC", BE: ".BR", DK: ".CO", SE: ".ST", NO: ".OL", FI: ".HE",
};

export function assetTicker(asset: { ticker?: string | null; name?: string | null }) {
  return asset.ticker?.trim().toUpperCase() || asset.name?.match(/\(([A-Z0-9.-]+)\)\s*$/)?.[1]?.toUpperCase() || null;
}

export function screeningTickerForAsset(asset: { ticker?: string | null; name?: string | null; isin?: string | null }) {
  const ticker = assetTicker(asset);
  if (!ticker) return null;
  if (ticker.includes(".")) return ticker;
  const country = asset.isin?.slice(0, 2).toUpperCase();
  return country && ISIN_EXCHANGE_SUFFIX[country] ? `${ticker}${ISIN_EXCHANGE_SUFFIX[country]}` : ticker;
}

function adminClient() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

function fromRow(row: CacheRow): TickerScreening {
  return {
    status: row.error && row.status === "INSUFFICIENT_DATA" ? "unknown" : toHalalStatus(row.status),
    screeningStatus: row.status as ScreeningResult["status"],
    purificationRatio: row.purification_ratio != null ? Number(row.purification_ratio) : null,
    reason: row.reason,
    screenedAt: row.screened_at,
    result: (row.result as ScreeningResult | null | undefined) ?? null,
  };
}

function fromResult(result: ScreeningResult, screenedAt: string): TickerScreening {
  return {
    status: toHalalStatus(result.status),
    screeningStatus: result.status,
    purificationRatio: result.purificationRatio ?? null,
    reason: result.reason ?? null,
    screenedAt,
    result,
  };
}

export async function screenTicker(ticker: string): Promise<ScreeningResult> {
  return runAAOIFI(await getFinancialData(ticker));
}

async function readCache(tickers: string[]): Promise<Map<string, CacheRow>> {
  const admin = adminClient();
  if (!admin || !tickers.length) return new Map();
  // The result column only exists once the 20260924 migration is applied.
  const withResult = await admin.from("screening_cache").select("ticker, status, purification_ratio, reason, error, screened_at, result").in("ticker", tickers);
  const rows = withResult.error
    ? (await admin.from("screening_cache").select("ticker, status, purification_ratio, reason, error, screened_at").in("ticker", tickers)).data
    : withResult.data;
  return new Map(((rows ?? []) as CacheRow[]).map((row) => [row.ticker, row]));
}

export async function writeCache(ticker: string, result: ScreeningResult, previousStatus: string | null, screenedAt: string) {
  const admin = adminClient();
  if (!admin) return;
  const row = { ticker, status: result.status, previous_status: previousStatus, purification_ratio: result.purificationRatio ?? null, reason: result.reason ?? null, error: null, screened_at: screenedAt };
  const { error } = await admin.from("screening_cache").upsert({ ...row, result });
  if (error) await admin.from("screening_cache").upsert(row);
}

async function mapWithConcurrency<T>(items: T[], limit: number, task: (item: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) await task(queue.shift()!);
  }));
}

/**
 * AAOIFI screenings for a list of tickers, served from `screening_cache`.
 * Missing or stale tickers are screened on demand (at most `screenBudget`
 * per call, to keep page loads bounded) and written back to the cache; the
 * others come back as "unknown" until the cron screens them.
 */
export async function getTickerScreenings(rawTickers: string[], screenBudget = DEFAULT_SCREEN_BUDGET): Promise<Record<string, TickerScreening>> {
  const tickers = Array.from(new Set(rawTickers.filter(Boolean).map(normalizeTicker)));
  const cache = await readCache(tickers);
  const now = Date.now();
  const output: Record<string, TickerScreening> = {};
  const toScreen: string[] = [];
  for (const ticker of tickers) {
    const row = cache.get(ticker);
    if (row) output[ticker] = fromRow(row);
    const unresolved = row && (toHalalStatus(row.status) === "unknown" || !row.result);
    if (!row || unresolved || now - new Date(row.screened_at).getTime() > FRESH_MS) toScreen.push(ticker);
  }
  await mapWithConcurrency(toScreen.slice(0, screenBudget), CONCURRENCY, async (ticker) => {
    try {
      const result = await screenTicker(ticker);
      const screenedAt = new Date().toISOString();
      output[ticker] = fromResult(result, screenedAt);
      await writeCache(ticker, result, cache.get(ticker)?.status ?? null, screenedAt);
    } catch {
      // Keep the stale cached value if any; otherwise the ticker stays unknown.
    }
  });
  for (const ticker of tickers) {
    output[ticker] ??= { status: "unknown", screeningStatus: null, purificationRatio: null, reason: null, screenedAt: null, result: null };
  }
  return output;
}

/** Full screening result for one ticker, from a fresh cache entry or a new analysis. */
export async function getScreeningResult(rawTicker: string, options: { maxAgeMs?: number; beforeCompute?: () => void } = {}): Promise<{ result: ScreeningResult; cached: boolean }> {
  const ticker = normalizeTicker(rawTicker);
  const cached = (await readCache([ticker])).get(ticker);
  if (cached?.result && !cached.error && Date.now() - new Date(cached.screened_at).getTime() < (options.maxAgeMs ?? 24 * 60 * 60 * 1000)) {
    return { result: cached.result as ScreeningResult, cached: true };
  }
  options.beforeCompute?.();
  const result = await screenTicker(ticker);
  await writeCache(ticker, result, cached?.status ?? null, new Date().toISOString());
  return { result, cached: false };
}

/**
 * Status for an asset that may not be an equity: gold is compliant, crypto
 * remains debated among scholars, funds explicitly named "Islamic" follow a
 * Shariah-screened index; everything else uses the AAOIFI screening.
 */
export function assetHalalStatus(asset: { type: string; name: string; ticker: string | null; isin?: string | null; halal_status?: string | null }, screenings: Record<string, TickerScreening>): HalalStatus {
  if (asset.type === "gold") return "compliant";
  if (asset.type === "crypto") return "debated";
  // ETFs keep their manually/imported status as requested. Only individual
  // stocks are recalculated from the AAOIFI screening engine.
  if (asset.type === "etf") {
    const stored = asset.halal_status?.toUpperCase();
    if (stored === "COMPLIANT" || stored === "HALAL") return "compliant";
    if (stored === "NON_COMPLIANT") return "non_compliant";
    if (stored === "DOUBTFUL" || stored === "REVIEW_REQUIRED") return "debated";
    return /ISLAMIC|SHARIAH|SHARIA/i.test(asset.name) ? "compliant" : "unknown";
  }
  if (/ISLAMIC|SHARIAH|SHARIA/i.test(asset.name)) return "compliant";
  const screeningTicker = screeningTickerForAsset(asset);
  const screening = screeningTicker ? screenings[normalizeTicker(screeningTicker)] : undefined;
  return screening?.status ?? "unknown";
}
