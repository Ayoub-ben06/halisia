"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  BarChart3,
  ChevronRight,
  Coins,
  Gem,
  Landmark,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { PortfolioToolbar } from "@/components/dashboard/portfolio-toolbar";
import {
  DashboardAlerts,
  type DashboardActiveAlert,
} from "@/components/dashboard/dashboard-alerts";
import type { AppNotification } from "@/lib/notifications";
import type { HalalStatus } from "@/lib/halal-status";
import { useI18n } from "@/components/providers/i18n-provider";
import type { TranslationKey } from "@/lib/i18n";
import { moneyFormatter } from "@/lib/money";

export type DashboardPortfolioRow = {
  ticker: string;
  detailTicker: string | null;
  name: string;
  meta: string;
  value: number;
  performance: number;
  status: HalalStatus;
};

export type DashboardMarketRow = {
  ticker: string;
  name: string;
  price: number | null;
  changePercent: number | null;
  currency: string | null;
};

type BreakdownItem = { key: TranslationKey; value: number; color: string };

export function DashboardContent({
  totalValue,
  totalInvested,
  performance,
  zakatEstimate,
  zakatableValue,
  nisabReached,
  complianceScore,
  breakdown,
  rows,
  notifications,
  activeAlerts,
  markets,
  displayCurrency = "EUR",
  displayRate = 1,
}: {
  totalValue: number;
  totalInvested: number;
  performance: number;
  zakatEstimate: number;
  zakatableValue: number;
  nisabReached: boolean;
  complianceScore: number;
  breakdown: BreakdownItem[];
  rows: DashboardPortfolioRow[];
  notifications: AppNotification[];
  activeAlerts: DashboardActiveAlert[];
  markets: DashboardMarketRow[];
  displayCurrency?: string;
  displayRate?: number;
}) {
  const { t, language } = useI18n();
  const locale = language === "en" ? "en-US" : "fr-FR";
  const formatMoney = useMemo(() => {
    const money = moneyFormatter(displayCurrency, displayRate);
    return (value: number) => money.format(value);
  }, [displayCurrency, displayRate]);
  const formatPct = useMemo(() => {
    const pct = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    return (value: number) => pct.format(value);
  }, [locale]);
  const perfPrefix = performance >= 0 ? "+" : "";
  const totalShare = breakdown.reduce((sum, item) => sum + item.value, 0);

  return (
    <main className="mx-auto max-w-[1400px] space-y-8 p-4 sm:p-8">
      <section className="grid gap-6 lg:grid-cols-3">
        <Kpi
          title={t("totalValue")}
          value={formatMoney(totalValue)}
          icon={Landmark}
          footer={t("performanceSincePurchase").replace("{pct}", `${perfPrefix}${formatPct(performance)}`)}
          positive={performance >= 0}
        />
        <Kpi
          title={t("totalPerformance")}
          value={`${perfPrefix}${formatPct(performance)} %`}
          icon={TrendingUp}
          footer={t("investedAmount").replace("{amount}", formatMoney(totalInvested))}
          positive={performance >= 0}
        />
        <Kpi
          title={t("estimatedZakat")}
          value={formatMoney(zakatEstimate)}
          icon={Coins}
          gold
          footer={
            nisabReached
              ? t("nisabReachedEligible")
              : t("nisabNotReachedDetail")
          }
        />
      </section>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-8">
          <section className="rounded-[2rem] border border-white/[0.05] bg-[#1a1c1a] p-6 sm:p-8">
            <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
              <div className="flex-1">
                <h2 className="flex items-center gap-2 text-lg font-bold">
                  <ShieldCheck className="h-5 w-5 text-[#c9a84c]" />
                  {t("complianceHealth")}
                </h2>
                <p className="mt-3 max-w-md text-sm text-[#d0c5b2]">
                  {t("complianceHealthSubtitle")}
                </p>
                <div className="mt-7 flex h-3 overflow-hidden rounded-full bg-[#333533]">
                  {breakdown.map((item) => (
                    <div
                      key={item.key}
                      className={`h-full ${item.color}`}
                      style={{
                        width: `${totalShare ? (item.value / totalShare) * 100 : 0}%`,
                      }}
                      title={`${t(item.key)} : ${formatPct(totalShare ? (item.value / totalShare) * 100 : 0)} %`}
                    />
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#d0c5b2]">
                  {breakdown
                    .filter((item) => item.value > 0)
                    .map((item) => (
                      <span key={item.key} className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${item.color}`} />
                        {t(item.key)}{" "}
                        {formatPct(
                          totalShare ? (item.value / totalShare) * 100 : 0,
                        )}{" "}
                        %
                      </span>
                    ))}
                </div>
              </div>
              <div className="flex h-36 w-44 flex-col items-center justify-center rounded-t-full border-[12px] border-b-0 border-[#c9a84c] bg-[#1a1c1a]">
                <span className="text-3xl font-bold">{complianceScore} %</span>
                <span className="text-xs text-[#d0c5b2]">{t("compliantLower")}</span>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[2rem] border border-white/[0.05] bg-[#1a1c1a]">
            <div className="flex items-center justify-between p-6 sm:p-8">
              <div>
                <h2 className="text-xl font-bold">{t("activePortfolio")}</h2>
                <p className="mt-1 text-xs text-[#d0c5b2]">
                  {t("pricesAutoUpdated")}
                </p>
              </div>
              <PortfolioToolbar
                rows={rows.map((row) => ({
                  ticker: row.ticker,
                  name: row.name,
                  status: statusLabel(row.status, t),
                  value: row.value,
                  performance: row.performance,
                }))}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px]">
                <thead className="bg-[#282b28]/50 text-left text-[10px] uppercase tracking-widest text-[#d0c5b2]">
                  <tr>
                    <th className="px-8 py-4">{t("portfolioAsset")}</th>
                    <th className="px-8 py-4">{t("shariahStatus")}</th>
                    <th className="px-8 py-4">{t("valueColumn")}</th>
                    <th className="px-8 py-4 text-right">
                      {t("perfSincePurchase")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {rows.map((row) => (
                    <PortfolioLine
                      key={`${row.ticker}-${row.name}`}
                      row={row}
                      format={formatMoney}
                      formatPct={formatPct}
                      t={t}
                    />
                  ))}
                </tbody>
              </table>
              {!rows.length && (
                <p className="px-8 py-10 text-center text-sm text-[#8f8878]">
                  {t("noAssetsYet")}
                </p>
              )}
            </div>
            <Link
              href="/portfolio"
              className="block p-6 text-center text-xs font-bold hover:text-[#e6c364]"
            >
              {t("viewAllAssets")}
            </Link>
          </section>
        </div>

        <aside className="space-y-6 lg:col-span-4">
          <DashboardAlerts
            notifications={notifications}
            activeAlerts={activeAlerts}
          />
          <section className="rounded-[2rem] border border-white/[0.05] bg-[#1a1c1a] p-6">
            <h2 className="text-lg font-bold">{t("trackedMarkets")}</h2>
            {markets.length ? (
              markets
                .slice(0, 5)
                .map((market) => (
                  <Market
                    key={market.ticker}
                    icon={BarChart3}
                    name={market.name}
                    ticker={market.ticker}
                    value={
                      market.price == null
                        ? "—"
                        : `${market.price.toLocaleString(locale, { maximumFractionDigits: 2 })} ${market.currency ?? ""}`
                    }
                    changePercent={market.changePercent}
                    formatPct={formatPct}
                    changeUnavailable={t("changeUnavailable")}
                  />
                ))
            ) : (
              <p className="mt-5 text-sm text-[#8f8878]">
                {t("watchlistEmpty")}
              </p>
            )}
            {markets.length > 5 && (
              <Link
                href="/watchlist"
                className="mt-5 block text-xs font-bold text-[#e6c364]"
              >
                {t("viewFullWatchlist")}
              </Link>
            )}
          </section>
          <section className="relative overflow-hidden rounded-[2rem] bg-[#d5b34f] p-7 text-[#111412]">
            <Sparkles className="absolute -bottom-5 -right-5 h-28 w-28 opacity-20" />
            <h2 className="max-w-xs text-2xl font-bold">
              {t("optimizePortfolio")}
            </h2>
            <p className="mt-3 text-sm">{t("optimizePortfolioSubtitle")}</p>
            <Link
              href="/screening?app=1"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#111412] px-5 py-3 text-xs font-bold text-white"
            >
              {t("startAudit")} <ChevronRight className="h-4 w-4" />
            </Link>
          </section>
        </aside>
      </div>
    </main>
  );
}

function statusLabel(
  status: HalalStatus,
  t: (key: TranslationKey) => string,
): string {
  switch (status) {
    case "compliant":
      return t("statusCompliant").toLowerCase();
    case "debated":
      return t("statusDoubtful").toLowerCase();
    case "non_compliant":
      return t("statusNonCompliant").toLowerCase();
    default:
      return t("notAnalyzed").toLowerCase();
  }
}

function Kpi({
  title,
  value,
  icon: Icon,
  footer,
  positive,
  gold,
}: {
  title: string;
  value: string;
  icon: typeof Landmark;
  footer: string;
  positive?: boolean;
  gold?: boolean;
}) {
  return (
    <div className="rounded-[2rem] border border-white/[0.05] bg-[#1a1c1a] p-8">
      <div className="flex justify-between gap-4">
        <div>
          <p className="text-sm text-[#d0c5b2]">{title}</p>
          <p
            className={`mt-2 text-3xl font-bold ${gold ? "text-[#e6c364]" : ""}`}
          >
            {value}
          </p>
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${gold ? "bg-[#c9a84c] text-[#111412]" : "bg-white/5"}`}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <p
        className={`mt-8 text-xs ${positive === true ? "text-green-500" : positive === false ? "text-red-500" : "text-[#d0c5b2]"}`}
      >
        {footer}
      </p>
    </div>
  );
}

function PortfolioLine({
  row,
  format,
  formatPct,
  t,
}: {
  row: DashboardPortfolioRow;
  format: (value: number) => string;
  formatPct: (value: number) => string;
  t: (key: TranslationKey) => string;
}) {
  const statusStyle =
    row.status === "compliant"
      ? "bg-green-500/10 text-green-500"
      : row.status === "debated"
        ? "bg-amber-500/10 text-amber-500"
        : row.status === "non_compliant"
          ? "bg-red-500/10 text-red-400"
          : "bg-slate-500/10 text-slate-300";
  const identity = (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-xs font-bold">
        {row.ticker.slice(0, 4)}
      </div>
      <div>
        <p className="text-sm font-bold">{row.name}</p>
        <p className="text-[10px] text-[#d0c5b2]">{row.meta}</p>
      </div>
    </div>
  );
  return (
    <tr className="hover:bg-[#282b28]/50">
      <td className="px-8 py-5">
        {row.detailTicker ? (
          <Link
            href={`/asset/${encodeURIComponent(row.detailTicker)}`}
            className="hover:text-[#e6c364]"
          >
            {identity}
          </Link>
        ) : (
          identity
        )}
      </td>
      <td className="px-8 py-5">
        <span
          className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${statusStyle}`}
        >
          {statusLabel(row.status, t)}
        </span>
      </td>
      <td className="px-8 py-5 text-sm font-semibold">{format(row.value)}</td>
      <td
        className={`px-8 py-5 text-right text-sm font-bold ${row.performance >= 0 ? "text-green-500" : "text-red-500"}`}
      >
        {row.performance >= 0 ? "+" : ""}
        {formatPct(row.performance)} %
      </td>
    </tr>
  );
}

function Market({
  icon: Icon,
  name,
  ticker,
  value,
  changePercent,
  formatPct,
  changeUnavailable,
}: {
  icon: typeof Gem;
  name: string;
  ticker: string;
  value: string;
  changePercent: number | null;
  formatPct: (value: number) => string;
  changeUnavailable: string;
}) {
  return (
    <div className="mt-5 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c9a84c]/10 text-[#e6c364]">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold">{name}</p>
        <p className="text-[10px] text-[#d0c5b2]">
          {ticker} ·{" "}
          {changePercent == null
            ? changeUnavailable
            : `${changePercent >= 0 ? "+" : ""}${formatPct(changePercent)} %`}
        </p>
      </div>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}
