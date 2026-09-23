import "server-only";

import type { User } from "@supabase/supabase-js";
import { getFxRate } from "@/lib/aaoifi/fx";

export type DisplayCurrency = "EUR" | "USD" | "GBP";
export type NisabBasis = "gold" | "silver";

export const GOLD_NISAB_GRAMS = 85;
export const SILVER_NISAB_GRAMS = 595;

type StoredPreferences = { currency?: string; madhhab?: string };

function stored(user: User | null | undefined): StoredPreferences {
  return (user?.user_metadata?.preferences ?? {}) as StoredPreferences;
}

export function displayCurrencyOf(user: User | null | undefined): DisplayCurrency {
  const currency = stored(user).currency;
  return currency === "USD" || currency === "GBP" ? currency : "EUR";
}

/** Hanafi school uses the silver nisab; the other schools (and AAOIFI) use gold. */
export function nisabBasisOf(user: User | null | undefined): NisabBasis {
  return stored(user).madhhab === "hanafi" ? "silver" : "gold";
}

/**
 * Display currency and the EUR→currency rate. Amounts are stored in euros;
 * without a rate the app keeps displaying euros rather than wrong figures.
 */
export async function displaySettings(user: User | null | undefined): Promise<{ currency: DisplayCurrency; rate: number }> {
  const currency = displayCurrencyOf(user);
  if (currency === "EUR") return { currency, rate: 1 };
  const rate = await getFxRate("EUR", currency);
  return rate ? { currency, rate } : { currency: "EUR", rate: 1 };
}
