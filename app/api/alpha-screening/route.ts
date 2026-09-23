import { NextResponse } from "next/server";
import { getScreeningResult } from "@/lib/halal-screening";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const TICKER_PATTERN = /^[A-Za-z0-9.\-=^]{1,24}$/;
const TEN_MINUTES = 10 * 60 * 1000;

class RateLimitedError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super("Trop d’analyses demandées. Réessayez dans quelques minutes.");
  }
}

export async function POST(request: Request) {
  const { ticker } = (await request.json().catch(() => ({}))) as { ticker?: string };
  const symbol = ticker?.trim();
  if (!symbol) return NextResponse.json({ error: "Ticker manquant." }, { status: 400 });
  if (!TICKER_PATTERN.test(symbol)) return NextResponse.json({ error: "Ticker invalide." }, { status: 400 });

  const ip = clientIp(request);
  const requests = rateLimit(`screening:${ip}`, 60, TEN_MINUTES);
  if (!requests.allowed) return NextResponse.json({ error: "Trop de requêtes. Réessayez dans quelques minutes." }, { status: 429, headers: { "Retry-After": String(requests.retryAfterSeconds) } });

  try {
    // Cached results are free; only new analyses (SEC + Yahoo downloads) are capped.
    const { result } = await getScreeningResult(symbol, {
      beforeCompute: () => {
        const computations = rateLimit(`screening-compute:${ip}`, 15, TEN_MINUTES);
        if (!computations.allowed) throw new RateLimitedError(computations.retryAfterSeconds);
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RateLimitedError) return NextResponse.json({ error: error.message }, { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Impossible de récupérer les données financières pour cette entreprise." }, { status: 502 });
  }
}
