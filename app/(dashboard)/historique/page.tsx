import { redirect } from "next/navigation";
import { HistoryView, type HistoryTransaction } from "@/components/dashboard/history-view";
import { createClient } from "@/lib/supabase/server";
import { displaySettings } from "@/lib/user-preferences";
import { realizedGains } from "@/lib/transactions";

export const dynamic = "force-dynamic";

export default async function HistoriquePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data, error }, display] = await Promise.all([
    supabase.from("transactions").select("*").eq("user_id", user.id).order("transaction_date", { ascending: true }),
    displaySettings(user),
  ]);
  if (error) throw new Error(`Impossible de charger l’historique : ${error.message}`);

  const rows = data ?? [];
  const gains = realizedGains(rows.map((row) => ({
    ticker: row.asset_ticker,
    side: row.side === "sell" ? "sell" : "buy",
    quantity: Number(row.quantity),
    price: Number(row.price_eur),
    amount: Number(row.amount_eur),
    fee: Number(row.fee_eur ?? 0),
  })));
  const transactions: HistoryTransaction[] = rows.map((row, index) => {
    const quantity = Number(row.quantity);
    const price = Number(row.price_eur);
    const total = Number(row.amount_eur);
    const side = row.side === "sell" ? "sell" : "buy";
    const { gain, gainPercent } = gains[index];
    const assetClass = row.asset_class;
    return {
      id: row.id,
      date: row.transaction_date,
      name: row.asset_name,
      ticker: row.asset_ticker,
      assetClass,
      type: side === "sell" ? "Vente" : "Achat",
      account: row.account_type ?? (assetClass === "crypto" || assetClass === "gold" ? "Crypto" : "Autre"),
      quantity,
      unit: assetClass === "gold" ? "g" : assetClass === "crypto" ? row.asset_ticker : "",
      unitPrice: price,
      total,
      gain,
      gainPercent,
      broker: row.broker,
    } satisfies HistoryTransaction;
  });

  return <HistoryView transactions={transactions.reverse()} displayCurrency={display.currency} displayRate={display.rate} />;
}
