"use client";

import { AlertTriangle, Droplets, Info } from "lucide-react";
import type { PurificationRow } from "@/lib/portfolio-purification";
import { useI18n } from "@/components/providers/i18n-provider";

function money(value: number, currency: string, language: "fr" | "en") {
  return new Intl.NumberFormat(language === "en" ? "en-US" : "fr-FR", { style: "currency", currency }).format(value);
}

function statusLabel(status: PurificationRow["status"], t: (key: "statusCompliant" | "statusNonCompliant" | "statusDoubtful" | "notAnalyzed") => string) {
  if (status === "compliant") return t("statusCompliant");
  if (status === "non_compliant") return t("statusNonCompliant");
  if (status === "debated") return t("statusDoubtful");
  return t("notAnalyzed");
}

export function PurificationView({
  rows,
  totalDividends,
  totalAmount,
  unavailableCount,
  currency,
  displayRate,
}: {
  rows: PurificationRow[];
  totalDividends: number;
  totalAmount: number;
  unavailableCount: number;
  currency: string;
  displayRate: number;
}) {
  const { t, language } = useI18n();
  const converted = (value: number) => value * displayRate;
  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 px-6 py-8 lg:px-10">
      <div>
        <p className="text-sm font-semibold text-primary">{t("financialObligations")}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{t("purificationTitle")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {t("purificationDescription")}
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-primary/25 bg-primary/10 p-6">
          <div className="flex items-center gap-2 text-sm text-primary"><Droplets className="h-4 w-4" /> {t("purificationTotal")}</div>
          <p className="mt-3 text-3xl font-bold">{money(converted(totalAmount), currency, language)}</p>
          <p className="mt-2 text-xs text-muted-foreground">{t("dividendsTimesImpure")}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">{t("estimatedDividends")}</p>
          <p className="mt-3 text-3xl font-bold">{money(converted(totalDividends), currency, language)}</p>
          <p className="mt-2 text-xs text-muted-foreground">{t("sincePurchase")}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">{t("dataToCheck")}</p>
          <p className="mt-3 text-3xl font-bold">{unavailableCount}</p>
          <p className="mt-2 text-xs text-muted-foreground">{t("dividendHistoryUnavailable")}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-6 py-5">
          <h2 className="font-semibold">{t("detailByAsset")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("stocksAndDividendsOnly")}</p>
        </div>
        {rows.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">{t("noStocksInPortfolio")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">{t("portfolioAsset")}</th><th className="px-6 py-4">{t("halalStatus")}</th>
                  <th className="px-6 py-4">{t("ratio")}</th><th className="px-6 py-4">{t("dividends")}</th><th className="px-6 py-4">{t("purificationColumn")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-6 py-4"><p className="font-semibold">{row.name}</p><p className="text-xs text-muted-foreground">{row.ticker ?? t("tickerUnavailable")}</p></td>
                    <td className="px-6 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.status === "compliant" ? "bg-emerald-500/15 text-emerald-400" : row.status === "non_compliant" ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"}`}>{statusLabel(row.status, t)}</span></td>
                    <td className="px-6 py-4">{row.ratio == null ? "—" : `${(row.ratio * 100).toLocaleString(language === "en" ? "en-US" : "fr-FR", { maximumFractionDigits: 2 })} %`}</td>
                    <td className="px-6 py-4">{row.dividends == null ? <span className="text-muted-foreground">{t("unavailablePlural")}</span> : money(converted(row.dividends), currency, language)}</td>
                    <td className="px-6 py-4 font-semibold">{row.amount == null ? "—" : money(converted(row.amount), currency, language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="flex gap-3 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
        {unavailableCount > 0 ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /> : <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
        <p>{t("purificationDisclaimer")}</p>
      </div>
    </main>
  );
}
