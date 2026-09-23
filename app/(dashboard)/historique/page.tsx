import { redirect } from "next/navigation";
import { HistoryView, type HistoryTransaction } from "@/components/dashboard/history-view";
import { createClient } from "@/lib/supabase/server";
import { displaySettings } from "@/lib/user-preferences";

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

  // Realized gains use the weighted average cost of earlier buys of the same asset.
  const book = new Map<string, { quantity: number; cost: number }>();
  const transactions: HistoryTransaction[] = (data ?? []).map((row) => {
    const quantity = Number(row.quantity);
    const price = Number(row.price_eur);
    const total = Number(row.amount_eur);
    const side = row.side === "sell" ? "sell" : "buy";
    const position = book.get(row.asset_ticker) ?? { quantity: 0, cost: 0 };
    let gain: number | undefined;
    let gainPercent: number | undefined;
    if (side === "buy") {
      position.quantity += quantity;
      position.cost += total + Number(row.fee_eur ?? 0);
    } else if (position.quantity > 0) {
      const averageCost = position.cost / position.quantity;
      const soldQuantity = Math.min(quantity, position.quantity);
      gain = (price - averageCost) * soldQuantity;
      gainPercent = averageCost ? ((price - averageCost) / averageCost) * 100 : undefined;
      position.quantity -= soldQuantity;
      position.cost -= averageCost * soldQuantity;
    }
    book.set(row.asset_ticker, position);
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
