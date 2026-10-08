import "server-only";

import YahooFinance from "yahoo-finance2";
import { getScreeningResult } from "@/lib/halal-screening";
import { findETF } from "./etf-list";
import type { ETFDefinition, ETFHolding, ETFScreeningResult, ETFTopHolding } from "./types";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
const STALE_MS = 90 * 24 * 60 * 60 * 1000;

type YahooHolding = { symbol?: string; holdingName?: string; holdingPercent?: number };
type YahooTopHoldings = { topHoldings?: { holdings?: YahooHolding[] } };

function weightOf(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return 0;
  return value > 1 ? value / 100 : value;
}

export function getFastVerdict(etf: ETFDefinition): ETFScreeningResult | null {
  if (etf.etf_type === "islamic_certified") return {
    verdict: "compliant", verdictReason: "ETF islamique certifié par un comité Shariah indépendant selon une méthodologie de filtrage islamique.",
    totalHoldings: 0, analyzedHoldings: 0, compliantWeight: 1, doubtfulWeight: 0, nonCompliantWeight: 0, unanalyzedWeight: 0, purificationRatio: 0, topNonCompliant: [], halalAlternative: null,
  };
  if (etf.etf_type === "bond") return {
    verdict: "bond_forbidden", verdictReason: "ETF obligataire : les obligations génèrent des intérêts (riba), interdits selon les critères AAOIFI.",
    totalHoldings: 0, analyzedHoldings: 0, compliantWeight: 0, doubtfulWeight: 0, nonCompliantWeight: 1, unanalyzedWeight: 0, purificationRatio: 1, topNonCompliant: [], halalAlternative: etf.halal_alternative,
  };
  return null;
}

export async function downloadComposition(etf: ETFDefinition, marketTicker = etf.ticker): Promise<ETFHolding[]> {
  let summary: YahooTopHoldings;
  try {
    summary = await yahooFinance.quoteSummary(marketTicker, { modules: ["topHoldings"] }) as unknown as YahooTopHoldings;
  } catch {
    return [];
  }
  return (summary.topHoldings?.holdings ?? []).map((holding) => ({
    ticker: holding.symbol?.trim().toUpperCase() || null,
    isin: null,
    name: holding.holdingName?.trim() || holding.symbol?.trim() || "Holding inconnue",
    weight: weightOf(holding.holdingPercent),
  })).filter((holding) => holding.weight > 0);
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>) {
  const queue = [...items];
  const output: R[] = [];
  await Promise.all(Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) output.push(await task(queue.shift()!));
  }));
  return output;
}

export async function screenETFComposition(etf: ETFDefinition, holdings: ETFHolding[]): Promise<ETFScreeningResult> {
  const screened = await mapWithConcurrency(holdings, 3, async (holding) => {
    if (!holding.ticker) return { holding, status: "unknown" as const, reason: "Ticker de la position indisponible." };
    try {
      const { result } = await getScreeningResult(holding.ticker, { maxAgeMs: STALE_MS });
      const status = result.status === "COMPLIANT" ? "compliant" : result.status === "NON_COMPLIANT" ? "non_compliant" : result.status === "DOUBTFUL" || result.status === "REVIEW_REQUIRED" ? "doubtful" : "unknown";
      return { holding, status, reason: result.reason ?? result.note ?? result.business.explanation };
    } catch (error) {
      return { holding, status: "unknown" as const, reason: error instanceof Error ? error.message : "Analyse indisponible." };
    }
  });
  let compliantWeight = 0;
  let doubtfulWeight = 0;
  let nonCompliantWeight = 0;
  let analyzedWeight = 0;
  const flagged: ETFTopHolding[] = [];
  for (const item of screened) {
    if (item.status === "unknown") continue;
    analyzedWeight += item.holding.weight;
    if (item.status === "compliant") compliantWeight += item.holding.weight;
    if (item.status === "doubtful") {
      doubtfulWeight += item.holding.weight;
      flagged.push({ ...item.holding, status: item.status, reason: item.reason });
    }
    if (item.status === "non_compliant") {
      nonCompliantWeight += item.holding.weight;
      flagged.push({ ...item.holding, status: item.status, reason: item.reason });
    }
  }
  const unanalyzedWeight = Math.max(0, 1 - analyzedWeight);
  const purificationRatio = Math.min(1, nonCompliantWeight + doubtfulWeight * 0.5);
  const topNonCompliant = flagged.sort((a, b) => b.weight - a.weight).slice(0, 5);
  const verdict = !holdings.length || unanalyzedWeight > 0.35
    ? "doubtful"
    : nonCompliantWeight > 0.05
      ? "non_compliant"
      : nonCompliantWeight > 0 || doubtfulWeight > 0.1
        ? "doubtful"
        : "compliant";
  const verdictReason = !holdings.length
    ? "La composition publique de cet ETF n’est pas disponible : aucune conclusion automatique fiable."
    : unanalyzedWeight > 0.35
      ? `${(unanalyzedWeight * 100).toFixed(1)} % de la composition n’a pas pu être analysée.`
      : `${(nonCompliantWeight * 100).toFixed(1)} % non conforme, ${(doubtfulWeight * 100).toFixed(1)} % douteux ; analyse basée sur les principales positions publiques.`;
  return { verdict, verdictReason, totalHoldings: holdings.length, analyzedHoldings: screened.filter((item) => item.status !== "unknown").length, compliantWeight, doubtfulWeight, nonCompliantWeight, unanalyzedWeight, purificationRatio, topNonCompliant, halalAlternative: etf.halal_alternative };
}

export async function screenETF(etf: ETFDefinition, marketTicker = etf.ticker) {
  const fast = getFastVerdict(etf);
  if (fast) return { result: fast, holdings: [] as ETFHolding[] };
  const holdings = await downloadComposition(etf, marketTicker);
  return { result: await screenETFComposition(etf, holdings), holdings };
}

export function isETFScreeningStale(lastUpdated: string | null | undefined) {
  return !lastUpdated || Date.now() - new Date(lastUpdated).getTime() >= STALE_MS;
}

export { findETF };
