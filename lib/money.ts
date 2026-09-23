/** Formats a euro amount in the user's display currency (rate = EUR→currency). */
export function moneyFormatter(currency = "EUR", rate = 1, options: Intl.NumberFormatOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 }) {
  const format = new Intl.NumberFormat("fr-FR", { style: "currency", currency, ...options });
  return { format: (euros: number) => format.format(euros * rate) };
}
