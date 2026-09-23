import { AAOIFI_SCREENING_V1 } from "./thresholds";
import { BUSINESS_MODEL_DOUBTFUL_NOTE, getBusinessModelDoubt, getFinancialSectorClients, getIslamicFinancial, getNonPermissibleRevenue, getWeaponsExposure } from "./business-model";
import { getDoubtfulActivityReason, getNonCompliantReason, isForbiddenSector } from "./rules";
import type { CriterionResult, FinancialValue, NormalizedFinancialData, ScreeningResult } from "./types";

function dataSource(value: FinancialValue | undefined) {
  return value && `${value.source.document ?? value.source.provider} (${value.source.fiscalPeriod})`;
}

function ratioResult(key: string, label: string, numerator: FinancialValue | undefined, denominator: FinancialValue | undefined, threshold: number, operator: "<" | "≤"): CriterionResult {
  const confidence = numerator && denominator && numerator.confidence === "HIGH" && denominator.confidence === "HIGH" ? "HIGH" : numerator && denominator ? "MEDIUM" : "LOW";
  const fiscalPeriod = numerator?.source.fiscalPeriod ?? denominator?.source.fiscalPeriod;
  const source = dataSource(numerator ?? denominator);
  if (!numerator || !denominator || denominator.value <= 0) return { key, label, status: "UNKNOWN", numerator, denominator, threshold, operator, fiscalPeriod, dataSource: source, confidence, explanation: "Donnée nécessaire absente ou non exploitable : aucune conclusion n’est tirée." };
  const ratio = numerator.value / denominator.value;
  const passed = operator === "<" ? ratio < threshold : ratio <= threshold;
  return { key, label, status: passed ? "PASS" : "FAIL", numerator, denominator, ratio, threshold, operator, fiscalPeriod, dataSource: source, confidence, explanation: `${(ratio * 100).toFixed(2)} % ${operator} ${(threshold * 100).toFixed(0)} %.` };
}

export function runAAOIFI(data: NormalizedFinancialData): ScreeningResult {
  const t = AAOIFI_SCREENING_V1;
  const criteria = [
    ratioResult("impureRevenue", "Revenus impurs", data.impureRevenue, data.totalRevenue, t.impureRevenueRatio.value, t.impureRevenueRatio.operator),
    ratioResult("interestBearingDebt", "Dette portant intérêt", data.interestBearingDebt, data.marketCapitalization, t.interestBearingDebtRatio.value, t.interestBearingDebtRatio.operator),
    ratioResult("interestBearingCashAndSecurities", "Actifs portant intérêt", data.interestBearingCashAndSecurities, data.marketCapitalization, t.interestBearingCashAndSecuritiesRatio.value, t.interestBearingCashAndSecuritiesRatio.operator),
    ratioResult("liquidity", "Liquidités / actifs", data.liquidity, data.totalAssets, t.liquidityToAssetsRatio.value, t.liquidityToAssetsRatio.operator),
  ];
  // The verdict must be based on evidence, not on a ticker allow/deny list.
  // A provider's sector/industry classification is enough to validate the
  // primary activity; missing secondary-activity data is a limitation, not an
  // automatic failure or review when all AAOIFI tests are known.
  const islamicFinancial = getIslamicFinancial(data.ticker);
  const forbiddenSector = !islamicFinancial && isForbiddenSector(data.sector, data.industry);
  const weaponsExposure = getWeaponsExposure(data.ticker);
  const financialClients = getFinancialSectorClients(data.ticker);
  const nonPermissibleRevenue = getNonPermissibleRevenue(data.ticker) ?? (financialClients && `Clients du secteur financier : ${financialClients}`);
  // A provider-level FAIL (e.g. SEC activity keywords) must never be overridden
  // just because a sector label is present.
  const forbiddenActivity = forbiddenSector || Boolean(weaponsExposure) || Boolean(nonPermissibleRevenue) || (!islamicFinancial && data.business.status === "FAIL");
  const businessStatus = forbiddenActivity ? "FAIL" : data.sector || data.industry ? "PASS" : data.business.status;
  const explanation = forbiddenSector
    ? getNonCompliantReason(data.ticker, data.sector, data.industry)
    : weaponsExposure ? `Armement : ${weaponsExposure}.`
      : nonPermissibleRevenue ? `Revenus non permis : ${nonPermissibleRevenue}.`
        : islamicFinancial ? `${islamicFinancial} : l'exclusion de la finance conventionnelle ne s'applique pas.`
          : data.business.reason;
  const business: CriterionResult = { key: "business", label: "Activité", status: businessStatus, fiscalPeriod: data.fiscalPeriod, confidence: forbiddenActivity ? "HIGH" : data.business.confidence, explanation };
  const all = [business, ...criteria];
  const verdict = decide(all, data);
  const impureRatio = criteria[0].ratio;
  const purificationRatio = (verdict.status === "COMPLIANT" || verdict.status === "DOUBTFUL") && impureRatio !== undefined ? impureRatio : null;
  return { ...verdict, purificationRatio, purificationAmount: null, methodology: t.id, companyName: data.companyName, ticker: data.ticker, isin: data.isin, sector: data.sector ?? data.industry, fiscalPeriod: data.fiscalPeriod, business, criteria, limitations: data.limitations };
}

function decide(all: CriterionResult[], data: NormalizedFinancialData): Pick<ScreeningResult, "status" | "confidence" | "reason" | "note"> {
  const confidence = all.some((criterion) => criterion.confidence === "LOW") ? "LOW" : all.every((criterion) => criterion.confidence === "HIGH") ? "HIGH" : "MEDIUM";
  const failed = all.filter((criterion) => criterion.status === "FAIL");
  const debtTolerance = AAOIFI_SCREENING_V1.interestBearingDebtToleranceRatio.value;
  if (failed.length === 1 && failed[0].key === "interestBearingDebt" && failed[0].ratio !== undefined && failed[0].ratio <= debtTolerance) {
    return { status: "DOUBTFUL", confidence, reason: "Ratio de dette entre 30% et 33% — conforme selon certains indices islamiques (Dow Jones, S&P Shariah) mais dépasse le seuil strict AAOIFI", note: "Divergence entre scholars sur le seuil applicable. Nous recommandons de consulter un scholar." };
  }
  if (failed.length) return { status: "NON_COMPLIANT", confidence };
  const businessModelDoubt = getBusinessModelDoubt(data.ticker);
  if (businessModelDoubt) return { status: "DOUBTFUL", confidence, reason: businessModelDoubt, note: BUSINESS_MODEL_DOUBTFUL_NOTE };
  const doubtfulActivity = getDoubtfulActivityReason(data.industry);
  if (doubtfulActivity) return { status: "DOUBTFUL", confidence, reason: doubtfulActivity, note: "Les ratios financiers sont conformes ; la part des revenus non permis doit être vérifiée dans le rapport annuel." };
  const unknown = all.filter((criterion) => criterion.status === "UNKNOWN");
  if (!unknown.length) return { status: "COMPLIANT", confidence };
  // Interest income is often not tagged in XBRL for non-financial companies;
  // its absence alone should not block a verdict when every other test passes.
  if (unknown.length === 1 && unknown[0].key === "impureRevenue") {
    return { status: "COMPLIANT", confidence: "MEDIUM", reason: "Revenus d'intérêts non identifiés dans les rapports financiers — secteur et autres ratios conformes", note: "Donnée de revenus impurs absente — vérification manuelle recommandée" };
  }
  return { status: data.business.confidence === "LOW" ? "INSUFFICIENT_DATA" : "REVIEW_REQUIRED", confidence };
}
