"use client";

import Link from "next/link";
import { CheckCircle2, WalletCards } from "lucide-react";
import { ExpandableDescription } from "@/components/asset/expandable-description";
import { ETFScreeningBlock, type ETFScreeningDisplay } from "@/components/asset/etf-screening-block";
import { AssetAnalytics, type AssetAlert, type HistoryPoint, type SimilarAsset } from "@/components/asset/asset-analytics";
import { useI18n } from "@/components/providers/i18n-provider";
import type { ScreeningResult } from "@/lib/aaoifi/types";
import type { TranslationKey } from "@/lib/i18n";

type AssetPageViewProps = {
  ticker: string;
  name: string;
  initials: string;
  exchange: string;
  quoteType: string | undefined;
  currentPrice: number | null;
  dayChange: number | undefined;
  dayChangePercent: number | undefined;
  low: number | undefined;
  high: number | undefined;
  rangePosition: number;
  currency: string;
  quantity: number | null;
  averagePrice: number | null;
  currentValue: number | null;
  invested: number | null;
  gain: number | null;
  gainPercent: number | null;
  account: string | null;
  isCrypto: boolean;
  isETF: boolean;
  screening: ScreeningResult | null;
  screeningError: string;
  etfScreening: ETFScreeningDisplay | null;
  purificationRatio: number | null;
  purificationAmount: number | null;
  dividendsReceived: number | null;
  hasFortuneoHolding: boolean;
  history: HistoryPoint[];
  alerts: AssetAlert[];
  similar: SimilarAsset[];
  stats: {
    per: number | null;
    dividendYield: number | null;
    beta: number | null;
    averageVolume: number | null;
  };
  marketCap: number | undefined;
  sector: string | undefined;
  country: string | undefined;
  businessSummary: string | undefined;
};

function screeningStatusLabel(status: ScreeningResult["status"], t: (key: TranslationKey) => string) {
  if (status === "COMPLIANT") return t("statusCompliant").toUpperCase();
  if (status === "NON_COMPLIANT") return t("statusNonCompliant").toUpperCase();
  return t("statusDoubtful").toUpperCase();
}

