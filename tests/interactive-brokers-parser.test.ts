import { describe, expect, it } from "vitest";
import {
  normalizeIBTicker,
  parseIBStatement,
} from "@/lib/import/interactive-brokers-parser";

const SAMPLE = `Statement,Header,Field Name,Field Value
Statement,Data,BrokerName,Interactive Brokers
Trades,Header,DataDiscriminator,Asset Category,Currency,Symbol,Date/Time,Quantity,T. Price,C. Price,Proceeds,Comm/Fee,Basis,Realized P/L,MTM P/L,Code
Trades,Data,Order,Stocks,EUR,AAPL,2024-01-15 10:30:00,5,165.00,178.50,825.00,-2.50,827.50,0,68.50,O
Trades,Data,Order,Stocks,EUR,MSFT,2024-03-20 14:15:00,3,380.00,415.20,1140.00,-3.00,1143.00,0,105.60,O
Open Positions,Header,DataDiscriminator,Asset Category,Currency,Symbol,Quantity,Mult,Cost Price,Cost Basis,Close Price,Value,Unrealized P/L,Code
Open Positions,Data,Summary,Stocks,EUR,AAPL,5,1,165.00,825.00,178.50,892.50,67.50,
Open Positions,Data,Summary,Stocks,EUR,MSFT,3,1,380.00,1140.00,415.20,1245.60,105.60,
Open Positions,Data,Summary,Stocks,USD,BRK B,2,1,350.00,700.00,400.00,800.00,100.00,
Open Positions,Data,Summary,Equity and Index Options,USD,AAPL 15DEC23 150 C,-1,100,2.50,-250.00,1.00,-100.00,150.00,
Open Positions,Data,Summary,Stocks,USD,SHORT, -10,1,20.00,-200.00,18.00,-180.00,20.00,
`;

describe("normalizeIBTicker", () => {
  it("maps IB share-class spacing to Yahoo style", () => {
    expect(normalizeIBTicker("BRK B")).toBe("BRK-B");
    expect(normalizeIBTicker("BRK.B")).toBe("BRK-B");
  });
});

describe("parseIBStatement", () => {
  it("reads Open Positions and skips options/shorts", () => {
    const holdings = parseIBStatement(SAMPLE);
    expect(holdings.map((h) => h.ticker).sort()).toEqual(["AAPL", "BRK-B", "MSFT"]);
    expect(holdings.find((h) => h.ticker === "AAPL")).toMatchObject({
      quantity: 5,
      average_buy_price: 165,
      current_price: 178.5,
      currency: "EUR",
      type: "action",
    });
  });

  it("falls back to Trades when Open Positions is missing", () => {
    const tradesOnly = SAMPLE.split("\n")
      .filter((line) => !line.startsWith("Open Positions"))
      .join("\n");
    const holdings = parseIBStatement(tradesOnly);
    expect(holdings).toHaveLength(2);
    expect(holdings.find((h) => h.ticker === "AAPL")?.quantity).toBe(5);
  });

  it("detects semicolon separators", () => {
    const semi = SAMPLE.replace(/,/g, ";");
    const holdings = parseIBStatement(semi);
    expect(holdings.length).toBeGreaterThanOrEqual(2);
  });
});
