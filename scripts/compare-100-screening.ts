import dotenv from "dotenv";
import { readFile, writeFile } from "node:fs/promises";
import { getFinancialData } from "../lib/aaoifi/data-provider";
import { runAAOIFI } from "../lib/aaoifi/engine";
import type { ScreeningStatus } from "../lib/aaoifi/types";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

const ALL_TICKERS = [
  "AAPL", "MSFT", "AMZN", "NVDA", "GOOGL", "META", "AVGO", "GOOG", "TSLA", "BRK-B", "LLY", "V", "JPM", "WMT", "ORCL", "MA", "XOM", "COST", "JNJ", "HD", "PG", "NFLX", "BAC", "ABBV", "CVX", "CRM", "KO", "MRK", "AMD", "PEP", "ADBE", "TMO", "ACN", "MCD", "CSCO", "ABT", "LIN", "DHR", "WFC", "INTC", "CMCSA", "DIS", "VZ", "INTU", "QCOM", "AMGN", "IBM", "TXN", "PFE", "CAT", "PM", "NOW", "NEE", "UNP", "RTX", "LOW", "HON", "SPGI", "GE", "BA", "UPS", "COP", "PLD", "GS", "ELV", "LMT", "DE", "BLK", "SYK", "TJX", "ADP", "MDT", "GILD", "VRTX", "ISRG", "ADI", "REGN", "MMC", "C", "ETN", "LRCX", "CB", "MO", "SO", "DUK", "BSX", "PGR", "CI", "ZTS", "BDX", "SCHW", "NOC", "CME", "SLB", "EOG", "FIS", "ITW", "ICE", "APD", "SNPS",
];

const requestedTickers = process.env.MUSAFFA_TICKERS?.split(",").map((ticker) => ticker.trim()).filter(Boolean);
const TICKERS = requestedTickers?.length ? requestedTickers : ALL_TICKERS;
const OUTPUT_FILE = process.env.SCREENING_OUTPUT_FILE ?? "screening-comparison-100.json";

type MusaffaRow = { stockName?: string; companyName?: string; shariahComplianceStatus?: string; rawStatus?: string; sourceUrl?: string; scrapedAt?: string; httpStatus?: number; error?: string };
type Comparison = { ticker: string; ours?: ScreeningStatus | "ERROR"; musaffa?: ScreeningStatus | "NOT_AVAILABLE"; match: boolean | null; oursResult?: unknown; musaffaResult?: MusaffaRow; error?: string };

