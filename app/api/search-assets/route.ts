import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type YahooQuote = {
  symbol?: unknown;
  shortname?: unknown;
  longname?: unknown;
  exchDisp?: unknown;
  exchange?: unknown;
  quoteType?: unknown;
};

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

function cleanQuotes(quotes: YahooQuote[]) {
  return quotes
    .filter((quote) => typeof quote.symbol === "string")
    .map((quote) => ({
      ticker: String(quote.symbol),
      name:
        typeof quote.shortname === "string"
          ? quote.shortname
          : typeof quote.longname === "string"
            ? quote.longname
            : String(quote.symbol),
      exchange:
        typeof quote.exchDisp === "string"
          ? quote.exchDisp
          : typeof quote.exchange === "string"
            ? quote.exchange
            : "",
      type: typeof quote.quoteType === "string" ? quote.quoteType : "",
    }))
    .slice(0, 8);
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) return NextResponse.json([]);

  try {
    const url = new URL("https://query1.finance.yahoo.com/v1/finance/search");
    url.searchParams.set("q", query);
    url.searchParams.set("lang", "fr-FR");
    url.searchParams.set("region", "FR");
    url.searchParams.set("quotesCount", "8");
    url.searchParams.set("newsCount", "0");

    const response = await fetch(url, { next: { revalidate: 60 } });
    if (!response.ok) throw new Error(`Yahoo HTTP ${response.status}`);
    const data = (await response.json()) as { quotes?: YahooQuote[] };
    return NextResponse.json(cleanQuotes(data.quotes ?? []));
  } catch {
    try {
      const data = await yahooFinance.search(query, { quotesCount: 8, newsCount: 0 });
      return NextResponse.json(cleanQuotes(data.quotes as YahooQuote[]));
    } catch {
      return NextResponse.json([], { status: 200 });
    }
  }
}
