import type { FinancialDataProvider, FinancialValue, NormalizedFinancialData } from "./types";
import YahooFinance from "yahoo-finance2";
import { getAverageMarketCap } from "./market-cap";
import { DAY_MS, pickDebt, pickLatest, toValue, type CompanyFacts } from "./sec-facts";
import { getLatestQuarterlyDebt } from "./sec-quarterly";

type Submission = { name?: string; tickers?: string[]; sicDescription?: string; cik?: string; filings?: { recent?: { form?: string[]; accessionNumber?: string[]; primaryDocument?: string[]; filingDate?: string[] } } };
type YahooSeriesRow = Record<string, unknown> & { date?: Date | string };
type YahooQuote = { marketCap?: number; regularMarketPrice?: number; currency?: string; financialCurrency?: string };
type YahooFinancialData = { financialData?: { totalRevenue?: number | { raw?: number }; financialCurrency?: string } };

const SEC = "https://data.sec.gov";
const SEC_PUBLIC = "https://www.sec.gov";
const ua = process.env.SEC_USER_AGENT || "Halisia research contact@halisia.app";
const headers = { "User-Agent": ua, Accept: "application/json" };
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
// A fact older than the previous fiscal year is not evidence about the current one.
const MAX_FACT_AGE_DAYS = 400;
const DEBT_TAG_PATTERN = /^(LongTermDebt|DebtCurrent|DebtNoncurrent|ShortTermBorrowings|CommercialPaper|NotesPayable|SeniorNotes|ConvertibleNotesPayable|SecuredDebt|UnsecuredDebt|LinesOfCredit|DebtInstrumentCarryingAmount)/;

async function get<T>(url: string): Promise<T> { try { const response = await fetch(url, { headers, cache: "no-store" }); if (!response.ok) throw new Error(`SEC HTTP ${response.status}`); return response.json() as Promise<T>; } catch (error) { throw new Error(`SEC request failed (${url}): ${error instanceof Error ? error.message : String(error)}`); } }
async function getText(url: string): Promise<string> { try { const response = await fetch(url, { headers, cache: "no-store" }); if (!response.ok) throw new Error(`SEC document HTTP ${response.status}`); return response.text(); } catch (error) { throw new Error(`SEC document request failed (${url}): ${error instanceof Error ? error.message : String(error)}`); } }
function normalized(value: string) { return value.toLowerCase().replace(/[^a-z0-9]/g, ""); }
function amountFromText(value: string, unit?: string) { const amount = Number(value.replace(/,/g, "")); if (!Number.isFinite(amount)) return undefined; const multiplier = unit?.toLowerCase() === "billion" ? 1_000_000_000 : unit?.toLowerCase() === "million" ? 1_000_000 : unit?.toLowerCase() === "thousand" ? 1_000 : 1; return amount * multiplier; }
function extractInterestIncome(html: string, fiscalPeriod: string, reportUrl: string): FinancialValue | undefined {
  const text = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ");
  const match = text.match(/(?:our\s+)?interest\s+income\s+(?:was|is)\s+\$?([\d,.]+)\s*(billion|million|thousand)?/i) ?? text.match(/interest\s+income[^$]{0,120}\$\s*([\d,.]+)\s*(billion|million|thousand)?/i);
  if (!match) return undefined;
  const context = text.slice(Math.max(0, (match.index ?? 0) - 500), (match.index ?? 0) + match[0].length + 500);
  const inferredUnit = match[2] ?? (/(?:in|dollars in|\$ in)\s+millions?/i.test(context) ? "million" : /(?:in|dollars in|\$ in)\s+billions?/i.test(context) ? "billion" : undefined);
  const value = amountFromText(match[1], inferredUnit);
  return value === undefined ? undefined : { value, currency: "USD", source: { provider: "SEC_10K_TEXT", document: "10-K", fiscalPeriod, field: "interest income", url: reportUrl }, confidence: "MEDIUM" };
}

