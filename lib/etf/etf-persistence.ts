import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { ETF_LIST } from "./etf-list";
import type { ETFDefinition, ETFHolding, ETFScreeningResult } from "./types";

export async function saveETFScreening(etf: ETFDefinition, result: ETFScreeningResult, holdings: ETFHolding[]) {
  const admin = createAdminClient();
  const now = new Date();
  const { data: saved, error } = await admin.from("etf_screening").upsert({
    ticker: etf.ticker, isin: etf.isin, name: etf.name, etf_type: etf.etf_type, provider: etf.provider,
    total_holdings: result.totalHoldings, analyzed_holdings: result.analyzedHoldings,
    compliant_weight: result.compliantWeight, doubtful_weight: result.doubtfulWeight,
    non_compliant_weight: result.nonCompliantWeight, unanalyzed_weight: result.unanalyzedWeight,
    purification_ratio: result.purificationRatio, verdict: result.verdict, verdict_reason: result.verdictReason,
    top_non_compliant: result.topNonCompliant, halal_alternative: result.halalAlternative,
    halal_alternative_name: ETF_LIST.find((item) => item.ticker === result.halalAlternative)?.name ?? null,
    composition_date: now.toISOString().slice(0, 10), last_updated: now.toISOString(),
    next_update: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
  }, { onConflict: "ticker" }).select("*").single();
  if (error) throw new Error(`Impossible d’enregistrer le screening ETF ${etf.ticker}: ${error.message}`);
  if (holdings.length) {
    await admin.from("etf_holdings").delete().eq("etf_ticker", etf.ticker);
    const rows = holdings.map((holding) => ({ etf_ticker: etf.ticker, holding_ticker: holding.ticker, holding_isin: holding.isin, holding_name: holding.name, weight: holding.weight, halal_status: result.topNonCompliant.find((item) => item.ticker === holding.ticker)?.status ?? "compliant", halal_reason: result.topNonCompliant.find((item) => item.ticker === holding.ticker)?.reason ?? null, last_screened: now.toISOString() }));
    const { error: holdingsError } = await admin.from("etf_holdings").insert(rows);
    if (holdingsError) throw new Error(`Impossible d’enregistrer la composition ETF ${etf.ticker}: ${holdingsError.message}`);
  }
  return saved;
}
