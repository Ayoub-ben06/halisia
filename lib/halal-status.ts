export type HalalStatus = "compliant" | "non_compliant" | "debated" | "unknown";

export function halalStatusLabel(status: HalalStatus): string {
  if (status === "compliant") return "CONFORME";
  if (status === "debated") return "DOUTEUX";
  if (status === "unknown") return "NON ANALYSÉ";
  return "NON CONFORME";
}

export function halalStatusBadgeClass(status: HalalStatus): string {
  if (status === "compliant") return "bg-halal-compliant/10 text-halal-compliant";
  if (status === "debated") return "bg-halal-debated/10 text-halal-debated";
  if (status === "unknown") return "bg-white/5 text-[rgba(255,255,255,0.6)]";
  return "bg-halal-nonCompliant/10 text-halal-nonCompliant";
}

export function halalStatusTextClass(status: HalalStatus): string {
  if (status === "compliant") return "text-halal-compliant";
  if (status === "debated") return "text-halal-debated";
  if (status === "unknown") return "text-[rgba(255,255,255,0.6)]";
  return "text-halal-nonCompliant";
}

export function isWatchlistCompliant(status: HalalStatus): boolean {
  return status === "compliant";
}

export function isWatchlistToMonitor(status: HalalStatus): boolean {
  return status === "debated" || status === "non_compliant" || status === "unknown";
}
