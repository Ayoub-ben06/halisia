import { describe, expect, it } from "vitest";
import { runAAOIFI } from "@/lib/aaoifi/engine";
import type { FinancialValue, NormalizedFinancialData } from "@/lib/aaoifi/types";

const value = (amount: number): FinancialValue => ({ value: amount, currency: "USD", source: { provider: "test", fiscalPeriod: "FY2025", document: "10-K" }, confidence: "HIGH" });

// Market cap 1000: debt, placements and impure revenue are expressed per 1000 for readability.
function company(overrides: Partial<NormalizedFinancialData> = {}): NormalizedFinancialData {
  return {
    companyName: "Test Corp",
    ticker: "TEST",
    industry: "Services-Prepackaged Software",
    fiscalPeriod: "FY2025",
    marketCapitalization: value(1000),
    totalRevenue: value(500),
    impureRevenue: value(5),
    interestBearingDebt: value(100),
    interestBearingCashAndSecurities: value(50),
    liquidity: value(50),
    totalAssets: value(800),
    business: { primaryActivity: "Software", status: "UNKNOWN", reason: "Activité déclarée", confidence: "MEDIUM" },
    limitations: [],
    ...overrides,
  };
}

describe("runAAOIFI", () => {
  it("is compliant when the activity is permitted and every ratio is below its threshold", () => {
    const result = runAAOIFI(company());
    expect(result.status).toBe("COMPLIANT");
    expect(result.criteria.every((criterion) => criterion.status === "PASS")).toBe(true);
  });

  it("fails on interest-bearing debt at or above 33 % of market cap", () => {
    expect(runAAOIFI(company({ interestBearingDebt: value(350) })).status).toBe("NON_COMPLIANT");
  });

  it("is doubtful when debt sits between the AAOIFI 30 % and the index 33 % thresholds", () => {
    const result = runAAOIFI(company({ interestBearingDebt: value(310) }));
    expect(result.status).toBe("DOUBTFUL");
    expect(result.criteria.find((criterion) => criterion.key === "interestBearingDebt")?.status).toBe("FAIL");
  });

  it("does not apply the 30-33 % tolerance when another criterion fails too", () => {
    expect(runAAOIFI(company({ interestBearingDebt: value(310), impureRevenue: value(40) })).status).toBe("NON_COMPLIANT");
  });

  it("fails when impure revenue exceeds 5 % of revenue", () => {
    expect(runAAOIFI(company({ impureRevenue: value(26) })).status).toBe("NON_COMPLIANT");
  });

  it("stays compliant with medium confidence when only interest income is unknown", () => {
    const result = runAAOIFI(company({ impureRevenue: undefined }));
    expect(result.status).toBe("COMPLIANT");
    expect(result.confidence).toBe("MEDIUM");
    expect(result.purificationRatio).toBeNull();
  });

  it("requires review when a ratio other than interest income is unknown", () => {
    expect(runAAOIFI(company({ interestBearingDebt: undefined })).status).toBe("REVIEW_REQUIRED");
  });

  it("rejects forbidden SEC activities such as tobacco and conventional insurance", () => {
    expect(runAAOIFI(company({ industry: "Cigarettes" })).status).toBe("NON_COMPLIANT");
    expect(runAAOIFI(company({ industry: "Fire, Marine & Casualty Insurance" })).status).toBe("NON_COMPLIANT");
  });

  it("never lets a sector label override a provider-level forbidden activity", () => {
    const result = runAAOIFI(company({ business: { primaryActivity: "Bank", status: "FAIL", reason: "Banque", confidence: "MEDIUM" } }));
    expect(result.status).toBe("NON_COMPLIANT");
  });

  it("marks editorial business-model cases as doubtful", () => {
    expect(runAAOIFI(company({ ticker: "GOOGL" })).status).toBe("DOUBTFUL");
  });

  it("rejects editorial weapons exposure and known impermissible segments", () => {
    expect(runAAOIFI(company({ ticker: "RTX", industry: "Aircraft Engines & Engine Parts" })).status).toBe("NON_COMPLIANT");
    expect(runAAOIFI(company({ ticker: "MC.PA", industry: "Luxury Goods" })).status).toBe("NON_COMPLIANT");
  });

  it("does not exclude Islamic banks as conventional finance", () => {
    const result = runAAOIFI(company({ ticker: "1120.SR", sector: "Financial Services", industry: "Banks - Regional" }));
    expect(result.business.status).toBe("PASS");
  });

  it("does not let a US editorial entry leak to a foreign listing with the same root", () => {
    // "BA" is Boeing in the weapons list; "BA.L" has its own entry (BAE), "BAYN.DE" none.
    expect(runAAOIFI(company({ ticker: "BAYN.DE", industry: "Drug Manufacturers - General" })).status).toBe("COMPLIANT");
  });

  it("exposes the impure revenue ratio as purification ratio only for compliant or doubtful stocks", () => {
    expect(runAAOIFI(company()).purificationRatio).toBeCloseTo(0.01);
    expect(runAAOIFI(company({ interestBearingDebt: value(400) })).purificationRatio).toBeNull();
  });
});
