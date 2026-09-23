"use client";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types";

export type PositionSource = "assets" | "crypto_assets" | "gold_assets";
export type AssetClass = Database["public"]["Tables"]["transactions"]["Row"]["asset_class"];
export type PositionRef = { id: string; source: PositionSource; name: string; ticker: string; assetClass: AssetClass; account?: string | null };

type TransactionInput = { position: Pick<PositionRef, "name" | "ticker" | "assetClass" | "account">; side: "buy" | "sell"; quantity: number; price: number; date: string; broker?: string };

async function currentUserId() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Session expirée. Veuillez vous reconnecter.");
  return { supabase, userId: user.id };
}

function quantityColumns(source: PositionSource, quantity: number, averagePrice: number) {
  if (source === "gold_assets") return { quantity_grams: quantity, average_buy_price_per_gram: averagePrice, total_invested: quantity * averagePrice };
  if (source === "crypto_assets") return { quantity, average_buy_price: averagePrice, total_invested: quantity * averagePrice };
  return { quantity, average_buy_price: averagePrice };
}

/**
 * Adds a line to the transaction history. History is informative: a failure
 * (e.g. before the 20260924 migration widened the table) never blocks the
 * position change it documents.
 */
export async function recordTransaction(input: TransactionInput): Promise<boolean> {
  try {
    const { supabase, userId } = await currentUserId();
    const { error } = await supabase.from("transactions").insert({
      user_id: userId,
      asset_name: input.position.name,
      asset_ticker: input.position.ticker,
      asset_class: input.position.assetClass,
      side: input.side,
      account_type: input.position.account ?? null,
      transaction_date: new Date(`${input.date}T12:00:00Z`).toISOString(),
      quantity: input.quantity,
      price_eur: input.price,
      amount_eur: input.quantity * input.price,
      broker: input.broker ?? "manuel",
    });
    return !error;
  } catch {
    return false;
  }
}

// Without an UPDATE/DELETE RLS policy Supabase silently affects zero rows, so
// the returned rows are checked to surface the missing permission.
const PERMISSION_MESSAGE = "Modification refusée par la base de données : la migration du 24/09/2026 (droits de modification et de suppression) doit être appliquée.";

export async function updatePosition(position: PositionRef, quantity: number, averagePrice: number) {
  const { supabase } = await currentUserId();
  const { data, error } = await supabase.from(position.source).update(quantityColumns(position.source, quantity, averagePrice)).eq("id", position.id).select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error(PERMISSION_MESSAGE);
}

/** Sells part or all of a position: the remaining quantity keeps its average price. */
export async function sellPosition(position: PositionRef, heldQuantity: number, averagePrice: number, soldQuantity: number, salePrice: number, date: string) {
  const remaining = heldQuantity - soldQuantity;
  if (remaining < -1e-9) throw new Error("La quantité vendue dépasse la quantité détenue.");
  if (remaining <= 1e-9) await deletePosition(position);
  else await updatePosition(position, remaining, averagePrice);
  await recordTransaction({ position, side: "sell", quantity: soldQuantity, price: salePrice, date });
}

export async function deletePosition(position: PositionRef) {
  const { supabase } = await currentUserId();
  const { data, error } = await supabase.from(position.source).delete().eq("id", position.id).select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error(PERMISSION_MESSAGE);
}
