/** Formats a euro amount in the user's display currency (rate = EUR→currency). */
export function moneyFormatter(currency = "EUR", rate = 1, options: Intl.NumberFormatOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 }) {
  const format = new Intl.NumberFormat("fr-FR", { style: "currency", currency, ...options });
  return { format: (euros: number) => format.format(euros * rate) };
}

/**
 * Formats an amount in the currency it is quoted in. London (GBp), Johannesburg
 * (ZAc) and Tel Aviv (ILA) quote in minor units, which Intl does not know.
 */
export function formatQuoteAmount(value: number, currency: string | null | undefined): string {
  const minor: Record<string, string> = { GBp: "GBP", GBX: "GBP", ZAc: "ZAR", ILA: "ILS" };
  const code = currency ? minor[currency] ?? currency : "EUR";
  const amount = currency && minor[currency] ? value / 100 : value;
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: code, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${code}`;
  }
}

/** Symbol shown next to a price input for the given quote currency. */
export function currencySymbol(currency: string | null | undefined): string {
  if (!currency || currency === "EUR") return "€";
  if (currency === "GBp" || currency === "GBX") return "p";
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency, currencyDisplay: "narrowSymbol" }).formatToParts(0).find((part) => part.type === "currency")?.value ?? currency;
  } catch {
    return currency;
  }
}
