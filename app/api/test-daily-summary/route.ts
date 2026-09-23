import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import { buildDailySummaries } from "@/lib/daily-summary";
import { sendDailySummary } from "@/lib/daily-summary-mail";
import type { Database } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Envoie immédiatement le rapport de clôture à l'utilisateur connecté — développement uniquement. */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Route indisponible." }, { status: 404 });
  }

  const supabase = createRouteHandlerClient<Database>({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const [summary] = await buildDailySummaries([user.id]);
    if (!summary) {
      return NextResponse.json(
        { error: "Résumé indisponible pour ce compte." },
        { status: 404 },
      );
    }

    await sendDailySummary(summary);
    console.log(`Closing summary sent to 1 user (test)`);
    return NextResponse.json({ success: true, to: summary.email, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("Test daily summary failed:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
