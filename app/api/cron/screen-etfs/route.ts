import { NextRequest, NextResponse } from "next/server";
import { ETF_LIST } from "@/lib/etf/etf-list";
import { screenETF } from "@/lib/etf/etf-screener";
import { saveETFScreening } from "@/lib/etf/etf-persistence";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: NextRequest) { return POST(request); }
export async function POST(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const results: Array<{ ticker: string; verdict?: string; error?: string }> = [];
  for (const etf of ETF_LIST.filter((item) => item.etf_type === "conventional")) {
    try {
      const { result, holdings } = await screenETF(etf);
      await saveETFScreening(etf, result, holdings);
      results.push({ ticker: etf.ticker, verdict: result.verdict });
    } catch (error) {
      results.push({ ticker: etf.ticker, error: error instanceof Error ? error.message : "Erreur inconnue" });
    }
  }
  return NextResponse.json({ processed: results.length, results });
}