export function AssetPageView(props: AssetPageViewProps) {
  const { language, t } = useI18n();
  const locale = language === "en" ? "en-US" : "fr-FR";
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: props.currency, maximumFractionDigits: 2 });
  const compact = (value?: number) => {
    if (typeof value !== "number") return "—";
    return new Intl.NumberFormat(locale, {
      notation: "compact",
      maximumFractionDigits: 1,
      style: "currency",
      currency: props.currency,
    }).format(value);
  };

  const typeLabel = (type?: string) => {
    if (type === "EQUITY") return t("assetTypeEquity");
    if (type === "ETF") return t("assetTypeEtf");
    if (type === "CRYPTOCURRENCY") return t("assetTypeCrypto");
    return type ? type : t("assetTypeAsset");
  };

  const positiveDay = (props.dayChange ?? 0) >= 0;

  const purificationText = (() => {
    if (props.purificationRatio == null) return null;
    const ratioFormatted = (props.purificationRatio * 100).toLocaleString(locale, { maximumFractionDigits: 2 });
    if (!props.hasFortuneoHolding) {
      return t("assetPurificationRatio").replace("{ratio}", ratioFormatted);
    }
    if (props.dividendsReceived === null) {
      return `${t("assetPurificationRatio").replace("{ratio}", ratioFormatted)} ${t("assetDividendsUnavailable")}`;
    }
    if (props.purificationAmount) {
      return t("assetPurificationDue").replace("{amount}", money.format(props.purificationAmount));
    }
    return t("assetNoPurificationRequired");
  })();

  return (
    <div className="min-h-screen bg-[#111412] text-[#ffffff]">
      <main className="mx-auto max-w-[1400px] p-4 sm:p-8">
        <Link href="/dashboard" className="text-xs text-[rgba(255,255,255,0.6)] hover:text-[#c9a84c]">
          {t("assetBackToDashboard")}
        </Link>

        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <section className="flex items-center gap-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#4d4637]/25 bg-[#1a1c1a] text-lg font-bold text-[#e6c364]">{props.initials}</div>
              <div>
                <h1 className="text-3xl font-bold sm:text-4xl">{props.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[rgba(255,255,255,0.6)]">
                  <span>{props.ticker}</span>
                  <span>•</span>
                  <span>{props.exchange}</span>
                  <span>•</span>
                  <span className="rounded-full border border-[#4d4637]/30 px-2 py-0.5 text-[10px]">{typeLabel(props.quoteType)}</span>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/[0.05] bg-[#1a1c1a] p-6 sm:p-8">
              <div className="flex flex-wrap items-baseline gap-4">
                <p className="text-4xl font-bold">{typeof props.currentPrice === "number" ? money.format(props.currentPrice) : "—"}</p>
                <p className={`font-bold ${positiveDay ? "text-[#e6c364]" : "text-red-500"}`}>
                  {typeof props.dayChange === "number" ? `${props.dayChange >= 0 ? "+" : ""}${money.format(props.dayChange)}` : "—"}{" "}
                  {typeof props.dayChangePercent === "number" ? `(${props.dayChangePercent >= 0 ? "+" : ""}${props.dayChangePercent.toFixed(2)} %)` : ""}
                </p>
              </div>
              <div className="mt-6 border-t border-dotted border-[#c9a84c]/25 pt-5">
                <div className="relative h-1 rounded-full bg-[#333533]">
                  <span className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#c9a84c]" style={{ left: `${props.rangePosition}%` }} />
                </div>
                <div className="mt-4 flex justify-between text-xs text-[rgba(255,255,255,0.6)]">
                  <span>
                    {t("asset52WeekLow")} {typeof props.low === "number" ? money.format(props.low) : "—"}
                  </span>
                  <span>
                    {t("asset52WeekHigh")} {typeof props.high === "number" ? money.format(props.high) : "—"}
                  </span>
                </div>
              </div>
            </section>

            {!props.isCrypto && !props.isETF && (
              <section
                className={`rounded-[2rem] border p-6 sm:p-8 ${props.screening?.status === "COMPLIANT" ? "border-halal-compliant/30 bg-gradient-to-r from-halal-compliant/10 to-[#1a1c1a]" : "border-white/[0.05] bg-[#1a1c1a]"}`}
              >
                {props.screening ? (
                  <>
                    <h2
                      className={`flex items-center gap-3 text-2xl font-bold ${props.screening.status === "COMPLIANT" ? "text-halal-compliant" : props.screening.status === "NON_COMPLIANT" ? "text-halal-nonCompliant" : "text-halal-debated"}`}
                    >
                      <CheckCircle2 className="h-6 w-6" />
                      {screeningStatusLabel(props.screening.status, t)}
                    </h2>
                    <p className="mt-2 text-xs text-[rgba(255,255,255,0.6)]">
                      {props.screening.methodology} · {props.screening.fiscalPeriod}
                    </p>
                    {(props.screening.reason || props.screening.note) && (
                      <div className="mt-5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-xs leading-5">
                        {props.screening.reason && <p className="text-[#ffffff]">{props.screening.reason}</p>}
                        {props.screening.note && <p className="mt-1 text-[rgba(255,255,255,0.6)]">{props.screening.note}</p>}
                      </div>
                    )}
                    {purificationText && (
                      <p className="mt-5 text-sm font-semibold text-[#e6c364]">
                        {purificationText}
                        {props.hasFortuneoHolding && props.dividendsReceived && props.purificationRatio != null ? (
                          <span className="ml-2 text-[10px] font-normal text-[rgba(255,255,255,0.6)]">
                            {t("assetPurificationOfDividends")
                              .replace("{ratio}", (props.purificationRatio * 100).toFixed(2))
                              .replace("{amount}", money.format(props.dividendsReceived))}
                          </span>
                        ) : null}
                      </p>
                    )}
                    <p className="mt-7 text-sm leading-6 text-[#ffffff]">{props.screening.business.explanation}</p>
                    <div className="mt-7 grid gap-4 sm:grid-cols-2">
                      {props.screening.criteria.map((criterion) => (
                        <Metric
                          key={criterion.key}
                          label={criterion.label}
                          value={criterion.ratio !== undefined ? `${(criterion.ratio * 100).toFixed(2)} %` : criterion.status}
                          hint={
                            criterion.threshold !== undefined
                              ? t("assetScreeningLimit")
                                  .replace("{operator}", criterion.operator ?? "")
                                  .replace("{threshold}", `${(criterion.threshold * 100).toFixed(0)} %`)
                              : t("assetScreeningConfidence").replace("{confidence}", criterion.confidence ?? "")
                          }
                        />
                      ))}
                    </div>
                    <Link href={`/screening?app=1&symbol=${encodeURIComponent(props.screening.ticker)}`} className="mt-6 inline-block text-xs font-bold text-[#e6c364] hover:underline">
                      {t("assetViewFullScreening")}
                    </Link>
                    <p className="mt-5 text-[10px] leading-4 text-[rgba(255,255,255,0.6)]">{t("screeningDisclaimer")}</p>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-[rgba(255,255,255,0.6)]">{t("assetAaoifiUnavailable")}</h2>
                    <p className="mt-3 text-sm text-[rgba(255,255,255,0.6)]">{t("assetAaoifiUnavailableDesc")}</p>
                    {props.screeningError && <p className="mt-3 break-words text-xs text-red-400">{t("assetTechnicalDetail")} {props.screeningError}</p>}
                  </>
                )}
              </section>
            )}
            {props.isETF && <ETFScreeningBlock screening={props.etfScreening} />}
            {props.isCrypto && (
              <section className="rounded-[2rem] border border-[#c9a84c]/25 bg-[#1a1c1a] p-6 sm:p-8">
                <h2 className="flex items-center gap-3 text-2xl font-bold text-[#e6c364]">
                  <CheckCircle2 className="h-6 w-6" />
                  {t("assetDigitalAsset")}
                </h2>
                <p className="mt-3 text-sm leading-6 text-[rgba(255,255,255,0.75)]">{t("assetDigitalAssetDesc")}</p>
              </section>
            )}

            <AssetAnalytics
              ticker={props.ticker}
              name={props.name}
              currency={props.currency}
              initialHistory={props.history}
              currentPrice={typeof props.currentPrice === "number" ? props.currentPrice : null}
              alerts={props.alerts}
              similar={props.similar}
              stats={props.stats}
            />

            {props.businessSummary && (
              <section className="rounded-[2rem] border border-white/[0.05] bg-[#1a1c1a] p-6 sm:p-8">
                <h2 className="text-xl font-medium">{t("assetAbout")}</h2>
                <div className="mt-5">
                  <ExpandableDescription text={props.businessSummary} />
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-6 lg:col-span-4">
            <section className="rounded-[2rem] border border-white/[0.05] bg-[#1a1c1a] p-6 sm:p-8">
              <h2 className="flex items-center gap-2 text-lg font-medium">
                <WalletCards className="h-5 w-5 text-[#c9a84c]" />
                {t("assetInPortfolio")}
              </h2>
              {props.quantity !== null ? (
                <div className="mt-7 divide-y divide-white/[0.05] text-sm">
                  <PortfolioDatum label={t("quantity")} value={props.quantity.toLocaleString(locale, { maximumFractionDigits: 8 })} />
                  <PortfolioDatum label={t("portfolioAveragePrice")} value={props.averagePrice !== null ? money.format(props.averagePrice) : "—"} />
                  <PortfolioDatum label={t("currentValue")} value={props.currentValue !== null ? money.format(props.currentValue) : "—"} />
                  <PortfolioDatum
                    label={t("assetGain")}
                    value={
                      props.gain !== null
                        ? `${props.gain >= 0 ? "+" : ""}${money.format(props.gain)} ${props.gainPercent !== null ? `(${props.gainPercent >= 0 ? "+" : ""}${props.gainPercent.toFixed(1)} %)` : ""}`
                        : "—"
                    }
                    accent={props.gain !== null ? props.gain >= 0 : undefined}
                  />
                  <PortfolioDatum label={t("portfolioAccount")} value={props.account ?? "—"} badge />
                </div>
              ) : (
                <p className="mt-7 text-sm text-[rgba(255,255,255,0.6)]">{t("assetNotInPortfolio")}</p>
              )}
              <Link href="/portfolio" className="mt-7 block rounded-xl border border-[#c9a84c] px-4 py-3 text-center text-xs font-bold text-[#e6c364] hover:bg-[#c9a84c]/10">
                {t("assetViewPortfolio")}
              </Link>
            </section>

            <section className="rounded-[2rem] border border-white/[0.05] bg-[#1a1c1a] p-6 sm:p-8">
              <h2 className="text-lg font-medium">{t("assetKeyInfo")}</h2>
              <div className="mt-7 grid grid-cols-2 gap-x-6 gap-y-7">
                <KeyInfo label={t("assetMarketCap")} value={compact(props.marketCap)} />
                <KeyInfo label={t("assetSector")} value={props.sector ?? "—"} />
                <KeyInfo label={t("assetCountry")} value={props.country ?? "—"} />
                <KeyInfo label={t("assetCurrency")} value={props.currency} />
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl bg-[#111412] p-5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.6)]">{label}</p>
      <p className="mt-2 text-lg">{value}</p>
      <p className="mt-1 text-[10px] text-[rgba(255,255,255,0.6)]">{hint}</p>
    </div>
  );
}

function PortfolioDatum({ label, value, accent, badge }: { label: string; value: string; accent?: boolean; badge?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-5">
      <span className="text-xs text-[rgba(255,255,255,0.6)]">{label}</span>
      <span
        className={`${accent === true ? "font-bold text-[#e6c364]" : accent === false ? "font-bold text-red-500" : ""} ${badge ? "rounded bg-[#111412] px-3 py-1 text-[10px]" : "text-right"}`}
      >
        {value}
      </span>
    </div>
  );
}

function KeyInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.6)]">{label}</p>
      <p className="mt-2 text-sm">{value}</p>
    </div>
  );
}
