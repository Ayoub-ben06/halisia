import { NextResponse } from "next/server";
import { getLivePrices } from "@/lib/live-prices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 300;

export async function GET() {
  const prices = await getLivePrices();
  return NextResponse.json(prices);
}
