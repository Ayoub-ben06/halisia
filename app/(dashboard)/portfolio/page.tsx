import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchYahooPrices } from "@/lib/yahoo-prices";
import { getLivePrices } from "@/lib/live-prices";
import { halalMock } from "@/lib/halal-mock";
import { PortfolioView, type PortfolioRow } from "@/components/dashboard/portfolio-view";

export default async function PortfolioPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [assetsResult, cryptoResult, goldResult, livePrices] = await Promise.all([
    supabase.from("assets").select("*").eq("user_id", user.id),
    supabase.from("crypto_assets").select("*").eq("user_id", user.id),
    supabase.from("gold_assets").select("*").eq("user_id", user.id),
    getLivePrices(),
  ]);
  const loadError = assetsResult.error ?? cryptoResult.error ?? goldResult.error;
  if (loadError) throw new Error(`Impossible de charger le portefeuille : ${loadError.message}`);
  const assets = assetsResult.data ?? [];
  const yahooPrices = await fetchYahooPrices(assets.filter((asset) => asset.isin).map((asset) => ({
    isin: asset.isin!, ticker: asset.ticker, name: asset.name, currency: asset.currency,
  })));
  const rows: PortfolioRow[] = [
    ...assets.map((asset) => {
      const price = (asset.isin ? yahooPrices[asset.isin] : null) ?? Number(asset.current_price ?? asset.average_buy_price);
      const ticker = asset.ticker ?? asset.isin ?? "ACTIF";
      const mock = halalMock[ticker] ?? halalMock[ticker.split(".")[0]];
      const status = mock?.status ?? (/ISLAMIC/i.test(asset.name) ? "compliant" : "debated");
      return { id: asset.id, ticker: asset.ticker ?? asset.name.slice(0, 4).toUpperCase(), name: asset.name,
        type: asset.type === "etf" ? "ETF" : "Action", account: asset.account_type ?? "CTO",
        quantity: Number(asset.quantity), averagePrice: Number(asset.average_buy_price), currentPrice: price,
        status, purification: status === "compliant" ? 0 : null } satisfies PortfolioRow;
    }),
    ...(cryptoResult.data ?? []).map((asset) => ({ id: asset.id, ticker: asset.ticker, name: asset.name,
      type: "Crypto" as const, account: "Crypto", quantity: Number(asset.quantity), averagePrice: Number(asset.average_buy_price),
      currentPrice: asset.ticker === "BTC" ? (livePrices.btc_eur ?? Number(asset.current_price)) : Number(asset.current_price),
      status: (asset.halal_status === "compliant" ? "compliant" : "debated") as PortfolioRow["status"], purification: 0 })),
    ...(goldResult.data ?? []).map((asset) => ({ id: asset.id, ticker: asset.ticker, name: asset.name,
      type: "Or" as const, account: "Or", quantity: Number(asset.quantity_grams), averagePrice: Number(asset.average_buy_price_per_gram),
      currentPrice: livePrices.gold_eur_per_gram ?? Number(asset.current_price_per_gram), status: "compliant" as const, purification: 0 })),
  ];
  return <PortfolioView rows={rows} />;
}