function toStatus(value?: string): ScreeningStatus | "NOT_AVAILABLE" { const status = value?.toUpperCase(); if (status === "COMPLIANT" || status === "HALAL") return "COMPLIANT"; if (status === "NON_COMPLIANT" || status === "NOT HALAL" || status === "NOT_HALAL") return "NON_COMPLIANT"; if (status === "DOUBTFUL") return "DOUBTFUL"; if (status === "NOT COVERED") return "INSUFFICIENT_DATA"; return "NOT_AVAILABLE"; }
function statusesMatch(ours: ScreeningStatus, musaffa: ScreeningStatus) { return ours === musaffa || (musaffa === "DOUBTFUL" && ours === "REVIEW_REQUIRED"); }
function sleep(milliseconds: number) { return new Promise((resolve) => setTimeout(resolve, milliseconds)); }
// Musaffa mostly uses Yahoo symbols, except Hong Kong (no leading zeros) and
// Bursa Malaysia (company names instead of numeric codes).
const MUSAFFA_SYMBOLS: Record<string, string> = { "RO.SW": "ROG.SW", "1155.KL": "MAYBANK.KL", "1295.KL": "PBBANK.KL", "5347.KL": "TENAGA.KL", "5225.KL": "IHH.KL", "1023.KL": "CIMB.KL", "6888.KL": "AXIATA.KL", "5183.KL": "PCHEM.KL", "4863.KL": "TM.KL", "3816.KL": "MISC.KL", "5681.KL": "PETDAG.KL" };
function musaffaSymbol(ticker: string) { return MUSAFFA_SYMBOLS[ticker] ?? ticker.replace(/^0+(\d+\.HK)$/, "$1"); }
async function scrapeMusaffa(ticker: string): Promise<MusaffaRow> {
  const sourceUrl = `https://musaffa.com/stock/${encodeURIComponent(musaffaSymbol(ticker))}/`;
  const scrapedAt = new Date().toISOString();
  try {
    const response = await fetch(sourceUrl, { headers: { "User-Agent": "Halisia public research comparison/1.0" }, redirect: "follow" });
    const html = await response.text();
    if (!response.ok) return { stockName: ticker, sourceUrl, scrapedAt, httpStatus: response.status, error: `Musaffa HTTP ${response.status}` };
    const statusMatch = html.match(/classified\s+as\s+(HALAL|NOT\s+HALAL|DOUBTFUL)/i);
    const rawStatus = statusMatch?.[1]?.toUpperCase().replace(/\s+/g, "_");
    return { stockName: ticker, sourceUrl, scrapedAt, httpStatus: response.status, rawStatus, shariahComplianceStatus: rawStatus };
  } catch (error) {
    return { stockName: ticker, sourceUrl, scrapedAt, error: error instanceof Error ? error.message : String(error) };
  }
}
async function getMusaffaResults(): Promise<Map<string, MusaffaRow>> {
  const delay = Number(process.env.MUSAFFA_SCRAPE_DELAY_MS ?? 1000);
  const results = new Map<string, MusaffaRow>();
  // Reuses the Musaffa statuses of a previous run instead of scraping again.
  const cacheFile = process.env.MUSAFFA_CACHE_FILE;
  if (cacheFile) {
    const previous = JSON.parse(await readFile(cacheFile, "utf8")) as { results: Comparison[] };
    for (const row of previous.results) if (row.musaffaResult?.shariahComplianceStatus) results.set(row.ticker, row.musaffaResult);
  }
  for (const ticker of TICKERS) { if (results.has(ticker)) continue; results.set(ticker, await scrapeMusaffa(ticker)); await sleep(delay); }
  return results;
}

async function main() {
  const musaffa = await getMusaffaResults();
  const results: Comparison[] = [];
  for (const ticker of TICKERS) {
    try {
      const data = await getFinancialData(ticker);
      const ours = runAAOIFI(data);
      const musaffaResult = musaffa.get(ticker);
      const oursStatus = ours.status;
      const musaffaStatus = toStatus(musaffaResult?.shariahComplianceStatus);
      results.push({ ticker, ours: oursStatus, musaffa: musaffaStatus, match: musaffaStatus === "NOT_AVAILABLE" ? null : statusesMatch(oursStatus, musaffaStatus), oursResult: ours, musaffaResult });
    } catch (error) {
      results.push({ ticker, ours: "ERROR", musaffa: toStatus(musaffa.get(ticker)?.shariahComplianceStatus), match: null, musaffaResult: musaffa.get(ticker), error: error instanceof Error ? error.message : String(error) });
    }
  }
  const comparable = results.filter((result) => result.match !== null);
  const output = { generatedAt: new Date().toISOString(), universe: { count: TICKERS.length, source: "curated US large-cap universe" }, methodology: "AAOIFI_SCREENING_V1", musaffa: { source: "public Musaffa stock pages scraped sequentially", delayMs: Number(process.env.MUSAFFA_SCRAPE_DELAY_MS ?? 1000), mapping: { HALAL: "COMPLIANT", NOT_HALAL: "NON_COMPLIANT", DOUBTFUL: "DOUBTFUL (REVIEW_REQUIRED accepté)" } }, summary: { total: results.length, comparable: comparable.length, matches: comparable.filter((result) => result.match).length, mismatches: comparable.filter((result) => result.match === false).length, matchRate: comparable.length ? comparable.filter((result) => result.match).length / comparable.length : null }, results };
  await writeFile(OUTPUT_FILE, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Écrit ${OUTPUT_FILE} — ${results.length} titres, ${output.summary.matches}/${output.summary.comparable} correspondances.`);
}

void main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
