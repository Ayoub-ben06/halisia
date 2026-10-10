import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import type { Database } from "@/types";
import { getEntitlement } from "@/lib/entitlements";

export const runtime = "nodejs";

export async function GET() {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ plan: "free", authenticated: false });
  const entitlement = await getEntitlement(user.id);
  return NextResponse.json({ plan: entitlement.plan, authenticated: true, limits: entitlement.limits });
}
