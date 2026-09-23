import { NextRequest, NextResponse } from "next/server";
import { fetchYahooQuote } from "@/lib/yahoo-quote";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker")?.trim();
  if (!ticker) {
    return NextResponse.json({ error: "Le paramètre ticker est requis." }, { status: 400 });
  }

  const quote = await fetchYahooQuote(ticker);
  return NextResponse.json(quote, { headers: { "Cache-Control": "no-store" } });
}
