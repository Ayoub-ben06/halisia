import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyUnsubscribeToken } from "@/lib/daily-summary-token";
import { appUrl } from "@/lib/app-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lien « Se désabonner » du résumé quotidien : désactive le réglage sans connexion. */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";

  let userId: string | null = null;
  try {
    userId = verifyUnsubscribeToken(token);
  } catch {
    userId = null;
  }

  if (!userId) {
    return NextResponse.redirect(
      `${appUrl()}/settings/notifications?unsubscribe=invalid`,
    );
  }

  const { error } = await createAdminClient()
    .from("user_preferences")
    .update({ daily_summary_enabled: false })
    .eq("user_id", userId);

  if (error) {
    console.error("Unsubscribe failed:", error.message);
    return NextResponse.redirect(
      `${appUrl()}/settings/notifications?unsubscribe=error`,
    );
  }

  return NextResponse.redirect(`${appUrl()}/settings/notifications?unsubscribe=ok`);
}

export const POST = GET;
