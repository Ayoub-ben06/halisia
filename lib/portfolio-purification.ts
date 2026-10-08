import "server-only";

import { calculatePurification } from "@/lib/aaoifi/purification";
import { estimateDividendsReceived } from "@/lib/aaoifi/dividends";
import {
  assetHalalStatus,
  getTickerScreenings,
  isStockAssetType,
  normalizeTicker,
  screeningTickerForAsset,
} from "@/lib/halal-screening";
import { fetchYahooPrices, priceAssetsFor, priceKeyOf } from "@/lib/yahoo-prices";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export type PurificationRow = {
  id: string;
  ticker: string | null;
  name: string;
  status: ReturnType<typeof assetHalalStatus>;
  value: number;
  ratio: number | null;
  dividends: number | null;
  amount: number | null;
  reason: string | null;
};

export async function getPortfolioPurification(user: User) {
  const supabase = createClient();
  const { data: assets, error } = await supabase
    .from("assets")
    .select("*")
    .eq("user_id", user.id);
  if (error) throw new Error(`Impossible de calculer la purification : ${error.message}`);

  const portfolioAssets = assets ?? [];
  const stockAssets = portfolioAssets.filter((asset) => isStockAssetType(asset.type));
  const screeningTickers = stockAssets
    .map((asset) => screeningTickerForAsset(asset))
    .filter((ticker): ticker is string => Boolean(ticker));
  const [prices, screenings] = await Promise.all([
    fetchYahooPrices(priceAssetsFor(portfolioAssets)),
    getTickerScreenings(screeningTickers, Math.max(6, screeningTickers.length)),
  ]);

  const rows = await Promise.all(stockAssets.map(async (asset) => {
    const ticker = screeningTickerForAsset(asset);
    const screening = ticker ? screenings[normalizeTicker(ticker)] : undefined;
    const status = assetHalalStatus(asset, screenings);
    const ratio = status !== "non_compliant" ? screening?.purificationRatio ?? null : null;
    const dividends = ratio === 0
      ? 0
      : ratio != null && ticker
        ? await estimateDividendsReceived(ticker, Number(asset.quantity), asset.purchase_date)
        : null;
    const amount = ratio != null && dividends != null
      ? calculatePurification(ratio, dividends)
      : null;
    const price = (priceKeyOf(asset) ? prices[priceKeyOf(asset)!] : null) ?? Number(asset.current_price ?? asset.average_buy_price ?? 0);

    return {
      id: asset.id,
      ticker,
      name: asset.name,
      status,
      value: Number(asset.quantity) * price,
      ratio,
      dividends,
      amount,
      reason: screening?.reason ?? null,
    } satisfies PurificationRow;
  }));

  return {
    rows,
    totalDividends: rows.reduce((sum, row) => sum + (row.dividends ?? 0), 0),
    totalAmount: rows.reduce((sum, row) => sum + (row.amount ?? 0), 0),
    unavailableCount: rows.filter((row) => row.ratio != null && row.ratio > 0 && row.dividends == null).length,
  };
}
