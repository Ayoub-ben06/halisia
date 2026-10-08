import type { HalalStatus } from "@/lib/halal-status";
import { findETF } from "./etf-list";

type ETFAsset = { ticker?: string | null; name?: string | null };
export type ETFScreeningStatusRow = { ticker: string; verdict: "compliant" | "doubtful" | "non_compliant" | "bond_forbidden" | null };

export function etfTickerForAsset(asset: ETFAsset) {
  const raw = asset.ticker?.trim().toUpperCase() || asset.name?.match(/\(([A-Z0-9.-]+)\)\s*$/)?.[1]?.toUpperCase() || null;
  if (!raw) return null;
  return findETF(raw)?.ticker ?? raw.split(/[.=-]/)[0];
}

export function etfHalalStatus(asset: ETFAsset, rows: ETFScreeningStatusRow[]): HalalStatus {
  const ticker = etfTickerForAsset(asset);
  const screening = ticker ? rows.find((row) => row.ticker.toUpperCase() === ticker.toUpperCase()) : undefined;
  if (screening?.verdict === "compliant") return "compliant";
  if (screening?.verdict === "non_compliant" || screening?.verdict === "bond_forbidden") return "non_compliant";
  if (screening?.verdict === "doubtful") return "debated";
  return /ISLAMIC|SHARIAH|SHARIA/i.test(asset.name ?? "") ? "compliant" : "unknown";
}