function yahooNumber(row: YahooSeriesRow | undefined, names: string[]): number | undefined {
  for (const name of names) {
    const value = row?.[name];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}
function yahooValue(row: YahooSeriesRow | undefined, names: string[], fiscalPeriod: string, currency: string): FinancialValue | undefined {
  const value = yahooNumber(row, names);
  return value === undefined ? undefined : { value, currency, source: { provider: "Yahoo Finance", document: "fundamentalsTimeSeries", fiscalPeriod, field: names[0] }, confidence: "MEDIUM" };
}
function rawNumber(value: number | { raw?: number } | undefined) { const raw = typeof value === "number" ? value : value?.raw; return typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? raw : undefined; }

export class SECFinancialDataProvider implements FinancialDataProvider {
  async getFinancialData(identifier: string): Promise<NormalizedFinancialData> {
    const query = identifier.trim();
    const ticker = query.toUpperCase();
    const tickers = await get<Record<string, { cik_str: number; ticker: string; title: string }>>(`${SEC_PUBLIC}/files/company_tickers.json`);
    const normalizedQuery = normalized(query);
    const entries = Object.values(tickers);
    const entry = entries.find((item) => item.ticker.toUpperCase() === ticker) ?? entries.find((item) => normalized(item.title).includes(normalizedQuery));
    if (!entry) throw new Error(`Entreprise introuvable dans les données SEC pour « ${query} ». Utilisez par exemple son ticker, comme AMZN.`);
    const cik = String(entry.cik_str).padStart(10, "0");
    const symbol = entry.ticker.toUpperCase();
    const [facts, submission, quote, yahooSeries, yahooFinancials] = await Promise.all([
      get<CompanyFacts>(`${SEC}/api/xbrl/companyfacts/CIK${cik}.json`),
      get<Submission>(`${SEC}/submissions/CIK${cik}.json`),
      yahooFinance.quote(symbol).catch(() => undefined) as Promise<YahooQuote | undefined>,
      yahooFinance.fundamentalsTimeSeries(symbol, { period1: "2020-01-01", type: "annual", module: "all" }).catch(() => []) as Promise<YahooSeriesRow[]>,
      yahooFinance.quoteSummary(symbol, { modules: ["financialData"] }).catch(() => undefined) as Promise<YahooFinancialData | undefined>,
    ]);
    const recent = submission.filings?.recent;
    const filingIndex = recent?.form?.findIndex((form) => form === "10-K") ?? -1;
    const accession = filingIndex >= 0 ? recent?.accessionNumber?.[filingIndex] : undefined;
    const primaryDocument = filingIndex >= 0 ? recent?.primaryDocument?.[filingIndex] : undefined;
    const reportUrl = accession && primaryDocument ? `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accession.replaceAll("-", "")}/${primaryDocument}` : `${SEC}/api/xbrl/companyfacts/CIK${cik}.json`;

    const assetsFact = pickLatest(facts, ["Assets"], "instant");
    // IFRS filers (20-F/40-F) and holding companies that have not filed a 10-K
    // yet have no US-GAAP balance sheet; the caller falls back to Yahoo Finance.
    if (!assetsFact) throw new Error(`Aucun bilan US-GAAP (10-K) dans les données SEC pour ${symbol}.`);
    const financialCurrency = quote?.financialCurrency ?? assetsFact.unit;
    const referenceEnd = assetsFact?.fact.end;
    const fiscalPeriod = assetsFact?.fact.fy ? `FY${assetsFact.fact.fy}` : String(new Date().getFullYear() - 1);
    const notBefore = referenceEnd ? new Date(Date.parse(referenceEnd) - MAX_FACT_AGE_DAYS * DAY_MS).toISOString().slice(0, 10) : undefined;
    const yahooLatest = [...(yahooSeries ?? [])].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];

    const assets = toValue(assetsFact, reportUrl)!;
    const secRevenue = toValue(pickLatest(facts, ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "RevenueFromContractWithCustomerIncludingAssessedTax", "SalesRevenueNet"], "duration", { notBefore }), reportUrl);
    const ttmRevenue = rawNumber(yahooFinancials?.financialData?.totalRevenue);
    const revenue: FinancialValue | undefined = ttmRevenue !== undefined
      ? { value: ttmRevenue, currency: yahooFinancials?.financialData?.financialCurrency ?? financialCurrency, source: { provider: "Yahoo Finance", document: "financialData", fiscalPeriod: "TTM", field: "totalRevenue (12 mois glissants)" }, confidence: "MEDIUM" }
      : secRevenue;
    const cash = toValue(pickLatest(facts, ["CashAndCashEquivalentsAtCarryingValue", "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"], "instant", { notBefore }), reportUrl)
      ?? yahooValue(yahooLatest, ["cashAndCashEquivalents", "cashCashEquivalentsAndShortTermInvestments"], fiscalPeriod, financialCurrency);
    const securities = toValue(pickLatest(facts, ["ShortTermInvestments", "MarketableSecuritiesCurrent", "MarketableSecurities"], "instant", { notBefore }), reportUrl, "MEDIUM")
      ?? yahooValue(yahooLatest, ["otherShortTermInvestments", "cashCashEquivalentsAndShortTermInvestments"], fiscalPeriod, financialCurrency)
      ?? cash;

    const hasDebtTag = Object.keys(facts.facts?.["us-gaap"] ?? {}).some((name) => DEBT_TAG_PATTERN.test(name));
    const annualDebt = pickDebt(facts, reportUrl, { notBefore });
    const debt: FinancialValue | undefined = getLatestQuarterlyDebt(facts, reportUrl, annualDebt)
      ?? annualDebt
      ?? yahooValue(yahooLatest, ["totalDebt", "longTermDebt", "currentDebt"], fiscalPeriod, financialCurrency)
      ?? (!hasDebtTag ? { value: 0, currency: assets.currency, source: { provider: "SEC_XBRL", document: "10-K", fiscalPeriod: assets.source.fiscalPeriod, field: "aucun poste de dette déclaré", url: reportUrl }, confidence: "MEDIUM" as const } : undefined);

    // Operating interest tags come first: captive finance arms (equipment or
    // auto loans) report their interest revenue there, not as non-operating.
    let interestIncome = toValue(pickLatest(facts, ["InterestIncomeOperatingAndNonoperating", "InterestAndFeeIncomeLoansAndLeases", "InterestIncomeOperating", "InvestmentIncomeInterest", "InterestIncomeNonOperating", "InterestIncomeExpenseNonOperatingNet", "InvestmentIncomeInterestAndDividend", "InterestAndDividendIncome", "InterestAndDividendIncomeNonoperating", "InterestAndOtherNet"], "duration", { notBefore }), reportUrl);
    if (!interestIncome && reportUrl.includes("/Archives/")) {
      try { interestIncome = extractInterestIncome(await getText(reportUrl), fiscalPeriod, reportUrl); } catch { /* structured data remains the source of truth when the document is unavailable */ }
    }
    interestIncome ??= yahooValue(yahooLatest, ["interestIncome", "interestIncomeNonOperating"], fiscalPeriod, financialCurrency);
    const primaryActivity = submission.sicDescription || "Activité non documentée par SEC";
    const forbidden = /bank|insurance|alcohol|tobacco|gambling|casino|pork|weapon|defen[cs]e|adult entertainment|cannabis/i.test(primaryActivity);
    const limitations = ["Les activités secondaires sont signalées pour revue ; l’analyse automatique porte d’abord sur l’activité principale SEC.", "Les ratios de dette et de placements utilisent la capitalisation boursière moyenne sur 36 mois (cours mensuels Yahoo Finance), à défaut la capitalisation instantanée.", "Le chiffre d’affaires retenu est celui des 12 mois glissants (Yahoo Finance) lorsqu’il est disponible, sinon celui du dernier 10-K.", "La dette provient du dernier 10-Q lorsqu’il a moins de 180 jours et est plus récent que le 10-K, sinon du 10-K ; elle est reconstruite à partir de postes XBRL explicitement nommés et les engagements non courants atypiques nécessitent une revue du 10-K.", "Les liquidités incluent les postes SEC identifiables (cash et certains titres courants) ; la qualification exacte de chaque titre doit être confirmée dans les notes.", "Les revenus impurs sont alimentés uniquement par un tag d’intérêt explicite lorsqu’il existe ; les autres activités non conformes nécessitent l’analyse des notes."];
    const marketCapitalization = await getAverageMarketCap(symbol, fiscalPeriod, quote);
    return { companyName: facts.entityName || entry.title, ticker: symbol, industry: primaryActivity, fiscalPeriod, totalRevenue: revenue, totalAssets: assets, liquidity: cash, business: { primaryActivity, status: forbidden ? "FAIL" : "UNKNOWN", reason: forbidden ? `L’activité principale (« ${primaryActivity} ») correspond à une catégorie à revoir.` : `L’activité principale déclarée est « ${primaryActivity} ». Aucun interdit primaire n’a été détecté, mais les activités secondaires et les sources de revenus associées ne sont pas encore vérifiées.`, confidence: "MEDIUM" }, limitations, interestBearingDebt: debt, interestBearingCashAndSecurities: securities, impureRevenue: interestIncome, marketCapitalization };
  }
}
