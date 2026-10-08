"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Loader2, Plus, Search, X } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/components/providers/i18n-provider";

export type HistoryPoint = { date: string; price: number };
export type AssetAlert = {
  id: string;
  alert_type: "halal_change" | "price_target";
  price_target: number | null;
  is_active: boolean;
};
export type SimilarAsset = {
  ticker: string;
  name: string;
  price: number | null;
  changePercent: number | null;
};

const periods = ["1J", "1S", "1M", "3M", "6M", "1A", "5A"];
const periodDays: Record<string, number> = {
  "1J": 1,
  "1S": 7,
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1A": 365,
  "5A": 1825,
};

export function AssetAnalytics({
  ticker,
  name,
  currency,
  initialHistory,
  currentPrice,
  alerts: initialAlerts,
  similar,
  stats,
}: {
  ticker: string;
  name: string;
  currency: string;
  initialHistory: HistoryPoint[];
  currentPrice: number | null;
  alerts: AssetAlert[];
  similar: SimilarAsset[];
  stats: {
    per: number | null;
    dividendYield: number | null;
    beta: number | null;
    averageVolume: number | null;
  };
}) {
  const { language, t } = useI18n();
  const locale = language === "en" ? "en-US" : "fr-FR";
  const money = (value: number, curr: string) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: curr,
      maximumFractionDigits: 2,
    }).format(value);

  const [period, setPeriod] = useState("1A");
  const [history, setHistory] = useState(initialHistory);
  const [comparisonTicker, setComparisonTicker] = useState<string | null>(null);
  const [comparisonName, setComparisonName] = useState<string | null>(null);
  const [comparison, setComparison] = useState<HistoryPoint[]>([]);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ ticker: string; name: string }>>([]);
  const [target, setTarget] = useState("");
  const [alertType, setAlertType] = useState<"price_target" | "halal_change">("price_target");
  const [busy, setBusy] = useState(false);

  const chartData = useMemo(() => {
    const other = new Map(comparison.map((point) => [point.date.slice(0, 10), point.price]));
    const comparisonMode = Boolean(comparisonTicker && comparison.length && history.length);
    const mainBase = history[0]?.price ?? 1;
    const comparisonBase = comparison[0]?.price ?? 1;
    return history.map((point) => ({
      date: point.date,
      price: comparisonMode ? (point.price / mainBase) * 100 : point.price,
      comparisonPrice:
        comparisonMode && other.has(point.date.slice(0, 10))
          ? ((other.get(point.date.slice(0, 10)) ?? comparisonBase) / comparisonBase) * 100
          : null,
    }));
  }, [history, comparison, comparisonTicker]);

  const performances = ["1M", "3M", "6M", "1A"].map((key) => ({
    key,
    value: performance(history, periodDays[key]),
  }));

  async function changePeriod(next: string) {
    setPeriod(next);
    setBusy(true);
    try {
      const response = await fetch(`/api/historical?ticker=${encodeURIComponent(ticker)}&period=${next}`);
      const data = (await response.json()) as HistoryPoint[];
      if (response.ok) setHistory(data);
      if (comparisonTicker) {
        const comparisonResponse = await fetch(`/api/historical?ticker=${encodeURIComponent(comparisonTicker)}&period=${next}`);
        if (comparisonResponse.ok) setComparison((await comparisonResponse.json()) as HistoryPoint[]);
      }
    } finally {
      setBusy(false);
    }
  }

  async function chooseComparison(nextTicker: string, nextName: string) {
    setComparisonTicker(nextTicker);
    setComparisonName(nextName);
    setSearch("");
    setSearchResults([]);
    const response = await fetch(`/api/historical?ticker=${encodeURIComponent(nextTicker)}&period=${period}`);
    if (response.ok) {
      setComparison((await response.json()) as HistoryPoint[]);
    } else {
      setComparisonTicker(null);
      setComparisonName(null);
      setComparison([]);
    }
  }

  async function searchAssets(value: string) {
    setSearch(value);
    if (!value.trim()) return setSearchResults([]);
    const response = await fetch(`/api/search-assets?q=${encodeURIComponent(value)}`);
    if (response.ok) setSearchResults((await response.json()).slice(0, 5));
  }

  async function toggleAlert(alert: AssetAlert) {
    const next = !alert.is_active;
    await createClient().from("watchlist_alerts").update({ is_active: next }).eq("id", alert.id);
    setAlerts((current) => current.map((item) => (item.id === alert.id ? { ...item, is_active: next } : item)));
  }

  async function addAlert() {
    if (alertType === "price_target" && !(Number(target) > 0)) return;
    const client = createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return;
    const { data } = await client
      .from("watchlist_alerts")
      .insert({
        user_id: user.id,
        ticker,
        name: ticker,
        alert_type: alertType,
        price_target: alertType === "price_target" ? Number(target) : null,
        is_active: true,
      })
      .select("id, alert_type, price_target, is_active")
      .single();
    if (data) setAlerts((current) => [...current, data as AssetAlert]);
    setTarget("");
  }

  const statLabels = [
    ["assetStatPer", stats.per == null ? "—" : stats.per.toLocaleString(locale, { maximumFractionDigits: 1 })],
    [
      "assetStatDividendYield",
      stats.dividendYield == null ? "—" : `${(stats.dividendYield * 100).toLocaleString(locale, { maximumFractionDigits: 2 })} %`,
    ],
    ["assetStatBeta", stats.beta == null ? "—" : stats.beta.toLocaleString(locale, { maximumFractionDigits: 2 })],
    ["assetStatAverageVolume", stats.averageVolume == null ? "—" : stats.averageVolume.toLocaleString(locale)],
  ] as const;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/[0.05] bg-[#1a1c1a] p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">{t("assetHistoricalPerformance")}</h2>
            <p className="mt-1 text-xs text-[#a9a291]">{t("assetPriceEvolution")}</p>
          </div>
          <div className="flex rounded-lg bg-[#111412] p-1">
            {periods.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => void changePeriod(item)}
                className={`rounded-md px-3 py-1.5 text-[10px] font-bold ${period === item ? "bg-[#c9a84c] text-[#111412]" : "text-[#a9a291]"}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6 h-[280px] w-full">
          {busy ? (
            <div className="flex h-full items-center justify-center text-[#a9a291]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : history.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="assetGold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c9a84c" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#c9a84c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#293029" strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString(locale, {
                      month: "short",
                      year: "2-digit",
                    })
                  }
                  stroke="#8f8878"
                  tick={{ fontSize: 10 }}
                  minTickGap={32}
                />
                <YAxis
                  orientation="right"
                  stroke="#8f8878"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => `${Number(value).toFixed(0)} ${comparisonTicker ? "%" : currency}`}
                />
                <Tooltip
                  contentStyle={{
                    background: "#132019",
                    border: "1px solid #394331",
                    borderRadius: 8,
                  }}
                  labelFormatter={(value) => new Date(String(value)).toLocaleDateString(locale)}
                  formatter={(value, seriesName) => [
                    comparisonTicker ? `${Number(value).toFixed(1)} %` : money(Number(value), currency),
                    seriesName === "comparisonPrice" ? (comparisonTicker ?? t("assetComparison")) : ticker,
                  ]}
                />
                <Area type="monotone" dataKey="price" stroke="#c9a84c" fill="url(#assetGold)" strokeWidth={2} dot={false} />
                {comparisonTicker && (
                  <Line type="monotone" dataKey="comparisonPrice" stroke="#fff" strokeDasharray="5 5" dot={false} strokeWidth={1.5} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[#8f8878]">{t("assetHistoryUnavailable")}</div>
          )}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {performances.map((item) => (
            <div key={item.key} className="rounded-xl bg-[#111412] p-3">
              <p className="text-[10px] uppercase text-[#8f8878]">{item.key}</p>
              <p className={`mt-1 text-sm font-bold ${item.value >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {item.value >= 0 ? "+" : ""}
                {item.value.toFixed(1).replace(".", locale === "fr-FR" ? "," : ".")} %
              </p>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-[2rem] border border-white/[0.05] bg-[#1a1c1a] p-5 sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{t("assetCompareWith")}</h2>
            <p className="mt-1 text-xs text-[#a9a291]">{t("assetNormalizedPerformance")}</p>
          </div>
          {comparisonTicker && (
            <button
              type="button"
              onClick={() => {
                setComparisonTicker(null);
                setComparisonName(null);
                setComparison([]);
              }}
              className="text-xs text-[#a9a291]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="relative mt-5">
          <Search className="absolute left-3 top-3 h-4 w-4 text-[#8f8878]" />
          <input
            value={search}
            onChange={(event) => void searchAssets(event.target.value)}
            placeholder={t("assetCompareSearchPlaceholder")}
            className="h-10 w-full rounded-lg border border-[#344038] bg-[#111412] pl-9 text-sm outline-none focus:border-[#c9a84c]"
          />
          {searchResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-[#344038] bg-[#151b18] p-1">
              {searchResults.map((result) => (
                <button
                  key={result.ticker}
                  type="button"
                  onClick={() => void chooseComparison(result.ticker, result.name)}
                  className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-white/5"
                >
                  {result.ticker} <span className="text-[#8f8878]">{result.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {comparisonTicker && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.05] text-xs">
                  <th className="py-3 text-left text-[#8f8878]">{t("assetPeriod")}</th>
                  <th className="py-3 text-right font-semibold text-[#c9a84c]">
                    {name} ({ticker})
                  </th>
                  <th className="py-3 text-right font-semibold text-white">{comparisonName ?? comparisonTicker}</th>
                </tr>
              </thead>
              <tbody>
                {performances.map((item) => (
                  <tr key={item.key} className="border-b border-white/[0.05]">
                    <td className="py-3 text-[#a9a291]">{item.key}</td>
                    <td className="py-3 text-right font-semibold">{performance(history, periodDays[item.key]).toFixed(1)} %</td>
                    <td className="py-3 text-right font-semibold">{performance(comparison, periodDays[item.key]).toFixed(1)} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-[2rem] border border-white/[0.05] bg-[#1a1c1a] p-5 sm:p-8">
          <h2 className="text-xl font-bold">{t("assetEthicalAlerts")}</h2>
          {alerts.map((alert) => (
            <div key={alert.id} className="mt-4 flex items-center justify-between rounded-xl bg-[#111412] p-4">
              <span className="text-sm">
                {alert.alert_type === "halal_change"
                  ? t("assetShariahMonitoring")
                  : t("assetPriceWhenReaches").replace("{price}", money(alert.price_target ?? 0, currency))}
              </span>
              <button
                type="button"
                onClick={() => void toggleAlert(alert)}
                className={`rounded-full px-3 py-1 text-xs font-bold ${alert.is_active ? "bg-emerald-500/15 text-emerald-400" : "bg-white/10 text-[#8f8878]"}`}
              >
                {alert.is_active ? t("assetAlertActive") : t("assetAlertInactive")}
              </button>
            </div>
          ))}
          <div className="mt-5 flex gap-2">
            <select
              value={alertType}
              onChange={(event) => setAlertType(event.target.value as typeof alertType)}
              className="rounded-lg border border-[#344038] bg-[#111412] px-2 text-xs"
            >
              <option value="price_target">{t("assetAlertPrice")}</option>
              <option value="halal_change">{t("shariahStatus")}</option>
            </select>
            {alertType === "price_target" && (
              <input
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                placeholder={t("assetPriceTargetPlaceholder")}
                className="min-w-0 flex-1 rounded-lg border border-[#344038] bg-[#111412] px-3 text-sm"
              />
            )}
            <button type="button" onClick={() => void addAlert()} className="rounded-lg bg-[#c9a84c] px-3 text-[#111412]">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </section>
        <section className="rounded-[2rem] border border-white/[0.05] bg-[#1a1c1a] p-5 sm:p-8">
          <h2 className="text-xl font-bold">{t("assetSimilarHalal")}</h2>
          {similar.length ? (
            similar.map((item) => (
              <Link
                href={`/asset/${encodeURIComponent(item.ticker)}`}
                key={item.ticker}
                className="mt-4 flex items-center justify-between rounded-xl bg-[#111412] p-4 hover:bg-white/5"
              >
                <span>
                  <strong>{item.ticker}</strong>
                  <span className="ml-2 text-sm text-[#a9a291]">{item.name}</span>
                </span>
                <span className="text-right text-sm">
                  {item.price == null ? "—" : money(item.price, currency)}
                  <br />
                  <span className="text-xs text-emerald-400">
                    {item.changePercent == null ? "" : `${item.changePercent >= 0 ? "+" : ""}${item.changePercent.toFixed(1)} %`}
                  </span>
                </span>
              </Link>
            ))
          ) : (
            <p className="mt-4 text-sm text-[#8f8878]">{t("assetNoSimilar")}</p>
          )}
        </section>
      </div>
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statLabels.map(([labelKey, value]) => (
          <div key={labelKey} className="rounded-2xl border border-white/[0.05] bg-[#1a1c1a] p-5">
            <p className="text-[10px] uppercase text-[#8f8878]">{t(labelKey)}</p>
            <p className="mt-2 text-xl font-bold">{value}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

function performance(points: HistoryPoint[], days: number) {
  if (!points.length) return 0;
  const current = points[points.length - 1]?.price;
  const target =
    points[
      Math.max(
        0,
        points.length -
          Math.max(
            1,
            Math.round(days / Math.max(1, periodDays["1A"] / Math.max(1, points.length))),
          ),
      )
    ]?.price ?? points[0].price;
  return target ? ((current - target) / target) * 100 : 0;
}
