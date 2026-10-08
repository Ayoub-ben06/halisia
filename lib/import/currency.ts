const FALLBACK_EUR_USD = 1.09;

/** Returns how many USD equal 1 EUR (USD per EUR). */
export async function fetchEurUsdRate(): Promise<number> {
  try {
    const response = await fetch("https://api.exchangerate-api.com/v4/latest/EUR");
    if (!response.ok) throw new Error(`FX HTTP ${response.status}`);
    const data = (await response.json()) as { rates?: { USD?: number } };
    const rate = data.rates?.USD;
    if (typeof rate === "number" && rate > 0) return rate;
  } catch {
    // Fallback keeps the confirmation UI usable if the FX API is down.
  }
  return FALLBACK_EUR_USD;
}

/** Convert an amount quoted in `currency` into EUR using USD-per-EUR rate. */
export function toEur(amount: number, currency: string, eurUsdRate: number): number {
  const code = currency.trim().toUpperCase();
  if (!Number.isFinite(amount)) return 0;
  if (code === "EUR" || !code) return amount;
  if (code === "USD") return amount / eurUsdRate;
  return amount;
}

export function formatPriceWithFx(
  amount: number,
  currency: string,
  eurAmount: number,
  locale = "fr-FR",
): string {
  const code = currency.trim().toUpperCase() || "EUR";
  if (code === "EUR") {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(amount);
  }

  const original = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code === "USD" ? "USD" : "EUR",
    minimumFractionDigits: 2,
  }).format(amount);

  const eur = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(eurAmount);

  return `${original} (≈ ${eur})`;
}
