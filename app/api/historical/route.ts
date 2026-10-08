import { NextRequest, NextResponse } from "next/server";
import { fetchYahooHistory } from "@/lib/yahoo-history";
const periodDays: Record<string, number> = { "1J": 1, "1S": 7, "1M": 30, "3M": 90, "6M": 180, "1A": 365, "5A": 1825 };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker")?.trim().toUpperCase();
  const period = request.nextUrl.searchParams.get("period") ?? "1A";
  if (!ticker || !periodDays[period]) return NextResponse.json({ error: "Ticker ou période invalide." }, { status: 400 });
  const history = await fetchYahooHistory(ticker, periodDays[period]);
  return history.length ? NextResponse.json(history) : NextResponse.json({ error: "Historique indisponible pour ce ticker." }, { status: 502 });
}
