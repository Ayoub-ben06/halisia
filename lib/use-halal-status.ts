"use client";

import { useEffect, useState } from "react";
import type { HalalStatus } from "@/lib/halal-status";

/**
 * AAOIFI status of the asset being added, fetched from /api/halal-status.
 * Funds explicitly named "Islamic" follow a Shariah-screened index and
 * crypto remains debated; `null` while loading or when nothing is selected.
 */
export function useHalalStatus(asset: { ticker: string; name: string; type?: string } | null): { status: HalalStatus | null; loading: boolean } {
  const [status, setStatus] = useState<HalalStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!asset) { setStatus(null); return; }
    const type = (asset.type ?? "").toUpperCase();
    if (/ISLAMIC|SHARIAH|SHARIA/i.test(asset.name)) { setStatus("compliant"); return; }
    if (type.includes("CRYPTO")) { setStatus("debated"); return; }
    if (type.includes("ETF")) { setStatus("unknown"); return; }
    const controller = new AbortController();
    setLoading(true);
    setStatus(null);
    fetch("/api/halal-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tickers: [asset.ticker] }), signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = (await response.json()) as Record<string, { status: HalalStatus }>;
        setStatus(data[asset.ticker.trim().toUpperCase()]?.status ?? "unknown");
      })
      .catch((error: unknown) => { if (!(error instanceof DOMException && error.name === "AbortError")) setStatus("unknown"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [asset?.ticker, asset?.name, asset?.type]);

  return { status, loading };
}
