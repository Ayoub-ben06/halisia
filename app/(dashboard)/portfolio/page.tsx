import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchYahooPrices } from "@/lib/yahoo-prices";
import { getLivePrices } from "@/lib/live-prices";
import { assetHalalStatus, getTickerScreenings, normalizeTicker } from "@/lib/halal-screening";
import { estimateDividendsReceived } from "@/lib/aaoifi/dividends";
import { calculatePurification } from "@/lib/aaoifi/purification";
import { displaySettings } from "@/lib/user-preferences";
import {
  PortfolioView,
  type PortfolioRow,
} from "@/components/dashboard/portfolio-view";

const DAY_MS = 86_400_000;

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [assetsResult, cryptoResult, goldResult, livePrices, changesResult] =
    await Promise.all([
      supabase.from("assets").select("*").eq("user_id", user.id),
      supabase.from("crypto_assets").select("*").eq("user_id", user.id),
      supabase.from("gold_assets").select("*").eq("user_id", user.id),
      getLivePrices(),
      supabase.from("compliance_changes").select("ticker, change_date").eq("user_id", user.id).eq("resolved", false),
    ]);
  const loadError =
    assetsResult.error ?? cryptoResult.error ?? goldResult.error;
  if (loadError)
    throw new Error(
      `Impossible de charger le portefeuille : ${loadError.message}`,
    );
  const assets = assetsResult.data ?? [];
  const screenings = await getTickerScreenings(
    assets.filter((asset) => asset.type === "stock" && asset.ticker).map((asset) => asset.ticker!),
  );
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
      const normalizedTicker = asset.ticker ? normalizeTicker(asset.ticker) : "";
      const screening = asset.type === "stock" ? screenings[normalizedTicker] : undefined;
      const status = assetHalalStatus(asset, screenings);
      const purificationRatio = status !== "non_compliant" && screening?.purificationRatio != null
        ? screening.purificationRatio
        : null;
      const dividends = purificationRatio
        ? await estimateDividendsReceived(normalizedTicker, Number(asset.quantity), asset.purchase_date)
        : null;
      const purification = purificationRatio === 0
        ? 0
        : purificationRatio !== null && dividends !== null
          ? calculatePurification(purificationRatio, dividends)
          : status === "compliant" && asset.type !== "stock" ? 0 : null;
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
        source: "assets",
        ticker: asset.ticker ?? asset.name.slice(0, 4).toUpperCase(),
        detailTicker: asset.ticker,
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
      source: "crypto_assets" as const,
      ticker: asset.ticker,
      detailTicker: `${asset.ticker}-EUR`,
      name: asset.name,
      type: "Crypto" as const,
      account: "Crypto",
      quantity: Number(asset.quantity),
      averagePrice: Number(asset.average_buy_price),
      currentPrice:
        asset.ticker === "BTC"
          ? (livePrices.btc_eur ?? Number(asset.current_price))
          : Number(asset.current_price),
      status: "debated" as const,
      purification: 0,
    })),
    ...(goldResult.data ?? []).map((asset) => ({
      id: asset.id,
      source: "gold_assets" as const,
      ticker: asset.ticker,
      detailTicker: null,
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
  const display = await displaySettings(user);
  return <PortfolioView rows={rows} displayCurrency={display.currency} displayRate={display.rate} />;
}
