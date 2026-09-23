import YahooFinance from "yahoo-finance2";
import { getAverageMarketCap } from "./market-cap";
import type { FinancialDataProvider, FinancialValue, NormalizedFinancialData } from "./types";

type RawNumber = { raw?: number } | number | undefined;
type YahooSummary = {
  assetProfile?: { sector?: string; industry?: string };
  financialData?: { totalRevenue?: RawNumber; financialCurrency?: string };
};
type YahooTimeSeriesRow = Record<string, unknown> & { date?: Date | string };
type YahooQuote = { marketCap?: number; regularMarketPrice?: number; currency?: string; financialCurrency?: string; longName?: string; shortName?: string };

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
const DEBT_FIELDS = ["totalDebt", "longTermDebt", "currentDebt"];
// Older annual rows are only used for fields missing from the latest one.
const MAX_ROW_AGE_MS = 2 * 365 * 86_400_000;
function number(value: RawNumber): number | undefined { const raw = typeof value === "number" ? value : value?.raw; return typeof raw === "number" && Number.isFinite(raw) ? raw : undefined; }
function rowTime(row: YahooTimeSeriesRow) { return new Date(row.date ?? 0).getTime(); }

export class YahooFinancialDataProvider implements FinancialDataProvider {
  async getFinancialData(ticker: string): Promise<NormalizedFinancialData> {
    const symbol = ticker.trim().toUpperCase();
    const [quote, summary, series] = await Promise.all([
      yahooFinance.quote(symbol) as Promise<unknown> as Promise<YahooQuote>,
      yahooFinance.quoteSummary(symbol, { modules: ["assetProfile", "financialData"] }) as Promise<unknown> as Promise<YahooSummary>,
      yahooFinance.fundamentalsTimeSeries(symbol, { period1: "2020-01-01", type: "annual", module: "all" }) as Promise<unknown> as Promise<YahooTimeSeriesRow[]>,
    ]);
    if (!quote) throw new Error(`Symbole introuvable sur Yahoo Finance : ${symbol}.`);
    // The latest annual row is sometimes partial: each field is read from the
    // most recent row that reports it, within two years of the latest one.
    const rows = [...(series ?? [])].sort((a, b) => rowTime(b) - rowTime(a));
    const latest = rows[0] ?? {};
    const recentRows = rows.filter((row) => rowTime(latest) - rowTime(row) <= MAX_ROW_AGE_MS);
    const rowNumber = (field: string) => { for (const row of recentRows) { const value = row[field]; if (typeof value === "number" && Number.isFinite(value)) return value; } return undefined; };
    const period = latest.date instanceof Date ? String(latest.date.getFullYear()) : String(latest.date ?? "latest annual");
    const currency = quote.financialCurrency ?? summary.financialData?.financialCurrency ?? quote.currency ?? "EUR";
    const makeValue = (value: number | undefined, field: string, confidence: "HIGH" | "MEDIUM" = "MEDIUM"): FinancialValue | undefined => value === undefined ? undefined : { value, currency, source: { provider: "Yahoo Finance", document: "fundamentalsTimeSeries", fiscalPeriod: period, field }, confidence };
    const sector = summary.assetProfile?.sector;
    const industry = summary.assetProfile?.industry;
    const primaryActivity = industry || sector || "Activité non documentée";
    const ttmRevenue = number(summary.financialData?.totalRevenue);
    const totalAssets = rowNumber("totalAssets");
    const reportedDebt = rowNumber("totalDebt") ?? rowNumber("longTermDebt") ?? rowNumber("currentDebt");
    // Yahoo omits debt lines for debt-free companies (e.g. Keyence): with a
    // balance sheet present and no debt line in any year, debt is zero.
    const debtFree = reportedDebt === undefined && totalAssets !== undefined && !rows.some((row) => DEBT_FIELDS.some((field) => typeof row[field] === "number"));
    const marketCapitalization = await getAverageMarketCap(symbol, period, quote, rowNumber("ordinarySharesNumber") ?? rowNumber("shareIssued"));
    return {
      companyName: quote.longName ?? quote.shortName ?? symbol,
      ticker: symbol,
      sector,
      industry,
      fiscalPeriod: period,
      marketCapitalization,
      totalRevenue: ttmRevenue !== undefined && ttmRevenue > 0
        ? { value: ttmRevenue, currency, source: { provider: "Yahoo Finance", document: "financialData", fiscalPeriod: "TTM", field: "totalRevenue (12 mois glissants)" }, confidence: "MEDIUM" }
        : makeValue(rowNumber("totalRevenue"), "totalRevenue", "HIGH"),
      impureRevenue: makeValue(rowNumber("interestIncome") ?? rowNumber("interestIncomeNonOperating"), "interestIncome"),
      interestBearingDebt: makeValue(reportedDebt, "totalDebt") ?? (debtFree ? makeValue(0, "aucune dette déclarée") : undefined),
      // Like the SEC provider, cash is counted as interest-bearing when no
      // separate short-term investment line is reported (conservative).
      interestBearingCashAndSecurities: makeValue(rowNumber("otherShortTermInvestments"), "shortTermInvestments")
        ?? makeValue(rowNumber("cashCashEquivalentsAndShortTermInvestments") ?? rowNumber("cashAndCashEquivalents"), "cashCashEquivalentsAndShortTermInvestments"),
      liquidity: makeValue(rowNumber("cashAndCashEquivalents") ?? rowNumber("cashCashEquivalentsAndShortTermInvestments"), "cashAndCashEquivalents", "HIGH"),
      totalAssets: makeValue(totalAssets, "totalAssets", "HIGH"),
      business: { primaryActivity, status: "UNKNOWN", reason: `Activité Yahoo Finance : ${primaryActivity}.`, confidence: "MEDIUM" },
      limitations: ["Source gratuite Yahoo Finance fundamentalsTimeSeries utilisée pour les titres non couverts par SEC.", "Les ratios de dette et de placements utilisent la capitalisation boursière moyenne sur 36 mois, à défaut la capitalisation instantanée.", "Yahoo Finance ne fournit pas toujours les notes du rapport annuel ni une séparation fiable des revenus impurs.", "Les postes absents restent UNKNOWN, sauf la dette d'une société qui n'en déclare aucune sur plusieurs exercices (comptée à zéro)."],
    };
  }
}
