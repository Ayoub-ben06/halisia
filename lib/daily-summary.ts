import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { fetchYahooMarketData } from "@/lib/yahoo-prices";
import { getLivePrices } from "@/lib/live-prices";
import type { HalalStatus } from "@/lib/halal-status";
import { assetHalalStatus, getTickerScreenings } from "@/lib/halal-screening";

/** Nisab de référence utilisé pour l'estimation, en euros. */
export const NISAB_EUR = 5950;
const ZAKAT_RATE = 0.025;

export type DailySummaryAsset = {
  name: string;
  category: "Actions & ETF" | "Crypto" | "Or";
  value: number;
  dayChange: number;
  dayChangePercent: number | null;
  halalStatus: HalalStatus;
};

export type DailySummaryData = {
  userId: string;
  email: string;
  firstName: string;
  totalValue: number;
  dayChange: number;
  dayChangePercent: number | null;
  totalChange: number;
  totalChangePercent: number | null;
  assets: DailySummaryAsset[];
  halalScore: number;
  compliantCount: number;
  monitorCount: number;
  zakat: number;
  zakatableValue: number;
  nisab: number;
};

type Position = {
  name: string;
  category: DailySummaryAsset["category"];
  quantity: number;
  livePrice: number;
  /** Prix d'achat initial, base de calcul de la performance. */
  referencePrice: number;
  dailyChangePercent: number | null;
  buyPrice: number;
  halalStatus: HalalStatus;
};

function toPosition(position: Position): DailySummaryAsset & {
  previousValue: number;
  investedValue: number;
} {
  const value = position.quantity * position.livePrice;
  const previousValue = position.dailyChangePercent === null
    ? value
    : value / (1 + position.dailyChangePercent / 100);
  const investedValue = position.quantity * position.buyPrice;
  const dayChange = value - previousValue;

  return {
    name: position.name,
    category: position.category,
    value,
    dayChange,
    dayChangePercent: position.dailyChangePercent,
    halalStatus: position.halalStatus,
    previousValue,
    investedValue,
  };
}

/**
 * Construit le résumé quotidien de chaque utilisateur passé en paramètre.
 * Les prix de marché sont récupérés une seule fois pour l'ensemble des
 * utilisateurs afin de limiter les appels aux fournisseurs.
 */
