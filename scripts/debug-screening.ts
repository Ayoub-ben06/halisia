import dotenv from "dotenv";
import YahooFinance from "yahoo-finance2";
import { runAAOIFI } from "../lib/aaoifi/engine";
import { getFinancialData } from "../lib/aaoifi/data-provider";
import type { FinancialValue, NormalizedFinancialData, ScreeningResult, ScreeningStatus } from "../lib/aaoifi/types";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

type ExpectedStatus = "compliant" | "non_compliant" | "doubtful";
type TestCase = { ticker: string; name: string; expected: ExpectedStatus; musaffa: ExpectedStatus; reason?: string };
type QuoteProfile = { sector?: string; industry?: string };
type YahooQuote = { marketCap?: unknown; currency?: unknown };
type YahooSummary = { assetProfile?: QuoteProfile };

const TEST_CASES: TestCase[] = [
  { ticker: "AAPL", name: "Apple Inc.", expected: "compliant", musaffa: "compliant" },
  { ticker: "MSFT", name: "Microsoft", expected: "compliant", musaffa: "compliant" },
  { ticker: "AI.PA", name: "Air Liquide", expected: "compliant", musaffa: "compliant" },
  { ticker: "NOVO-B.CO", name: "Novo Nordisk", expected: "compliant", musaffa: "compliant" },
  { ticker: "ASML.AS", name: "ASML", expected: "compliant", musaffa: "compliant" },
  { ticker: "BNP.PA", name: "BNP Paribas", expected: "non_compliant", musaffa: "non_compliant", reason: "banque" },
  { ticker: "GLE.PA", name: "Société Générale", expected: "non_compliant", musaffa: "non_compliant", reason: "banque" },
  { ticker: "MC.PA", name: "LVMH", expected: "non_compliant", musaffa: "non_compliant", reason: "alcool" },
  { ticker: "ABI.BR", name: "AB InBev", expected: "non_compliant", musaffa: "non_compliant", reason: "alcool" },
  { ticker: "PM", name: "Philip Morris", expected: "non_compliant", musaffa: "non_compliant", reason: "tabac" },
  { ticker: "TSLA", name: "Tesla", expected: "doubtful", musaffa: "doubtful" },
  { ticker: "AMZN", name: "Amazon", expected: "doubtful", musaffa: "doubtful" },
  { ticker: "GOOGL", name: "Alphabet", expected: "non_compliant", musaffa: "non_compliant", reason: "publicité > 5%" },
];

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
const forbiddenSectorFragments = [
  "banks", "bank", "banking", "financial services", "diversified banks", "regional banks",
  "insurance", "life insurance", "property & casualty insurance", "capital markets", "consumer finance",
  "mortgage finance", "asset management", "investment banking", "beverages—wineries & distilleries",
  "beverages—brewers", "alcohol", "alcoholic beverages", "tobacco", "gambling", "casinos & gaming",
  "adult entertainment", "entertainment", "broadcasting", "publishing", "aerospace & defense", "defense",
];

function rawValue(value?: FinancialValue): number | null { return value?.value ?? null; }
function percent(numerator: number | null, denominator: number | null): number | null { return numerator !== null && denominator !== null && denominator > 0 ? numerator / denominator : null; }
function formatValue(value: number | null): string { return value === null ? "null" : value.toLocaleString("fr-FR"); }
function formatRatio(value: number | null): string { return value === null ? "UNKNOWN" : `${(value * 100).toFixed(2)} %`; }
function expectedToStatus(expected: ExpectedStatus): ScreeningStatus { return expected === "compliant" ? "COMPLIANT" : expected === "non_compliant" ? "NON_COMPLIANT" : "DOUBTFUL"; }
function criterion(result: ScreeningResult, key: string) { return result.criteria.find((item) => item.key === key); }

