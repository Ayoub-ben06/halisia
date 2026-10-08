// Reports which recent migrations are applied, using the service role key.
// Usage: npx tsx scripts/check-migrations.ts
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

const checks: { migration: string; table: string; column: string }[] = [
  { migration: "20260923000000_create_compliance_tracking", table: "screening_cache", column: "status" },
  { migration: "20260923000000_create_compliance_tracking", table: "compliance_changes", column: "day_90_deadline" },
  { migration: "20260924000000_positions_history_and_screening_cache", table: "screening_cache", column: "result" },
  { migration: "20260924000000_positions_history_and_screening_cache", table: "transactions", column: "side" },
  { migration: "20260924000000_positions_history_and_screening_cache", table: "zakat_payments", column: "amount" },
  { migration: "20260924000001_compliance_alerts_preference", table: "user_preferences", column: "compliance_alerts_enabled" },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.");
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const missing = new Set<string>();
  for (const check of checks) {
    const { error } = await supabase.from(check.table).select(check.column).limit(1);
    const ok = !error;
    if (!ok) missing.add(check.migration);
    console.log(`${ok ? "✅" : "❌"} ${check.table}.${check.column}${ok ? "" : ` — ${error.message}`}`);
  }
  console.log(missing.size
    ? `\nÀ appliquer : ${Array.from(missing).join(", ")}\nCollez supabase/pending-migrations.sql dans l'éditeur SQL Supabase (réexécutable sans risque).`
    : "\nToutes les migrations récentes sont appliquées.");
  // Row-level security policies cannot be read through the REST API; they are
  // part of the same files, so a present column implies its policies too.
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
