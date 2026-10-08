export type LedgerRow = { ticker: string; side: "buy" | "sell"; quantity: number; price: number; amount: number; fee?: number };
export type RealizedGain = { gain?: number; gainPercent?: number };

/**
 * Realized gain of each sale with the weighted average cost of the earlier
 * buys of the same asset. Rows must be in chronological order; buys and sales
 * without a known cost return no gain.
 */
export function realizedGains(rows: LedgerRow[]): RealizedGain[] {
  const book = new Map<string, { quantity: number; cost: number }>();
  return rows.map((row) => {
    const position = book.get(row.ticker) ?? { quantity: 0, cost: 0 };
    book.set(row.ticker, position);
    if (row.side === "buy") {
      position.quantity += row.quantity;
      position.cost += row.amount + (row.fee ?? 0);
      return {};
    }
    if (position.quantity <= 0) return {};
    const averageCost = position.cost / position.quantity;
    const soldQuantity = Math.min(row.quantity, position.quantity);
    position.quantity -= soldQuantity;
    position.cost -= averageCost * soldQuantity;
    return {
      gain: (row.price - averageCost) * soldQuantity,
      gainPercent: averageCost ? ((row.price - averageCost) / averageCost) * 100 : undefined,
    };
  });
}
