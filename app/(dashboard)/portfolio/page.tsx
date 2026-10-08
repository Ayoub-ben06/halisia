import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchYahooPrices, priceAssetsFor, priceKeyOf } from "@/lib/yahoo-prices";
import { getLivePrices } from "@/lib/live-prices";
import { assetHalalStatus, getTickerScreenings, isStockAssetType, normalizeTicker, screeningTickerForAsset } from "@/lib/halal-screening";
import { estimateDividendsReceived } from "@/lib/aaoifi/dividends";
import { calculatePurification } from "@/lib/aaoifi/purification";
import { displaySettings, GOLD_NISAB_GRAMS, nisabBasisOf, SILVER_NISAB_GRAMS } from "@/lib/user-preferences";
import { etfHalalStatus, etfTickerForAsset } from "@/lib/etf/etf-status";
import {
  PortfolioView,
  type PortfolioRow,
} from "@/components/dashboard/portfolio-view";

const DAY_MS = 86_400_000;

export const dynamic = "force-dynamic";

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams?: { imported?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const importedCount = Number(searchParams?.imported);
  const imported =
    Number.isFinite(importedCount) && importedCount > 0 ? importedCount : null;
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
  const screeningTickers = assets.filter((asset) => isStockAssetType(asset.type)).map(screeningTickerForAsset).filter((ticker): ticker is string => Boolean(ticker));
  const screenings = await getTickerScreenings(screeningTickers, Math.max(6, screeningTickers.length));
  const etfTickers = assets.filter((asset) => asset.type === "etf").map(etfTickerForAsset).filter((ticker): ticker is string => Boolean(ticker));
  const { data: etfScreeningRows } = etfTickers.length
    ? await supabase.from("etf_screening").select("ticker, verdict").in("ticker", etfTickers)
    : { data: [] };
  const openChanges = new Map((changesResult.data ?? []).map((row) => [row.ticker, row.change_date]));
  const now = Date.now();
  const yahooPrices = await fetchYahooPrices(priceAssetsFor(assets));
  const rows: PortfolioRow[] = [
    ...(await Promise.all(assets.map(async (asset) => {
      const priceKey = priceKeyOf(asset);
      const price =
        (priceKey ? yahooPrices[priceKey] : null) ??
        Number(asset.current_price ?? asset.average_buy_price);
      const normalizedTicker = asset.ticker ? normalizeTicker(asset.ticker) : "";
      const screening = isStockAssetType(asset.type) ? screenings[normalizedTicker] : undefined;
      const status = asset.type === "etf" ? etfHalalStatus(asset, etfScreeningRows ?? []) : assetHalalStatus(asset, screenings);
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
          : status === "compliant" && !isStockAssetType(asset.type) ? 0 : null;
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
        detailTicker: asset.ticker ?? screeningTickerForAsset(asset),
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
  const goldPerGram = livePrices.gold_eur_per_gram ?? 70;
  const silverPerGram = livePrices.silver_eur_per_gram ?? 0.95;
  const nisab = nisabBasisOf(user) === "silver" ? silverPerGram * SILVER_NISAB_GRAMS : goldPerGram * GOLD_NISAB_GRAMS;
  const zakatableValue = rows.filter((row) => row.status !== "non_compliant").reduce((sum, row) => sum + row.quantity * row.currentPrice, 0);
  const zakatEstimate = zakatableValue >= nisab ? zakatableValue * 0.025 : 0;
  return (
    <PortfolioView
      rows={rows}
      zakatEstimate={zakatEstimate}
      displayCurrency={display.currency}
      displayRate={display.rate}
      importedCount={imported}
    />
  );
}
