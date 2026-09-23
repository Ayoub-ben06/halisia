import type { FinancialValue } from "./types";

export type Fact = { fy?: number; fp?: string; form?: string; filed?: string; start?: string; end?: string; val: number; frame?: string };
export type CompanyFacts = { entityName?: string; facts?: Record<string, Record<string, { units?: Record<string, Fact[]> }>> };
export type FactKind = "duration" | "instant";
export type PickedFact = { fact: Fact & { end: string }; name: string; unit: string };
export type PickOptions = { notBefore?: string; end?: string; forms?: string[] };

export const DAY_MS = 86_400_000;

export function daysBetween(from: string, to: string) { return (Date.parse(to) - Date.parse(from)) / DAY_MS; }

// Every filing repeats prior-period comparatives and companies switch tags over
// time, so the most recent period end is chosen across all candidate tags
// (tag order only breaks ties), and duration facts must cover a full year.
export function pickLatest(facts: CompanyFacts, names: string[], kind: FactKind, options: PickOptions = {}): PickedFact | undefined {
  const forms = options.forms ?? ["10-K"];
  let best: (PickedFact & { rank: number }) | undefined;
  names.forEach((name, rank) => {
    const units = facts.facts?.["us-gaap"]?.[name]?.units ?? {};
    for (const [unit, values] of Object.entries(units)) {
      // Monetary facts use an ISO currency unit ("USD", "CAD"…); ratios and per-share units are skipped.
      if (!/^[A-Z]{3}$/.test(unit)) continue;
      for (const fact of values) {
        if (!fact.form || !forms.some((form) => fact.form!.startsWith(form)) || !fact.end || !Number.isFinite(fact.val)) continue;
        if (kind === "duration" ? !fact.start || Math.abs(daysBetween(fact.start, fact.end) - 365) > 35 : Boolean(fact.start)) continue;
        if (options.end ? fact.end !== options.end : options.notBefore && fact.end < options.notBefore) continue;
        const better = !best || fact.end > best.fact.end || (fact.end === best.fact.end && (rank < best.rank || (rank === best.rank && String(fact.filed) > String(best.fact.filed))));
        if (better) best = { fact: fact as Fact & { end: string }, name, unit, rank };
      }
    }
  });
  return best && { fact: best.fact, name: best.name, unit: best.unit };
}

export function toValue(picked: PickedFact | undefined, reportUrl: string, confidence: "HIGH" | "MEDIUM" = "HIGH", document = "10-K"): FinancialValue | undefined {
  return picked && { value: picked.fact.val, currency: picked.unit, source: { provider: "SEC_XBRL", document, fiscalPeriod: picked.fact.end, field: picked.name, url: reportUrl }, confidence };
}

const NONCURRENT_DEBT = ["LongTermDebtNoncurrent"];
const CURRENT_DEBT = ["LongTermDebtCurrent", "DebtCurrent"];
const TOTAL_DEBT = ["LongTermDebt", "DebtLongtermAndShorttermCombinedAmount", "LongTermDebtAndFinanceLeaseObligationsNoncurrent", "DebtCurrent", "LongTermDebtAndFinanceLeaseObligationsCurrent"];

// Current and non-current debt are only added when they share a balance-sheet
// date; otherwise a stale current portion could be added to recent debt.
export function pickDebt(facts: CompanyFacts, reportUrl: string, options: PickOptions): FinancialValue | undefined {
  const document = options.forms?.join("/") ?? "10-K";
  const noncurrent = pickLatest(facts, NONCURRENT_DEBT, "instant", options);
  if (noncurrent) {
    const current = pickLatest(facts, CURRENT_DEBT, "instant", { forms: options.forms, end: noncurrent.fact.end });
    const sameUnitCurrent = current?.unit === noncurrent.unit ? current : undefined;
    return { value: noncurrent.fact.val + (sameUnitCurrent?.fact.val ?? 0), currency: noncurrent.unit, source: { provider: "SEC_XBRL", document, fiscalPeriod: noncurrent.fact.end, field: [noncurrent.name, sameUnitCurrent?.name].filter(Boolean).join(" + "), url: reportUrl }, confidence: "MEDIUM" };
  }
  return toValue(pickLatest(facts, TOTAL_DEBT, "instant", options), reportUrl, "MEDIUM", document);
}
