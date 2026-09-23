// Yahoo Finance industry names.
const FORBIDDEN_INDUSTRIES = [
  "banks—diversified", "banks—regional", "banking", "bank", "financial services",
  "insurance—diversified", "insurance—life", "insurance—property & casualty", "insurance—specialty", "insurance—reinsurance", "insurance brokers",
  "capital markets", "financial data & stock exchanges", "asset management", "credit services", "mortgage finance", "consumer finance", "shell companies",
  "beverages—wineries & distilleries", "beverages—brewers", "alcoholic beverages", "alcohol", "tobacco",
  "gambling", "casinos & gaming", "resorts & casinos", "adult entertainment",
];
// SEC SIC descriptions (sicDescription), used for US filers.
const FORBIDDEN_SIC_ACTIVITIES = [
  // Conventional finance and insurance
  "insurance", "medical service plans", "finance services", "security brokers", "commodity brokers", "investment advice",
  "savings institution", "credit institution", "business credit", "mortgage bankers", "loan brokers", "finance lessors",
  // Tobacco, alcohol
  "cigarettes", "malt beverages", "wines, brandy", "distilled",
  // Weapons
  "guided missiles", "search, detection, navigation", "ordnance", "small arms",
  // Entertainment whose main revenue (films, series, music) is considered impermissible
  "video tape rental", "cable & other pay television", "motion picture", "television broadcasting", "amusement & recreation",
];
// Activities with impermissible revenue streams (alcohol, pork…) that cannot be
// quantified without segment data: the verdict is DOUBTFUL, not NON_COMPLIANT.
const DOUBTFUL_ACTIVITIES: Record<string, string> = {
  "hotels & motels": "Hôtellerie : revenus d'alcool et de divertissement non quantifiables sans données par segment",
  "retail-variety stores": "Grande distribution : ventes d'alcool, de porc et services financiers non quantifiables sans données par segment",
  "water transportation": "Croisières : revenus d'alcool, de casino et de divertissement non quantifiables sans données par segment",
  "radio broadcasting": "Diffusion audio : part des revenus issue de la musique non quantifiable sans données par segment",
};
const FORBIDDEN_SECTORS = ["financial services"];

export function baseTicker(ticker: string) { return ticker.toUpperCase().replace(/\.(PA|AS|BR|CO|L|DE|MI|SW)$/, ""); }
export function isForbiddenSector(sector?: string, industry?: string) {
  const s = (sector ?? "").toLowerCase();
  const i = (industry ?? "").toLowerCase();
  return FORBIDDEN_INDUSTRIES.some((item) => i.includes(item)) || FORBIDDEN_SIC_ACTIVITIES.some((item) => i.includes(item)) || FORBIDDEN_SECTORS.some((item) => s.includes(item));
}
export function getDoubtfulActivityReason(industry?: string): string | undefined {
  const i = (industry ?? "").toLowerCase();
  return Object.entries(DOUBTFUL_ACTIVITIES).find(([activity]) => i.includes(activity))?.[1];
}
export function getNonCompliantReason(ticker: string, sector?: string, industry?: string) {
  return `Secteur ou industrie interdit(e) : ${industry ?? sector ?? "non documenté"}.`;
}
