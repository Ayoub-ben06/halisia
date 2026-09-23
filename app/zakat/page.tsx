import { PublicFeatureShell } from "@/components/layout/PublicFeatureShell";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ZakatView, type ZakatAsset, type ZakatPayment } from "@/components/dashboard/zakat-view";
import { createClient } from "@/lib/supabase/server";
import { fetchYahooPrices } from "@/lib/yahoo-prices";
import { getLivePrices } from "@/lib/live-prices";
import { assetHalalStatus, getTickerScreenings, normalizeTicker } from "@/lib/halal-screening";
import { estimateDividendsReceived } from "@/lib/aaoifi/dividends";
import { calculatePurification } from "@/lib/aaoifi/purification";
import { displaySettings, GOLD_NISAB_GRAMS, nisabBasisOf, SILVER_NISAB_GRAMS } from "@/lib/user-preferences";

export const dynamic = "force-dynamic";

const FALLBACK_GOLD_EUR_PER_GRAM = 70;
const FALLBACK_SILVER_EUR_PER_GRAM = 0.95;

export default async function ZakatPage({
  searchParams,
}: {
  searchParams: { app?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const zakatProfile = user?.user_metadata?.zakat_profile as
    | { paymentDate?: string }
    | undefined;
  const [{ data: preferences }, paymentsResult, livePrices, display] = await Promise.all([
    user
      ? supabase.from("user_preferences").select("zakat_payment_date").eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase.from("zakat_payments").select("id, paid_at, amount, currency").eq("user_id", user.id).order("paid_at", { ascending: false })
      : Promise.resolve({ data: [] as ZakatPayment[] }),
    getLivePrices(),
    displaySettings(user),
  ]);
  const goldPerGram = livePrices.gold_eur_per_gram ?? FALLBACK_GOLD_EUR_PER_GRAM;
  const silverPerGram = livePrices.silver_eur_per_gram ?? FALLBACK_SILVER_EUR_PER_GRAM;
  const nisabBasis = nisabBasisOf(user);
  const nisab = nisabBasis === "silver" ? silverPerGram * SILVER_NISAB_GRAMS : goldPerGram * GOLD_NISAB_GRAMS;
  let rows: ZakatAsset[] = [];

  if (user) {
    const [assetsResult, cryptoResult, goldResult] = await Promise.all([
      supabase.from("assets").select("*").eq("user_id", user.id),
      supabase.from("crypto_assets").select("*").eq("user_id", user.id),
      supabase.from("gold_assets").select("*").eq("user_id", user.id),
    ]);
    const loadError = assetsResult.error ?? cryptoResult.error ?? goldResult.error;
    if (loadError) throw new Error(`Impossible de calculer la Zakat : ${loadError.message}`);
    const assets = assetsResult.data ?? [];
    const [yahoo, screenings] = await Promise.all([
      fetchYahooPrices(assets.filter((asset) => asset.isin).map((asset) => ({ isin: asset.isin!, ticker: asset.ticker, name: asset.name, currency: asset.currency }))),
      getTickerScreenings(assets.filter((asset) => asset.type === "stock" && asset.ticker).map((asset) => asset.ticker!)),
    ]);
    rows = [
      ...(await Promise.all(assets.map(async (asset) => {
        const status = assetHalalStatus(asset, screenings);
        const ratio = asset.type === "stock" && asset.ticker && status !== "non_compliant" ? screenings[normalizeTicker(asset.ticker)]?.purificationRatio ?? 0 : 0;
        const dividends = ratio > 0 ? await estimateDividendsReceived(normalizeTicker(asset.ticker!), Number(asset.quantity), asset.purchase_date) : 0;
        const category: ZakatAsset["category"] = asset.type === "etf" ? "ETF islamique" : asset.type === "crypto" ? "Crypto" : asset.type === "gold" ? "Or" : asset.type === "cash" ? "Cash" : status === "compliant" ? "Actions conformes" : "Actions à vérifier";
        return {
          id: asset.id,
          name: asset.name,
          category,
          value: Number(asset.quantity) * ((asset.isin ? yahoo[asset.isin] : null) ?? Number(asset.current_price ?? asset.average_buy_price)),
          status,
          purchaseDate: asset.purchase_date ?? asset.created_at.slice(0, 10),
          illicitRatio: ratio * 100,
          purificationAmount: dividends ? calculatePurification(ratio, dividends) : 0,
        } satisfies ZakatAsset;
      }))),
      ...(cryptoResult.data ?? []).map((asset) => ({ id: asset.id, name: asset.name, category: "Bitcoin" as const, value: Number(asset.quantity) * (asset.ticker === "BTC" ? (livePrices.btc_eur ?? Number(asset.current_price)) : Number(asset.current_price)), status: "debated" as const, purchaseDate: asset.created_at.slice(0, 10), illicitRatio: 0, purificationAmount: 0 })),
      ...(goldResult.data ?? []).map((asset) => ({ id: asset.id, name: asset.name, category: "Or" as const, value: Number(asset.quantity_grams) * goldPerGram, status: "compliant" as const, purchaseDate: asset.created_at.slice(0, 10), illicitRatio: 0, purificationAmount: 0 })),
    ];
  }

  const content = (
    <ZakatView
      assets={rows}
      nisab={nisab}
      nisabBasis={nisabBasis}
      goldPricePerGram={goldPerGram}
      silverPricePerGram={silverPerGram}
      initialPaymentDate={preferences?.zakat_payment_date ?? zakatProfile?.paymentDate ?? ""}
      initialPayments={(paymentsResult.data ?? []) as ZakatPayment[]}
      isAuthenticated={Boolean(user)}
      displayCurrency={display.currency}
      displayRate={display.rate}
    />
  );
  if (searchParams.app === "1" && user) {
    return <DashboardShell email={user.email}>{content}</DashboardShell>;
  }
  return <PublicFeatureShell>{content}</PublicFeatureShell>;
}