export async function buildDailySummaries(
  userIds: string[],
): Promise<DailySummaryData[]> {
  if (userIds.length === 0) return [];

  const admin = createAdminClient();

  const [assetsResult, cryptoResult, goldResult] = await Promise.all([
    admin.from("assets").select("*").in("user_id", userIds),
    admin.from("crypto_assets").select("*").in("user_id", userIds),
    admin.from("gold_assets").select("*").in("user_id", userIds),
  ]);

  const loadError = assetsResult.error ?? cryptoResult.error ?? goldResult.error;
  if (loadError) {
    throw new Error(`Lecture des portefeuilles impossible : ${loadError.message}`);
  }

  const assets = assetsResult.data ?? [];
  const cryptoAssets = cryptoResult.data ?? [];
  const goldAssets = goldResult.data ?? [];

  // Un seul appel Yahoo pour tous les utilisateurs : on déduplique par ISIN.
  const uniqueIsins = new Map<
    string,
    { isin: string; ticker: string | null; name: string; currency: string }
  >();
  for (const asset of assets) {
    if (asset.isin && !uniqueIsins.has(asset.isin)) {
      uniqueIsins.set(asset.isin, {
        isin: asset.isin,
        ticker: asset.ticker,
        name: asset.name,
        currency: asset.currency,
      });
    }
  }

  const [yahooPrices, livePrices] = await Promise.all([
    fetchYahooMarketData([
      ...Array.from(uniqueIsins.values()),
      { isin: "GC=F", ticker: "GC=F", name: "Gold futures", currency: "USD" },
    ]),
    getLivePrices(),
  ]);

  // Cache-only (no on-demand analysis) to keep the cron run short; tickers
  // not screened yet show as "unknown" until the compliance cron runs.
  const screenings = await getTickerScreenings(
    assets.filter((asset) => asset.type === "stock" && asset.ticker).map((asset) => asset.ticker!),
    0,
  );
  const summaries: DailySummaryData[] = [];

  for (const userId of userIds) {
    const {
      data: { user },
    } = await admin.auth.admin.getUserById(userId);
    if (!user?.email) continue;

    const positions: Position[] = [];

    for (const asset of assets.filter((row) => row.user_id === userId)) {
      const buyPrice = Number(asset.average_buy_price);
      const market = asset.isin ? yahooPrices[asset.isin] : null;
      const referencePrice = buyPrice;
      const yahooPrice = market?.price ?? null;

      positions.push({
        name: asset.name,
        category: "Actions & ETF",
        quantity: Number(asset.quantity),
        livePrice: yahooPrice ?? referencePrice,
        referencePrice,
        dailyChangePercent: market?.changePercent ?? null,
        buyPrice,
        halalStatus: assetHalalStatus(asset, screenings),
      });
    }

    for (const asset of cryptoAssets.filter((row) => row.user_id === userId)) {
      const referencePrice = Number(asset.average_buy_price);
      const livePrice =
        asset.ticker === "BTC" ? (livePrices.btc_eur ?? referencePrice) : referencePrice;

      positions.push({
        name: asset.name,
        category: "Crypto",
        quantity: Number(asset.quantity),
        livePrice,
        referencePrice,
        dailyChangePercent: asset.ticker === "BTC" ? livePrices.btc_change_percent : null,
        buyPrice: Number(asset.average_buy_price),
        halalStatus: "debated",
      });
    }

    for (const asset of goldAssets.filter((row) => row.user_id === userId)) {
      const referencePrice = Number(asset.average_buy_price_per_gram);

      positions.push({
        name: asset.name,
        category: "Or",
        quantity: Number(asset.quantity_grams),
        livePrice: livePrices.gold_eur_per_gram ?? referencePrice,
        referencePrice,
        dailyChangePercent: yahooPrices["GC=F"]?.changePercent ?? null,
        buyPrice: Number(asset.average_buy_price_per_gram),
        halalStatus: "compliant",
      });
    }

    const rows = positions.map(toPosition);
    const totalValue = rows.reduce((sum, row) => sum + row.value, 0);
    const previousValue = rows.reduce((sum, row) => sum + row.previousValue, 0);
    const investedValue = rows.reduce((sum, row) => sum + row.investedValue, 0);
    const dayChange = totalValue - previousValue;
    const totalChange = totalValue - investedValue;

    const compliantValue = rows
      .filter((row) => row.halalStatus === "compliant")
      .reduce((sum, row) => sum + row.value, 0);
    const compliantCount = rows.filter(
      (row) => row.halalStatus === "compliant",
    ).length;

    summaries.push({
      userId,
      email: user.email,
      firstName:
        String(user.user_metadata?.first_name ?? "").trim() ||
        user.email.split("@")[0],
      totalValue,
      dayChange,
      dayChangePercent: previousValue > 0 ? (dayChange / previousValue) * 100 : null,
      totalChange,
      totalChangePercent:
        investedValue > 0 ? (totalChange / investedValue) * 100 : null,
      assets: rows
        .map(({ previousValue: _p, investedValue: _i, ...row }) => row)
        .sort((a, b) => b.value - a.value),
      halalScore: totalValue > 0 ? (compliantValue / totalValue) * 100 : 0,
      compliantCount,
      monitorCount: rows.length - compliantCount,
      zakat: compliantValue >= NISAB_EUR ? compliantValue * ZAKAT_RATE : 0,
      zakatableValue: compliantValue,
      nisab: NISAB_EUR,
    });
  }

  return summaries;
}

/** Identifiants des utilisateurs ayant activé le résumé quotidien. */
export async function listDailySummaryRecipients(): Promise<string[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_preferences")
    .select("user_id")
    .eq("daily_summary_enabled", true);

  if (error) {
    throw new Error(`Lecture des préférences impossible : ${error.message}`);
  }

  return (data ?? []).map((row) => row.user_id);
}