function logRawData(data: NormalizedFinancialData, profile: QuoteProfile, quote: YahooQuote) {
  const marketCap = rawValue(data.marketCapitalization);
  const revenue = rawValue(data.totalRevenue);
  const interestIncome = rawValue(data.impureRevenue);
  const debt = rawValue(data.interestBearingDebt);
  const cash = rawValue(data.liquidity);
  const securities = rawValue(data.interestBearingCashAndSecurities);
  const assets = rawValue(data.totalAssets);
  console.log(`📊 RAW DATA FROM SEC/XBRL + YAHOO FINANCE:\n  Sector: ${profile.sector ?? "null"}\n  Industry: ${profile.industry ?? "null"}\n  SEC primary activity: ${data.business.primaryActivity}\n  Market Cap: ${formatValue(marketCap)} ${data.marketCapitalization?.currency ?? ""}\n  Total Revenue: ${formatValue(revenue)} ${data.totalRevenue?.currency ?? ""}\n  Interest Income / Impure Revenue: ${formatValue(interestIncome)} ${data.impureRevenue?.currency ?? ""}\n  Interest-Bearing Debt: ${formatValue(debt)} ${data.interestBearingDebt?.currency ?? ""}\n  Cash & Equivalents: ${formatValue(cash)} ${data.liquidity?.currency ?? ""}\n  Short Term Investments / Interest-Bearing Securities: ${formatValue(securities)} ${data.interestBearingCashAndSecurities?.currency ?? ""}\n  Total Assets: ${formatValue(assets)} ${data.totalAssets?.currency ?? ""}\n  Yahoo marketCap raw: ${JSON.stringify(quote)}\n  Normalized provider output:\n${JSON.stringify(data, null, 2)}`);
}

function logRatios(data: NormalizedFinancialData) {
  const revenue = rawValue(data.totalRevenue);
  const interestIncome = rawValue(data.impureRevenue);
  const marketCap = rawValue(data.marketCapitalization);
  const debt = rawValue(data.interestBearingDebt);
  const placements = rawValue(data.interestBearingCashAndSecurities);
  const cash = rawValue(data.liquidity);
  const assets = rawValue(data.totalAssets);
  const revenueRatio = percent(interestIncome, revenue);
  const debtRatio = percent(debt, marketCap);
  const placementRatio = percent(placements, marketCap);
  const liquidityRatio = percent(cash, assets);
  console.log(`🔍 CALCULATED RATIOS:\n  Revenue ratio: ${formatValue(interestIncome)} / ${formatValue(revenue)} = ${formatRatio(revenueRatio)}\n  → Threshold: ≤ 5 % | Result: ${revenueRatio === null ? "⚠️ UNKNOWN" : revenueRatio <= 0.05 ? "✅ PASS" : "❌ FAIL"}\n\n  Debt ratio: ${formatValue(debt)} / ${formatValue(marketCap)} = ${formatRatio(debtRatio)}\n  → Threshold: < 30 % | Result: ${debtRatio === null ? "⚠️ UNKNOWN" : debtRatio < 0.30 ? "✅ PASS" : "❌ FAIL"}\n\n  Placement ratio: ${formatValue(placements)} / ${formatValue(marketCap)} = ${formatRatio(placementRatio)}\n  → Threshold: < 30 % | Result: ${placementRatio === null ? "⚠️ UNKNOWN" : placementRatio < 0.30 ? "✅ PASS" : "❌ FAIL"}\n\n  Liquidity ratio: ${formatValue(cash)} / ${formatValue(assets)} = ${formatRatio(liquidityRatio)}\n  → Threshold: < 70 % | Result: ${liquidityRatio === null ? "⚠️ UNKNOWN" : liquidityRatio < 0.70 ? "✅ PASS" : "❌ FAIL"}`);
}

function collectIssues(ticker: string, data: NormalizedFinancialData, profile: QuoteProfile, result: ScreeningResult) {
  const issues: string[] = [];
  if (!data.totalRevenue || data.totalRevenue.value === 0) issues.push("totalRevenue absent ou nul : ratio des revenus impossible");
  if (!data.marketCapitalization || data.marketCapitalization.value === 0) issues.push("marketCap absent ou nul : ratios dette/placements impossibles");
  if (!data.impureRevenue) issues.push("impureRevenue absent : vérifier les tags interest income et les notes du 10-K");
  if (!data.interestBearingDebt) issues.push("interestBearingDebt absent : vérifier les tags dette courante/non courante");
  if (!data.interestBearingCashAndSecurities) issues.push("interestBearingCashAndSecurities absent : placements non identifiés");
  if (!data.liquidity || !data.totalAssets) issues.push("liquidity ou totalAssets absent : ratio de liquidité impossible");
  const sectorText = `${profile.sector ?? ""} ${profile.industry ?? ""}`.toLowerCase();
  if (forbiddenSectorFragments.some((fragment) => sectorText.includes(fragment))) issues.push(`mapping sectoriel à vérifier : ${profile.sector ?? ""} / ${profile.industry ?? ""}`);
  if (ticker === "GOOGL") issues.push("Alphabet : la publicité n'est pas encore isolée automatiquement ; revue manuelle requise");
  for (const item of result.criteria) if (item.status === "UNKNOWN") issues.push(`${item.key} = UNKNOWN`);
  if (result.business.status === "UNKNOWN") issues.push("activité secondaire non vérifiée");
  return issues;
}

