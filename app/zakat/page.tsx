import { PublicFeatureShell } from "@/components/layout/PublicFeatureShell";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ZakatView, type ZakatAsset } from "@/components/dashboard/zakat-view";
import { createClient } from "@/lib/supabase/server";
import { fetchYahooPrices } from "@/lib/yahoo-prices";
import { getLivePrices } from "@/lib/live-prices";
import { halalMock } from "@/lib/halal-mock";

export const dynamic = "force-dynamic";

export default async function ZakatPage({
  searchParams,
}: {
  searchParams: { app?: string };
}) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  const zakatProfile = user?.user_metadata?.zakat_profile as
    | { paymentDate?: string }
    | undefined;
  const { data: preferences } = user
    ? await supabase
        .from("user_preferences")
        .select("zakat_payment_date")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };
  const livePrices = await getLivePrices();
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
    const yahoo = await fetchYahooPrices(assets.filter((asset) => asset.isin).map((asset) => ({ isin: asset.isin!, ticker: asset.ticker, name: asset.name, currency: asset.currency })));
    rows = [
      ...assets.map((asset) => {
        const ticker = asset.ticker ?? asset.isin ?? "ACTIF";
        const mock = halalMock[ticker] ?? halalMock[ticker.split(".")[0]];
        const status = asset.halal_status !== "unknown" ? asset.halal_status : mock?.status ?? (/ISLAMIC/i.test(asset.name) ? "compliant" : "unknown");
        const ratio = Number(mock?.illicitRevenue?.replace(/[^0-9,.]/g, "").replace(",", ".")) || 0;
        return { id: asset.id, name: asset.name, category: asset.type === "etf" ? "ETF islamique" : asset.type === "crypto" ? "Crypto" : asset.type === "gold" ? "Or" : asset.type === "cash" ? "Cash" : status === "compliant" ? "Actions conformes" : "Actions à vérifier", value: Number(asset.quantity) * ((asset.isin ? yahoo[asset.isin] : null) ?? Number(asset.current_price ?? asset.average_buy_price)), status, purchaseDate: asset.purchase_date ?? asset.created_at.slice(0, 10), illicitRatio: ratio } satisfies ZakatAsset;
      }),
      ...(cryptoResult.data ?? []).map((asset) => ({ id: asset.id, name: asset.name, category: "Bitcoin" as const, value: Number(asset.quantity) * (asset.ticker === "BTC" ? (livePrices.btc_eur ?? Number(asset.current_price)) : Number(asset.current_price)), status: asset.halal_status === "compliant" ? "compliant" as const : "debated" as const, purchaseDate: asset.created_at.slice(0, 10), illicitRatio: 0 })),
      ...(goldResult.data ?? []).map((asset) => ({ id: asset.id, name: asset.name, category: "Or" as const, value: Number(asset.quantity_grams) * (livePrices.gold_eur_per_gram ?? Number(asset.current_price_per_gram)), status: "compliant" as const, purchaseDate: asset.created_at.slice(0, 10), illicitRatio: 0 })),
    ];
  }

  const content = (
    <ZakatView
      assets={rows}
      nisab={(livePrices.gold_eur_per_gram ?? 70) * 85}
      initialPaymentDate={preferences?.zakat_payment_date ?? zakatProfile?.paymentDate ?? ""}
      isAuthenticated={Boolean(user)}
    />
  );
  if (searchParams.app === "1" && user) {
    return <DashboardShell email={user.email}>{content}</DashboardShell>;
  }
  return <PublicFeatureShell>{content}</PublicFeatureShell>;
}
