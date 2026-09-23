import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchYahooPrices } from "@/lib/yahoo-prices";
import { getLivePrices } from "@/lib/live-prices";
import { halalMock } from "@/lib/halal-mock";
import { estimateDividendsReceived } from "@/lib/aaoifi/dividends";
import { calculatePurification } from "@/lib/aaoifi/purification";
import {
  PortfolioView,
  type PortfolioRow,
} from "@/components/dashboard/portfolio-view";

const DAY_MS = 86_400_000;

function statusFromScreening(status: string): PortfolioRow["status"] {
  if (status === "COMPLIANT") return "compliant";
  if (status === "NON_COMPLIANT") return "non_compliant";
  return "debated";
}

export default async function PortfolioPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [assetsResult, cryptoResult, goldResult, livePrices] =
    await Promise.all([
      supabase.from("assets").select("*").eq("user_id", user.id),
      supabase.from("crypto_assets").select("*").eq("user_id", user.id),
      supabase.from("gold_assets").select("*").eq("user_id", user.id),
      getLivePrices(),
    ]);
  const loadError =
    assetsResult.error ?? cryptoResult.error ?? goldResult.error;
  if (loadError)
    throw new Error(
      `Impossible de charger le portefeuille : ${loadError.message}`,
    );
  const assets = assetsResult.data ?? [];
  const stockTickers = Array.from(
    new Set(
      assets
        .filter((asset) => asset.type === "stock" && asset.ticker)
        .map((asset) => asset.ticker!.trim().toUpperCase()),
    ),
  );
  // Both tables are optional for rendering: until the compliance migration is
  // applied or the cron has run, the portfolio falls back to stored statuses.
  const [screeningResult, changesResult] = await Promise.all([
    stockTickers.length
      ? supabase.from("screening_cache").select("ticker, status, purification_ratio, error").in("ticker", stockTickers)
      : Promise.resolve({ data: [] as { ticker: string; status: string; purification_ratio: number | null; error: string | null }[] }),
    supabase.from("compliance_changes").select("ticker, change_date").eq("user_id", user.id).eq("resolved", false),
  ]);
  const screenings = new Map((screeningResult.data ?? []).map((row) => [row.ticker, row]));
  const openChanges = new Map((changesResult.data ?? []).map((row) => [row.ticker, row.change_date]));
  const now = Date.now();
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
    ...(await Promise.all(assets.map(async (asset) => {
      const price =
        (asset.isin ? yahooPrices[asset.isin] : null) ??
        Number(asset.current_price ?? asset.average_buy_price);
      const ticker = asset.ticker ?? asset.isin ?? "ACTIF";
      const normalizedTicker = asset.ticker?.trim().toUpperCase() ?? "";
      const screening = asset.type === "stock" ? screenings.get(normalizedTicker) : undefined;
      const mock = halalMock[ticker] ?? halalMock[ticker.split(".")[0]];
      const status = screening && !screening.error
        ? statusFromScreening(screening.status)
        : asset.halal_status !== "unknown"
          ? asset.halal_status
          : mock?.status ?? (/ISLAMIC/i.test(asset.name) ? "compliant" : "debated");
      const purificationRatio = status !== "non_compliant" && screening?.purification_ratio != null
        ? Number(screening.purification_ratio)
        : null;
      const dividends = purificationRatio
        ? await estimateDividendsReceived(normalizedTicker, Number(asset.quantity), asset.purchase_date)
        : null;
      const purification = purificationRatio === 0
        ? 0
        : purificationRatio !== null && dividends !== null
          ? calculatePurification(purificationRatio, dividends)
          : status === "compliant" && !screening ? 0 : null;
      const changeDate = openChanges.get(normalizedTicker);
      const complianceDay = changeDate
        ? Math.min(90, Math.max(0, Math.floor((now - new Date(changeDate).getTime()) / DAY_MS)))
        : null;
      const displayType = asset.type === "etf"
        ? "ETF"
        : asset.type === "crypto"
          ? "Crypto"
          : asset.type === "gold"
            ? "Or"
            : "Action";
      return {
        id: asset.id,
        ticker: asset.ticker ?? asset.name.slice(0, 4).toUpperCase(),
        name: asset.name,
        type: displayType,
        account: asset.account_type ?? "CTO",
        quantity: Number(asset.quantity),
        averagePrice: Number(asset.average_buy_price),
        currentPrice: price,
        status,
        purification,
        purificationRatio,
        complianceDay,
      } satisfies PortfolioRow;
    }))),
    ...(cryptoResult.data ?? []).map((asset) => ({
      id: asset.id,
      ticker: asset.ticker,
      name: asset.name,
      type: "Crypto" as const,
      account: "Crypto",
      quantity: Number(asset.quantity),
      averagePrice: Number(asset.average_buy_price),
      currentPrice:
        asset.ticker === "BTC"
          ? (livePrices.btc_eur ?? Number(asset.current_price))
          : Number(asset.current_price),
      status: (asset.halal_status === "compliant"
        ? "compliant"
        : "debated") as PortfolioRow["status"],
      purification: 0,
    })),
    ...(goldResult.data ?? []).map((asset) => ({
      id: asset.id,
      ticker: asset.ticker,
      name: asset.name,
      type: "Or" as const,
      account: "Or",
      quantity: Number(asset.quantity_grams),
      averagePrice: Number(asset.average_buy_price_per_gram),
      currentPrice:
        livePrices.gold_eur_per_gram ?? Number(asset.current_price_per_gram),
      status: "compliant" as const,
      purification: 0,
    })),
  ];
  return <PortfolioView rows={rows} />;
}