async function inspect(testCase: TestCase) {
  console.log(`\n========================================\n${testCase.ticker} — ${testCase.name}\n========================================`);
  try {
    const data = await getFinancialData(testCase.ticker);
    let quote: YahooQuote = {};
    try { quote = await yahooFinance.quote(data.ticker) as unknown as YahooQuote; } catch (error) { console.warn(`⚠️ Yahoo quote error: ${error instanceof Error ? error.message : String(error)}`); }
    if (!data.marketCapitalization && typeof quote.marketCap === "number") data.marketCapitalization = { value: quote.marketCap, currency: typeof quote.currency === "string" ? quote.currency : "USD", source: { provider: "Yahoo Finance", fiscalPeriod: data.fiscalPeriod, field: "marketCap" }, confidence: "MEDIUM" };
    let profile: QuoteProfile = {};
    try { const summary = await yahooFinance.quoteSummary(data.ticker, { modules: ["assetProfile"] }) as unknown as YahooSummary; profile = summary.assetProfile ?? {}; } catch (error) { console.warn(`⚠️ Yahoo profile error: ${error instanceof Error ? error.message : String(error)}`); }
    const result = runAAOIFI(data);
    logRawData(data, profile, quote);
    logRatios(data);
    const issues = collectIssues(testCase.ticker, data, profile, result);
    console.log(`\n🎯 OUR RESULT: ${result.status} — ${result.business.explanation}\n✅ EXPECTED:   ${testCase.expected} (${expectedToStatus(testCase.expected)})\n${result.status === expectedToStatus(testCase.expected) ? "✅ MATCH" : "❌ MISMATCH — INVESTIGATE"}`);
    if (issues.length) console.log(`⚠️ DATA QUALITY ISSUES:\n${issues.map((issue) => `  - ${issue}`).join("\n")}`);
    if (data.limitations.length) console.log(`ℹ️ LIMITATIONS:\n${data.limitations.map((item) => `  - ${item}`).join("\n")}`);
    return { ticker: testCase.ticker, ours: result.status, expected: expectedToStatus(testCase.expected), issues };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`❌ ERROR: ${message}`);
    return { ticker: testCase.ticker, ours: "ERROR", expected: expectedToStatus(testCase.expected), issues: [message] };
  }
}

async function main() {
  const results = [];
  for (const testCase of TEST_CASES) results.push(await inspect(testCase));
  const matches = results.filter((item) => item.ours === item.expected).length;
  const mismatches = results.length - matches;
  console.log(`\n========================================\nSCREENING DIAGNOSTIC SUMMARY\n========================================\nTotal tested: ${results.length}\n✅ Matches: ${matches} (${results.length ? ((matches / results.length) * 100).toFixed(1) : "0.0"} %)\n❌ Mismatches: ${mismatches}`);
  if (mismatches) {
    console.log(`\nMISMATCHES TO FIX:\n${results.filter((item) => item.ours !== item.expected).map((item) => `  ${item.ticker}: we said ${item.ours} | expected ${item.expected}\n  Likely cause: ${item.issues.join("; ") || "classification or threshold mismatch"}`).join("\n")}`);
  }
  console.log(`\nNEXT STEPS:\n${mismatches ? "→ Inspect UNKNOWN fields, SEC/XBRL tags, sector mapping, and business-activity evidence." : "→ All reference statuses matched; validate against additional reporting periods."}`);
  process.exitCode = mismatches ? 1 : 0;
}

void main();
