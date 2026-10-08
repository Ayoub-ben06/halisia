import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findETF, isETFScreeningStale, screenETF } from "@/lib/etf/etf-screener";
import { saveETFScreening } from "@/lib/etf/etf-persistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  let body: { ticker?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON invalide." }, { status: 400 }); }
  const etf = body.ticker ? findETF(body.ticker) : null;
  if (!etf) return NextResponse.json({ error: "ETF non référencé." }, { status: 404 });
  const supabase = createClient();
  const { data: cached, error } = await supabase.from("etf_screening").select("*").eq("ticker", etf.ticker).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (cached && !isETFScreeningStale(cached.last_updated)) return NextResponse.json(cached);
  try {
    const { result, holdings } = await screenETF(etf);
    const saved = await saveETFScreening(etf, result, holdings);
    return NextResponse.json(saved);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Screening ETF impossible." }, { status: 502 });
  }
}
