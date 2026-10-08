import { describe, expect, it } from "vitest";
import { pickDebt, pickLatest, type CompanyFacts, type Fact } from "@/lib/aaoifi/sec-facts";

function facts(tags: Record<string, Fact[]>, unit = "USD"): CompanyFacts {
  return { facts: { "us-gaap": Object.fromEntries(Object.entries(tags).map(([name, values]) => [name, { units: { [unit]: values } }])) } };
}

describe("pickLatest", () => {
  it("chooses the most recent period across tags, not the first tag with data (NVDA case)", () => {
    const data = facts({
      RevenueFromContractWithCustomerExcludingAssessedTax: [{ form: "10-K", start: "2019-01-28", end: "2020-01-26", val: 10_918, filed: "2022-03-18" }],
      Revenues: [
        { form: "10-K", start: "2024-01-29", end: "2025-01-26", val: 130_497, filed: "2026-02-25" },
        { form: "10-K", start: "2025-01-27", end: "2026-01-25", val: 215_938, filed: "2026-02-25" },
      ],
    });
    const picked = pickLatest(data, ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues"], "duration");
    expect(picked?.fact.val).toBe(215_938);
    expect(picked?.name).toBe("Revenues");
  });

  it("ignores quarterly durations when an annual figure is required", () => {
    const data = facts({ Revenues: [{ form: "10-K", start: "2025-10-01", end: "2025-12-31", val: 50, filed: "2026-02-01" }, { form: "10-K", start: "2025-01-01", end: "2025-12-31", val: 200, filed: "2026-02-01" }] });
    expect(pickLatest(data, ["Revenues"], "duration")?.fact.val).toBe(200);
  });

  it("drops facts older than the notBefore date", () => {
    const data = facts({ InvestmentIncomeInterest: [{ form: "10-K", start: "2023-01-01", end: "2023-12-31", val: 1628, filed: "2024-02-28" }] });
    expect(pickLatest(data, ["InvestmentIncomeInterest"], "duration", { notBefore: "2024-11-26" })).toBeUndefined();
  });

  it("keeps the reporting currency of the fact", () => {
    const data = facts({ Assets: [{ form: "10-K", end: "2025-12-31", val: 10, filed: "2026-02-01" }] }, "CAD");
    expect(pickLatest(data, ["Assets"], "instant")?.unit).toBe("CAD");
  });
});

describe("pickDebt", () => {
  it("only adds a current portion reported at the same balance-sheet date (BDX case)", () => {
    const data = facts({
      LongTermDebtNoncurrent: [{ form: "10-K", end: "2025-09-30", val: 17_621, filed: "2025-11-25" }],
      LongTermDebtCurrent: [{ form: "10-K", end: "2015-09-30", val: 752, filed: "2015-11-25" }],
      DebtCurrent: [{ form: "10-K", end: "2025-09-30", val: 1_560, filed: "2025-11-25" }],
    });
    const debt = pickDebt(data, "https://sec.test", { notBefore: "2024-09-01" });
    expect(debt?.value).toBe(19_181);
    expect(debt?.source.field).toBe("LongTermDebtNoncurrent + DebtCurrent");
  });

  it("reads the latest 10-Q when quarterly forms are requested", () => {
    const data = facts({
      LongTermDebtNoncurrent: [
        { form: "10-K", end: "2025-09-30", val: 17_621, filed: "2025-11-25" },
        { form: "10-Q", end: "2026-06-30", val: 13_511, filed: "2026-08-06" },
      ],
      DebtCurrent: [{ form: "10-Q", end: "2026-06-30", val: 3_297, filed: "2026-08-06" }],
    });
    const debt = pickDebt(data, "https://sec.test", { forms: ["10-Q"], notBefore: "2026-01-01" });
    expect(debt?.value).toBe(16_808);
    expect(debt?.source.document).toBe("10-Q");
  });
});
