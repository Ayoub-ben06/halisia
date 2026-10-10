import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import type { Database } from "@/types";
import { activateFreePlan, activateTrial } from "@/lib/entitlements";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { plan?: string };
  try {
    if (body.plan === "free") await activateFreePlan(user.id);
    else if (body.plan === "trial") await activateTrial(user.id);
    else return NextResponse.json({ error: "Offre invalide." }, { status: 400 });
    return NextResponse.json({ ok: true, plan: body.plan });
  } catch (error) {
    if (error instanceof Error && error.message === "TRIAL_ALREADY_USED") return NextResponse.json({ error: "Votre essai gratuit a déjà été utilisé." }, { status: 409 });
    console.error("Plan activation failed", error);
    return NextResponse.json({ error: "Impossible d’activer cette offre." }, { status: 500 });
  }
}
