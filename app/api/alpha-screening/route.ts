import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { runAAOIFI } from "@/lib/aaoifi/engine";
import { getFinancialData } from "@/lib/aaoifi/data-provider";
import type { FinancialValue } from "@/lib/aaoifi/types";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export async function POST(request: Request) {
  const { ticker } = (await request.json()) as { ticker?: string };
  if (!ticker?.trim()) {
    return NextResponse.json({ error: "Ticker manquant." }, { status: 400 });
  }
  try {
    const data = await getFinancialData(ticker);
    try {
      const quote = await yahooFinance.quote(data.ticker);
      if (!data.marketCapitalization && typeof quote.marketCap === "number") {
        const marketCap: FinancialValue = { value: quote.marketCap, currency: typeof quote.currency === "string" ? quote.currency : "USD", source: { provider: "Yahoo Finance", fiscalPeriod: data.fiscalPeriod, field: "marketCap" }, confidence: "MEDIUM" };
        data.marketCapitalization = marketCap;
      } else if (!data.marketCapitalization) data.limitations.push("La capitalisation boursière Yahoo Finance est indisponible.");
    } catch { data.limitations.push("La capitalisation boursière Yahoo Finance n’a pas pu être récupérée."); }
    return NextResponse.json(runAAOIFI(data));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Impossible de récupérer les données SEC/XBRL pour cette entreprise." }, { status: 502 });
  }
}
