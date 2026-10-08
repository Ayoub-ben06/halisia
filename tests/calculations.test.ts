import { describe, expect, it } from "vitest";
import { calculatePurification } from "@/lib/aaoifi/purification";
import { getFxRate, normalizeCurrency } from "@/lib/aaoifi/fx";
import { getDoubtfulActivityReason, isForbiddenSector } from "@/lib/aaoifi/rules";
import { realizedGains } from "@/lib/transactions";
import { formatQuoteAmount, moneyFormatter } from "@/lib/money";
import { safeNextPath } from "@/lib/safe-redirect";
import { rateLimit } from "@/lib/rate-limit";

const normalizeSpaces = (text: string) => text.replace(/\s/g, " ");

describe("purification", () => {
  it("purifies dividends only, proportionally to impure revenue", () => {
    expect(calculatePurification(0.012, 250)).toBeCloseTo(3);
    expect(calculatePurification(0.012, 0)).toBe(0);
  });
});

describe("realizedGains", () => {
  it("uses the weighted average cost of earlier buys", () => {
    const gains = realizedGains([
      { ticker: "AAPL", side: "buy", quantity: 10, price: 100, amount: 1000 },
      { ticker: "AAPL", side: "buy", quantity: 10, price: 200, amount: 2000 },
      { ticker: "AAPL", side: "sell", quantity: 5, price: 180, amount: 900 },
    ]);
    expect(gains[2].gain).toBeCloseTo(150);
    expect(gains[2].gainPercent).toBeCloseTo(20);
  });

  it("returns no gain for a sale without known cost and keeps assets separate", () => {
    const gains = realizedGains([
      { ticker: "AAPL", side: "buy", quantity: 1, price: 100, amount: 100 },
      { ticker: "MSFT", side: "sell", quantity: 1, price: 300, amount: 300 },
    ]);
    expect(gains[1].gain).toBeUndefined();
  });

  it("includes fees in the cost basis", () => {
    const gains = realizedGains([
      { ticker: "BTC", side: "buy", quantity: 1, price: 100, amount: 100, fee: 10 },
      { ticker: "BTC", side: "sell", quantity: 1, price: 120, amount: 120 },
    ]);
    expect(gains[1].gain).toBeCloseTo(10);
  });
});

describe("currencies", () => {
  it("treats pence as a hundredth of a pound", () => {
    expect(normalizeCurrency("GBp")).toEqual({ code: "GBP", factor: 0.01 });
    expect(normalizeCurrency("usd")).toEqual({ code: "USD", factor: 1 });
  });

  it("converts minor units without a network call", async () => {
    await expect(getFxRate("GBp", "GBP")).resolves.toBeCloseTo(0.01);
    await expect(getFxRate("EUR", "EUR")).resolves.toBe(1);
  });

  it("formats quotes in their own currency, including London pence", () => {
    expect(normalizeSpaces(formatQuoteAmount(12430, "GBp"))).toBe("124,30 £GB");
    expect(normalizeSpaces(formatQuoteAmount(337.02, "USD"))).toBe("337,02 $US");
  });

  it("converts euro amounts into the display currency", () => {
    expect(normalizeSpaces(moneyFormatter("USD", 1.1).format(100))).toBe("110,00 $US");
  });
});

describe("activity rules", () => {
  it("recognises forbidden SEC activity labels", () => {
    expect(isForbiddenSector(undefined, "Security Brokers, Dealers & Flotation Companies")).toBe(true);
    expect(isForbiddenSector(undefined, "Hospital & Medical Service Plans")).toBe(true);
    expect(isForbiddenSector(undefined, "Radio & Tv Broadcasting & Communications Equipment")).toBe(false);
    expect(isForbiddenSector(undefined, "Semiconductors & Related Devices")).toBe(false);
  });

  it("flags activities with unquantifiable impermissible revenue as doubtful", () => {
    expect(getDoubtfulActivityReason("Hotels & Motels")).toBeTruthy();
    expect(getDoubtfulActivityReason("Pharmaceutical Preparations")).toBeUndefined();
  });
});

describe("safeNextPath", () => {
  it("only allows relative paths on this site", () => {
    expect(safeNextPath("/portfolio?x=1")).toBe("/portfolio?x=1");
    expect(safeNextPath("https://evil.example")).toBe("/dashboard");
    expect(safeNextPath("//evil.example")).toBe("/dashboard");
    expect(safeNextPath("/\\evil.example")).toBe("/dashboard");
    expect(safeNextPath(undefined, "/login")).toBe("/login");
  });
});

describe("rateLimit", () => {
  it("blocks after the limit and reports when to retry", () => {
    const key = `test-${Math.random()}`;
    expect(rateLimit(key, 2, 60_000).allowed).toBe(true);
    expect(rateLimit(key, 2, 60_000).allowed).toBe(true);
    const blocked = rateLimit(key, 2, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
});
