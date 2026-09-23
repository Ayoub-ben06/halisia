// Only dividends are purified, never capital gains.
export function calculatePurification(impureRevenueRatio: number, dividendsReceived: number): number {
  return dividendsReceived * impureRevenueRatio;
}

export function formatPurificationRatio(ratio: number): string {
  return `${(ratio * 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} % des dividendes à purifier`;
}
