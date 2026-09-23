import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { Database } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json(
      { error: "Suppression de compte indisponible." },
      { status: 500 },
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Every table also cascades on auth.users deletion; explicit deletes make
  // sure data is gone even if a table was created without the foreign key.
  const failures: string[] = [];
  for (const table of [
    "watchlist_alerts",
    "watchlist",
    "transactions",
    "gold_assets",
    "crypto_assets",
    "assets",
    "compliance_changes",
    "zakat_payments",
    "user_preferences",
  ]) {
    const { error } = await admin.from(table).delete().eq("user_id", user.id);
    // A missing table (migration not applied yet) is not a failure.
    if (error && !/does not exist|schema cache/i.test(error.message)) failures.push(`${table}: ${error.message}`);
  }
  if (failures.length) {
    return NextResponse.json({ error: `Suppression incomplète des données (${failures.join("; ")}). Le compte n’a pas été supprimé.` }, { status: 500 });
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.auth.signOut();
  return NextResponse.json({ success: true });
}
