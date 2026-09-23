import { getFxRate } from "./fx";
import { SECFinancialDataProvider } from "./sec-provider";
import { YahooFinancialDataProvider } from "./yahoo-provider";
import type { FinancialDataProvider, FinancialValue, NormalizedFinancialData } from "./types";

const MONETARY_FIELDS = ["totalRevenue", "impureRevenue", "interestBearingDebt", "interestBearingCashAndSecurities", "liquidity", "totalAssets"] as const;

export function isUSStock(ticker: string) { return !ticker.includes("."); }
export function getFinancialDataProvider(ticker: string): FinancialDataProvider { return isUSStock(ticker) ? new SECFinancialDataProvider() : new YahooFinancialDataProvider(); }

// Statements are often reported in another currency than the listing
// (ADRs, Canadian issuers…). Every amount is converted into the market
// capitalisation currency so that all ratios compare like with like.
async function normalizeCurrencies(data: NormalizedFinancialData): Promise<NormalizedFinancialData> {
  const target = data.marketCapitalization?.currency;
  if (!target) return data;
  const unconverted = new Set<string>();
  for (const field of MONETARY_FIELDS) {
    const value: FinancialValue | undefined = data[field];
    if (!value || value.currency === target) continue;
    const rate = await getFxRate(value.currency, target);
    if (rate === null) { unconverted.add(value.currency); continue; }
    data[field] = { ...value, value: value.value * rate, currency: target, source: { ...value.source, field: `${value.source.field ?? ""} (converti ${value.currency}→${target})`.trim() } };
  }
  if (unconverted.size) data.limitations.push(`Taux de change indisponible (${Array.from(unconverted).join(", ")} → ${target}) : certains ratios mélangent deux devises.`);
  return data;
}

export async function getFinancialData(ticker: string): Promise<NormalizedFinancialData> {
  if (!isUSStock(ticker)) return normalizeCurrencies(await new YahooFinancialDataProvider().getFinancialData(ticker));
  try {
    return await normalizeCurrencies(await new SECFinancialDataProvider().getFinancialData(ticker));
  } catch (secError) {
    // Foreign filers, OTC ADRs and new holding companies have no usable
    // US-GAAP 10-K data; Yahoo Finance fundamentals are used instead.
    try {
      const data = await new YahooFinancialDataProvider().getFinancialData(ticker);
      data.limitations.push(`Données SEC indisponibles (${secError instanceof Error ? secError.message : String(secError)}) : analyse basée sur Yahoo Finance.`);
      return normalizeCurrencies(data);
    } catch {
      throw secError;
    }
  }
}
