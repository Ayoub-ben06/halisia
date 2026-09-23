import { NextResponse } from "next/server";
import { getLivePrices } from "@/lib/live-prices";
import { tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 300;

export async function GET(request: Request) {
  const limited = tooManyRequests(request, "live-prices", 120, 60_000);
  if (limited) return limited;
  const prices = await getLivePrices();
  return NextResponse.json(prices);
}
