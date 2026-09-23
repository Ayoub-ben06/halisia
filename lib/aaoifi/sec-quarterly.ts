import { DAY_MS, pickDebt, type CompanyFacts } from "./sec-facts";
import type { FinancialValue } from "./types";

export const MAX_QUARTERLY_AGE_DAYS = 180;

// Debt from the most recent 10-Q balance sheet, when it is newer than the
// annual figure and no older than 180 days; otherwise the caller keeps the
// 10-K value.
export function getLatestQuarterlyDebt(facts: CompanyFacts, reportUrl: string, annualDebt: FinancialValue | undefined, now = new Date()): FinancialValue | undefined {
  const notBefore = new Date(now.getTime() - MAX_QUARTERLY_AGE_DAYS * DAY_MS).toISOString().slice(0, 10);
  const quarterly = pickDebt(facts, reportUrl, { forms: ["10-Q"], notBefore });
  if (!quarterly) return undefined;
  if (annualDebt?.source.provider === "SEC_XBRL" && annualDebt.source.fiscalPeriod >= quarterly.source.fiscalPeriod) return undefined;
  return quarterly;
}
