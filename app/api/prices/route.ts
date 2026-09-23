import { NextResponse } from "next/server";
import { fetchYahooPrices, type YahooPriceAsset } from "@/lib/yahoo-prices";
import { tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = tooManyRequests(request, "prices", 120, 60_000);
  if (limited) return limited;
  try {
    const body = (await request.json()) as {
      assets?: YahooPriceAsset[];
      isins?: string[];
      tickers?: string[];
    };
    const stringIdentifiers = [...(body.isins ?? []), ...(body.tickers ?? [])]
      .filter((identifier): identifier is string => typeof identifier === "string")
      .map((identifier) => ({ isin: identifier.trim() }));
    const requestedAssets = Array.isArray(body.assets) ? body.assets : stringIdentifiers;

    if (requestedAssets.length === 0) {
      return NextResponse.json(
        { error: "Le champ assets doit contenir une liste d'ISIN ou de tickers." },
        { status: 400 },
      );
    }

    const assets = requestedAssets
      .filter((asset) => typeof asset?.isin === "string" && asset.isin.trim())
      .slice(0, 50);
    const prices = await fetchYahooPrices(assets);

    return NextResponse.json(prices, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
}
