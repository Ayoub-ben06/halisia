export type ETFType = "islamic_certified" | "bond" | "conventional";
export type ETFVerdict = "compliant" | "doubtful" | "non_compliant" | "bond_forbidden";

export type ETFDefinition = {
  ticker: string;
  isin: string | null;
  name: string;
  etf_type: ETFType;
  provider: string;
  halal_alternative: string | null;
};

export type ETFHolding = {
  ticker: string | null;
  isin: string | null;
  name: string;
  weight: number;
};

export type ETFTopHolding = ETFHolding & {
  status: "compliant" | "doubtful" | "non_compliant" | "unknown";
  reason: string;
};

export type ETFScreeningResult = {
  verdict: ETFVerdict;
  verdictReason: string;
  totalHoldings: number;
  analyzedHoldings: number;
  compliantWeight: number;
  doubtfulWeight: number;
  nonCompliantWeight: number;
  unanalyzedWeight: number;
  purificationRatio: number;
  topNonCompliant: ETFTopHolding[];
  halalAlternative: string | null;
};
