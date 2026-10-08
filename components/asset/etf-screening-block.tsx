"use client";

import Link from "next/link";
import { CheckCircle2, CircleAlert, XCircle } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";

export type ETFScreeningDisplay = {
  ticker: string;
  name: string;
  etf_type: "islamic_certified" | "bond" | "conventional";
  verdict: "compliant" | "doubtful" | "non_compliant" | "bond_forbidden" | null;
  verdict_reason: string | null;
  compliant_weight: number;
  doubtful_weight: number;
  non_compliant_weight: number;
  unanalyzed_weight: number;
  purification_ratio: number;
  analyzed_holdings: number;
  total_holdings: number;
  top_non_compliant: Array<{ ticker: string | null; name: string; weight: number; status: string; reason: string }>;
  halal_alternative: string | null;
  halal_alternative_name: string | null;
  last_updated: string;
};

export function ETFScreeningBlock({ screening }: { screening: ETFScreeningDisplay | null }) {
  const { language, t } = useI18n();
  const locale = language === "en" ? "en-US" : "fr-FR";
  const percent = (value: number) => `${(value * 100).toLocaleString(locale, { maximumFractionDigits: 1 })} %`;

  if (!screening) {
    return (
      <section className="rounded-[2rem] border border-white/[0.05] bg-[#1a1c1a] p-6 sm:p-8">
        <h2 className="text-xl font-bold text-[rgba(255,255,255,0.6)]">{t("etfScreeningUnavailable")}</h2>
        <p className="mt-3 text-sm text-[rgba(255,255,255,0.6)]">{t("etfNotInDatabase")}</p>
      </section>
    );
  }

  const bond = screening.verdict === "bond_forbidden" || screening.etf_type === "bond";
  const compliant = screening.verdict === "compliant";
  const Icon = bond ? XCircle : compliant ? CheckCircle2 : CircleAlert;
  const title = bond
    ? t("etfNonCompliantBond")
    : screening.etf_type === "islamic_certified"
      ? t("etfIslamicCertified")
      : screening.verdict === "non_compliant"
        ? t("etfNonCompliantUpper")
        : screening.verdict === "doubtful"
          ? t("etfDoubtfulUpper")
          : t("etfToVerify");
  const color = bond || screening.verdict === "non_compliant" ? "text-halal-nonCompliant" : compliant ? "text-halal-compliant" : "text-halal-debated";

  return (
    <section className="rounded-[2rem] border border-white/[0.05] bg-[#1a1c1a] p-6 sm:p-8">
      <h2 className={`flex items-center gap-3 text-2xl font-bold ${color}`}>
        <Icon className="h-6 w-6" />
        {title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-[rgba(255,255,255,0.75)]">{screening.verdict_reason}</p>
      {screening.etf_type === "islamic_certified" ? (
        <p className="mt-5 text-sm font-semibold text-[#e6c364]">{t("etfPurificationNoneRequired")}</p>
      ) : bond ? (
        <p className="mt-5 text-sm font-semibold text-[#e6c364]">{t("etfBondsRiba")}</p>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <Metric label={t("compliant")} value={percent(screening.compliant_weight)} />
            <Metric label={t("doubtful")} value={percent(screening.doubtful_weight)} />
            <Metric label={t("statusNonCompliant")} value={percent(screening.non_compliant_weight)} />
            <Metric label={t("etfNonAnalyzed")} value={percent(screening.unanalyzed_weight)} />
          </div>
          <p className="mt-5 text-sm text-[rgba(255,255,255,0.7)]">
            {t("etfCompositionAnalyzed")} <strong>{screening.analyzed_holdings}</strong> / {screening.total_holdings} {t("etfPositions")} · {t("etfIndicativePurification")}{" "}
            <strong>{percent(screening.purification_ratio)}</strong> {t("etfOfDividends")}
          </p>
          {screening.top_non_compliant.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-semibold">{t("etfTopPositionsToReview")}</p>
              <ul className="mt-3 space-y-2 text-sm text-[rgba(255,255,255,0.75)]">
                {screening.top_non_compliant.map((holding) => (
                  <li key={`${holding.ticker}-${holding.name}`} className="flex justify-between gap-4">
                    <span>
                      {holding.name} <span className="text-xs text-[rgba(255,255,255,0.5)]">{holding.reason}</span>
                    </span>
                    <strong>{percent(holding.weight)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      {screening.halal_alternative && (
        <p className="mt-6 text-sm">
          {t("etfHalalAlternative")}{" "}
          <Link className="font-semibold text-[#e6c364] hover:underline" href={`/asset/${encodeURIComponent(screening.halal_alternative)}`}>
            {screening.halal_alternative_name ?? screening.halal_alternative}
          </Link>
        </p>
      )}
      <p className="mt-6 text-[10px] text-[rgba(255,255,255,0.5)]">
        {t("etfUpdatedOn").replace("{date}", new Date(screening.last_updated).toLocaleDateString(locale))}
      </p>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#111412] p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.6)]">{label}</p>
      <p className="mt-2 text-lg">{value}</p>
    </div>
  );
}
