import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { getTickerScreenings } from "@/lib/halal-screening";
import { rateLimit } from "@/lib/rate-limit";
import type { Database } from "@/types";

export const runtime = "nodejs";

const MAX_TICKERS = 25;

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });

  const limit = rateLimit(`halal-status:${user.id}`, 30, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Trop de requêtes, réessayez dans un instant." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });

  const body = (await request.json().catch(() => ({}))) as { tickers?: unknown };
  const tickers = Array.isArray(body.tickers) ? body.tickers.filter((ticker): ticker is string => typeof ticker === "string" && ticker.trim().length > 0 && ticker.length <= 24).slice(0, MAX_TICKERS) : [];
  if (!tickers.length) return NextResponse.json({});

  const screenings = await getTickerScreenings(tickers, 3);
  return NextResponse.json(Object.fromEntries(Object.entries(screenings).map(([ticker, screening]) => [ticker, { status: screening.status, reason: screening.reason }])));
}
