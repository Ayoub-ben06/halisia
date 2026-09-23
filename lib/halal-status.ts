import { halalMock } from "@/lib/halal-mock";

export type HalalStatus = "compliant" | "non_compliant" | "debated" | "unknown";

export function resolveHalalStatus(ticker: string, name: string): HalalStatus {
  const mock = halalMock[ticker] ?? halalMock[ticker.split(".")[0]];
  if (mock) return mock.status;
  if (/ISLAMIC/i.test(name)) return "compliant";
  return "unknown";
}

export function halalStatusLabel(status: HalalStatus): string {
  if (status === "compliant") return "CONFORME";
  if (status === "debated" || status === "unknown") return "DOUTEUX";
  return "NON CONFORME";
}

export function halalStatusBadgeClass(status: HalalStatus): string {
  if (status === "compliant") return "bg-halal-compliant/10 text-halal-compliant";
  if (status === "debated" || status === "unknown") return "bg-halal-debated/10 text-halal-debated";
  return "bg-halal-nonCompliant/10 text-halal-nonCompliant";
}

export function halalStatusTextClass(status: HalalStatus): string {
  if (status === "compliant") return "text-halal-compliant";
  if (status === "debated" || status === "unknown") return "text-halal-debated";
  return "text-halal-nonCompliant";
}

export function isWatchlistCompliant(status: HalalStatus): boolean {
  return status === "compliant";
}

export function isWatchlistToMonitor(status: HalalStatus): boolean {
  return status === "debated" || status === "non_compliant" || status === "unknown";
}
