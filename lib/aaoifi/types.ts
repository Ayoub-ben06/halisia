export type DataConfidence = "HIGH" | "MEDIUM" | "LOW";
export type CriterionStatus = "PASS" | "FAIL" | "UNKNOWN";
export type ScreeningStatus = "COMPLIANT" | "NON_COMPLIANT" | "DOUBTFUL" | "REVIEW_REQUIRED" | "INSUFFICIENT_DATA";

export interface FinancialValue {
  value: number;
  currency: string;
  source: { provider: string; document?: string; fiscalPeriod: string; field?: string; url?: string; page?: number };
  confidence: DataConfidence;
}

export interface NormalizedFinancialData {
  companyName: string;
  ticker: string;
  isin?: string;
  sector?: string;
  industry?: string;
  fiscalPeriod: string;
  marketCapitalization?: FinancialValue;
  totalRevenue?: FinancialValue;
  impureRevenue?: FinancialValue;
  interestBearingDebt?: FinancialValue;
  interestBearingCashAndSecurities?: FinancialValue;
  liquidity?: FinancialValue;
  totalAssets?: FinancialValue;
  business: { primaryActivity: string; secondaryActivities?: string[]; status: CriterionStatus; reason: string; confidence: DataConfidence };
  limitations: string[];
}

export interface CriterionResult {
  key: string;
  label: string;
  status: CriterionStatus;
  numerator?: FinancialValue;
  denominator?: FinancialValue;
  ratio?: number;
  threshold?: number;
  operator?: "<" | "≤";
  fiscalPeriod?: string;
  dataSource?: string;
  confidence: DataConfidence;
  explanation: string;
}

export interface ScreeningResult {
  status: ScreeningStatus;
  confidence?: DataConfidence;
  reason?: string;
  note?: string;
  /** Share of dividends to purify (impure revenue ratio); null when unknown or not applicable. */
  purificationRatio?: number | null;
  /** Amount to donate for the user's position; null when no position is known. */
  purificationAmount?: number | null;
  methodology: "AAOIFI_SCREENING_V1";
  companyName: string;
  ticker: string;
  isin?: string;
  sector?: string;
  fiscalPeriod: string;
  business: CriterionResult;
  criteria: CriterionResult[];
  limitations: string[];
}

export interface FinancialDataProvider {
  getFinancialData(identifier: string): Promise<NormalizedFinancialData>;
}
