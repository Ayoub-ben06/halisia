import type { FinancialDataProvider, FinancialValue, NormalizedFinancialData } from "./types";

type FmpProfile = { companyName?: string; symbol?: string; sector?: string; industry?: string; mktCap?: number; currency?: string };
type FmpIncome = { date?: string; fiscalYear?: string | number; revenue?: number; interestIncome?: number; interestAndIncomeFromInvestments?: number };
type FmpBalance = { date?: string; fiscalYear?: string | number; totalDebt?: number; cashAndCashEquivalents?: number; shortTermInvestments?: number; totalAssets?: number };

export class FMPFinancialDataProvider implements FinancialDataProvider {
  async getFinancialData(ticker: string): Promise<NormalizedFinancialData> {
    const key = process.env.FMP_API_KEY;
    if (!key) throw new Error("FMP_API_KEY n’est pas configurée pour les actions européennes.");
    const base = "https://financialmodelingprep.com/stable";
    const fetchJson = async <T>(path: string): Promise<T> => { const response = await fetch(`${base}${path}${path.includes("?") ? "&" : "?"}apikey=${encodeURIComponent(key)}`, { cache: "no-store" }); if (!response.ok) { const body = await response.text().catch(() => ""); throw new Error(`FMP HTTP ${response.status}: ${body.slice(0, 180) || "clé invalide, quota dépassé ou endpoint non inclus dans le plan"}`); } return response.json() as Promise<T>; };
    const symbol = ticker.trim().toUpperCase();
    const [profiles, incomes, balances] = await Promise.all([
      fetchJson<FmpProfile[]>(`/profile?symbol=${encodeURIComponent(symbol)}`),
      fetchJson<FmpIncome[]>(`/income-statement?symbol=${encodeURIComponent(symbol)}&limit=1`),
      fetchJson<FmpBalance[]>(`/balance-sheet-statement?symbol=${encodeURIComponent(symbol)}&limit=1`),
    ]);
    const profile = profiles[0]; const income = incomes[0]; const balance = balances[0];
    if (!profile || !income || !balance) throw new Error(`FMP : aucune donnée complète pour ${symbol}.`);
    const period = String(income.fiscalYear ?? income.date ?? "unknown");
    const source = (field: string): FinancialValue["source"] => ({ provider: "Financial Modeling Prep", document: "financial statements", fiscalPeriod: period, field, url: `${base}` });
    const value = (amount: number | undefined, field: string, confidence: "HIGH" | "MEDIUM" = "MEDIUM"): FinancialValue | undefined => typeof amount === "number" ? { value: amount, currency: profile.currency ?? "EUR", source: source(field), confidence } : undefined;
    const primaryActivity = profile.industry || profile.sector || "Activité non documentée";
    return {
      companyName: profile.companyName ?? symbol, ticker: symbol, sector: profile.sector, industry: profile.industry, fiscalPeriod: period,
      marketCapitalization: value(profile.mktCap, "mktCap"), totalRevenue: value(income.revenue, "revenue", "HIGH"), impureRevenue: value(income.interestIncome ?? income.interestAndIncomeFromInvestments, "interestIncome"),
      interestBearingDebt: value(balance.totalDebt, "totalDebt"), interestBearingCashAndSecurities: value(balance.shortTermInvestments, "shortTermInvestments"), liquidity: value(balance.cashAndCashEquivalents, "cashAndCashEquivalents", "HIGH"), totalAssets: value(balance.totalAssets, "totalAssets", "HIGH"),
      business: { primaryActivity, status: "UNKNOWN", reason: `Activité déclarée : ${primaryActivity}.`, confidence: "MEDIUM" },
      limitations: ["Les champs FMP dépendent de la couverture et du mapping de l’offre utilisée.", "Les activités secondaires et la composition détaillée des revenus restent à vérifier dans le rapport annuel."],
    };
  }
}
