import { NextRequest, NextResponse } from "next/server";
import { buildDailySummaries, listDailySummaryRecipients } from "@/lib/daily-summary";
import { sendDailySummary } from "@/lib/daily-summary-mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel Cron calls GET with `Authorization: Bearer $CRON_SECRET`; the
// Supabase pg_cron script calls POST with the same header.
export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET n’est pas configuré." },
      { status: 500 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    const recipients = await listDailySummaryRecipients();
    const summaries = await buildDailySummaries(recipients);
    const date = new Date();

    let sent = 0;
    const failed: { userId: string; error: string }[] = [];

    // Un échec ne doit pas interrompre l'envoi aux autres utilisateurs.
    for (const summary of summaries) {
      try {
        await sendDailySummary(summary, date);
        sent += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erreur inconnue";
        failed.push({ userId: summary.userId, error: message });
        console.error(`Daily summary failed for ${summary.userId}:`, message);
      }
    }

    console.log(`Daily summary sent to ${sent} users`);
    return NextResponse.json({ success: true, sent, failed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("Daily summary run failed:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
