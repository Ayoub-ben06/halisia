import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  ChevronRight,
  Coins,
  Gauge,
  Gem,
  Landmark,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { PortfolioToolbar } from "@/components/dashboard/portfolio-toolbar";
import { DashboardAlerts } from "@/components/dashboard/dashboard-alerts";
import { createClient } from "@/lib/supabase/server";
import { fetchYahooPrices } from "@/lib/yahoo-prices";
import { getLivePrices } from "@/lib/live-prices";
import { assetHalalStatus, getTickerScreenings } from "@/lib/halal-screening";
import type { HalalStatus } from "@/lib/halal-status";
import { getUserNotifications } from "@/lib/notifications";
import { displaySettings } from "@/lib/user-preferences";
import { moneyFormatter } from "@/lib/money";

const pct = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

type PortfolioRow = {
  ticker: string;
  detailTicker: string | null;
  name: string;
  meta: string;
  value: number;
  performance: number;
  status: HalalStatus;
};

const statusLabels: Record<HalalStatus, string> = {
  compliant: "conforme",
  debated: "douteux",
  non_compliant: "non conforme",
  unknown: "non analysé",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [assetsResult, cryptoResult, goldResult, livePrices, notifications, display] =
    await Promise.all([
      supabase.from("assets").select("*").eq("user_id", user.id),
      supabase.from("crypto_assets").select("*").eq("user_id", user.id),
      supabase.from("gold_assets").select("*").eq("user_id", user.id),
      getLivePrices(),
      getUserNotifications(user.id),
      displaySettings(user),
    ]);
  const eur = moneyFormatter(display.currency, display.rate);
  const assets = assetsResult.data ?? [];
  const crypto = cryptoResult.data ?? [];
  const gold = goldResult.data ?? [];
  const screenings = await getTickerScreenings(
    assets.filter((asset) => asset.type === "stock" && asset.ticker).map((asset) => asset.ticker!),
  );
  const yahooPrices = await fetchYahooPrices(
    assets
      .filter((asset) => asset.isin)
      .map((asset) => ({
        isin: asset.isin!,
        ticker: asset.ticker,
        name: asset.name,
        currency: asset.currency,
      })),
  );

  const rows: PortfolioRow[] = [
    ...assets.map((asset) => {
      const invested = Number(asset.quantity) * Number(asset.average_buy_price);
      const price =
        (asset.isin ? yahooPrices[asset.isin] : null) ??
        Number(asset.current_price ?? 0);
      const value = Number(asset.quantity) * price;
      return {
        ticker:
          asset.ticker ??
          asset.name.match(/\(([^)]+)\)$/)?.[1] ??
          asset.type.toUpperCase(),
        detailTicker: asset.ticker,
        name: asset.name.replace(/\s*\([^)]+\)$/, ""),
        meta: `${asset.type === "etf" ? "ETF" : "ACTION"} • ${asset.account_type ?? asset.broker.toUpperCase()}`,
        value,
        performance: invested ? ((value - invested) / invested) * 100 : 0,
        status: assetHalalStatus(asset, screenings),
      };
    }),
    ...crypto.map((asset) => {
      const price =
        asset.ticker === "BTC"
          ? (livePrices.btc_eur ?? Number(asset.current_price))
          : Number(asset.current_price);
      const value = Number(asset.quantity) * price;
      const invested = Number(asset.quantity) * Number(asset.average_buy_price);
      return {
        ticker: asset.ticker,
        detailTicker: `${asset.ticker}-EUR`,
        name: asset.name,
        meta: `CRYPTO • ${asset.broker.toUpperCase()}`,
        value,
        performance: invested ? ((value - invested) / invested) * 100 : 0,
        status: "debated" as const,
      };
    }),
    ...gold.map((asset) => {
      const price =
        livePrices.gold_eur_per_gram ?? Number(asset.current_price_per_gram);
      const value = Number(asset.quantity_grams) * price;
      const invested = Number(asset.quantity_grams) * Number(asset.average_buy_price_per_gram);
      return {
        ticker: asset.ticker,
        detailTicker: null,
        name: asset.name,
        meta: `MÉTAL • ${asset.broker.toUpperCase()}`,
        value,
        performance: invested ? ((value - invested) / invested) * 100 : 0,
        status: "compliant" as const,
      };
    }),
  ];
  const totalValue = rows.reduce((sum, row) => sum + row.value, 0);
  const totalInvested =
    assets.reduce(
      (sum, asset) =>
        sum + Number(asset.quantity) * Number(asset.average_buy_price),
      0,
    ) +
    crypto.reduce(
      (sum, asset) =>
        sum + Number(asset.quantity) * Number(asset.average_buy_price),
      0,
    ) +
    gold.reduce(
      (sum, asset) =>
        sum + Number(asset.quantity_grams) * Number(asset.average_buy_price_per_gram),
      0,
    );
  const performance = totalInvested
    ? ((totalValue - totalInvested) / totalInvested) * 100
    : 0;
  const valueBy = (status: HalalStatus) => rows.filter((row) => row.status === status).reduce((sum, row) => sum + row.value, 0);
  const compliantValue = valueBy("compliant");
  const complianceScore = totalValue
    ? Math.round((compliantValue / totalValue) * 100)
    : 0;
  const share = (value: number) => (totalValue ? (value / totalValue) * 100 : 0);
  const breakdown = [
    { label: "Conforme", value: compliantValue, color: "bg-green-500" },
    { label: "Douteux", value: valueBy("debated"), color: "bg-amber-500" },
    { label: "Non conforme", value: valueBy("non_compliant"), color: "bg-red-500" },
    { label: "Non analysé", value: valueBy("unknown"), color: "bg-slate-500" },
  ];

  return (
    <>
        <main className="mx-auto max-w-[1400px] space-y-8 p-4 sm:p-8">
          <section className="grid gap-6 lg:grid-cols-3">
            <Kpi
              title="Valeur totale"
              value={eur.format(totalValue)}
              icon={Landmark}
              footer={`${performance >= 0 ? "+" : ""}${pct.format(performance)} % depuis l'achat`}
              positive={performance >= 0}
            />
            <Kpi
              title="Performance totale"
              value={`${performance >= 0 ? "+" : ""}${pct.format(performance)} %`}
              icon={TrendingUp}
              footer={`Investi : ${eur.format(totalInvested)}`}
              positive={performance >= 0}
            />
            <Kpi
              title="Zakat estimée"
              value={eur.format(totalValue * 0.025)}
              icon={Coins}
              gold
              footer="2,5 % brut, avant nisab et exclusions — détail dans Zakat"
            />
          </section>

          <div className="grid gap-8 lg:grid-cols-12">
            <div className="space-y-8 lg:col-span-8">
              <section className="rounded-[2rem] border border-white/[0.05] bg-[#1a1c1a] p-6 sm:p-8">
                <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
                  <div className="flex-1">
                    <h2 className="flex items-center gap-2 text-lg font-bold">
                      <ShieldCheck className="h-5 w-5 text-[#c9a84c]" />
                      Santé de la conformité
                    </h2>
                    <p className="mt-3 max-w-md text-sm text-[#d0c5b2]">
                      Part de la valeur du portefeuille par statut AAOIFI.
                    </p>
                    <div className="mt-7 flex h-3 overflow-hidden rounded-full bg-[#333533]">
                      {breakdown.map((item) => (
                        <div key={item.label} className={`h-full ${item.color}`} style={{ width: `${share(item.value)}%` }} title={`${item.label} : ${pct.format(share(item.value))} %`} />
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#d0c5b2]">
                      {breakdown.filter((item) => item.value > 0).map((item) => (
                        <span key={item.label} className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${item.color}`} />
                          {item.label} {pct.format(share(item.value))} %
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex h-36 w-44 flex-col items-center justify-center rounded-t-full border-[12px] border-b-0 border-[#c9a84c] bg-[#1a1c1a]">
                    <span className="text-3xl font-bold">
                      {complianceScore} %
                    </span>
                    <span className="text-xs text-[#d0c5b2]">conforme</span>
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-[2rem] border border-white/[0.05] bg-[#1a1c1a]">
                <div className="flex items-center justify-between p-6 sm:p-8">
                  <div>
                    <h2 className="text-xl font-bold">Portefeuille Actif</h2>
                    <p className="mt-1 text-xs text-[#d0c5b2]">
                      Cours actualisés automatiquement
                    </p>
                  </div>
                  <PortfolioToolbar rows={rows.map((row) => ({ ticker: row.ticker, name: row.name, status: statusLabels[row.status], value: row.value, performance: row.performance }))} />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px]">
                    <thead className="bg-[#282b28]/50 text-left text-[10px] uppercase tracking-widest text-[#d0c5b2]">
                      <tr>
                        <th className="px-8 py-4">Actif</th>
                        <th className="px-8 py-4">Statut Shariah</th>
                        <th className="px-8 py-4">Valeur</th>
                        <th className="px-8 py-4 text-right">Perf. depuis l’achat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {rows.map((row) => (
                        <PortfolioLine
                          key={`${row.ticker}-${row.name}`}
                          row={row}
                          format={eur.format}
                        />
                      ))}
                    </tbody>
                  </table>
                  {!rows.length && (
                    <p className="px-8 py-10 text-center text-sm text-[#8f8878]">Aucun actif pour le moment. Ajoutez votre première position avec le bouton +.</p>
                  )}
                </div>
                <Link
                  href="/portfolio"
                  className="block p-6 text-center text-xs font-bold hover:text-[#e6c364]"
                >
                  Voir tous les actifs
                </Link>
              </section>
            </div>

            <aside className="space-y-6 lg:col-span-4">
              <DashboardAlerts notifications={notifications} />
              <section className="rounded-[2rem] border border-white/[0.05] bg-[#1a1c1a] p-6">
                <h2 className="text-lg font-bold">Marchés suivis</h2>
                <Market
                  icon={Gem}
                  name="Or (XAU/EUR)"
                  value={
                    livePrices.gold_eur_per_gram
                      ? `${eur.format(livePrices.gold_eur_per_gram)}/g`
                      : "—"
                  }
                />
                <Market
                  icon={BarChart3}
                  name="Bitcoin (BTC/EUR)"
                  value={
                    livePrices.btc_eur ? eur.format(livePrices.btc_eur) : "—"
                  }
                />
              </section>
              <section className="relative overflow-hidden rounded-[2rem] bg-[#d5b34f] p-7 text-[#111412]">
                <Sparkles className="absolute -bottom-5 -right-5 h-28 w-28 opacity-20" />
                <h2 className="max-w-xs text-2xl font-bold">
                  Optimisez votre Portefeuille
                </h2>
                <p className="mt-3 text-sm">
                  Obtenez une vision claire de la conformité de vos actifs.
                </p>
                <Link
                  href="/screening?app=1"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#111412] px-5 py-3 text-xs font-bold text-white"
                >
                  Démarrer l&apos;audit <ChevronRight className="h-4 w-4" />
                </Link>
              </section>
            </aside>
          </div>
        </main>
    </>
  );
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
  icon: typeof Gauge;
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

function PortfolioLine({ row, format }: { row: PortfolioRow; format: (value: number) => string }) {
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
        {row.detailTicker ? <Link href={`/asset/${encodeURIComponent(row.detailTicker)}`} className="hover:text-[#e6c364]">{identity}</Link> : identity}
      </td>
      <td className="px-8 py-5">
        <span
          className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${statusStyle}`}
        >
          {statusLabels[row.status]}
        </span>
      </td>
      <td className="px-8 py-5 text-sm font-semibold">
        {format(row.value)}
      </td>
      <td
        className={`px-8 py-5 text-right text-sm font-bold ${row.performance >= 0 ? "text-green-500" : "text-red-500"}`}
      >
        {row.performance >= 0 ? "+" : ""}
        {pct.format(row.performance)} %
      </td>
    </tr>
  );
}

function Market({
  icon: Icon,
  name,
  value,
}: {
  icon: typeof Gem;
  name: string;
  value: string;
}) {
  return (
    <div className="mt-5 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c9a84c]/10 text-[#e6c364]">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold">{name}</p>
        <p className="text-[10px] text-[#d0c5b2]">Cours actuel</p>
      </div>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}
