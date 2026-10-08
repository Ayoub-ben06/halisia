import { NextRequest, NextResponse } from "next/server";
import {
  processAnnualZakatReminders,
  processPriceAlerts,
} from "@/lib/event-notifications";
import {
  processComplianceReminders,
  processComplianceScreening,
} from "@/lib/compliance-tracker";
import { reportError, reportFailures } from "@/lib/monitoring";

// Reminders run before screening so that a case opened in this run is not
// picked up again as "not yet notified" by a concurrent reminder pass.
async function processCompliance() {
  const reminders = await processComplianceReminders();
  const screening = await processComplianceScreening();
  return { reminders, screening };
}

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
    const [priceAlerts, zakatReminders, compliance] = await Promise.all([
      processPriceAlerts(),
      processAnnualZakatReminders(),
      processCompliance().catch((error: unknown) => {
        reportError(error, "cron:compliance");
        return { error: error instanceof Error ? error.message : "Erreur inconnue" };
      }),
    ]);
    reportFailures("cron:price-alerts", priceAlerts.failed);
    reportFailures("cron:zakat-reminders", zakatReminders.failed);
    if ("reminders" in compliance) {
      reportFailures("cron:compliance-reminders", compliance.reminders.failed);
      reportFailures("cron:compliance-screening", compliance.screening.failed);
    }
    return NextResponse.json({ success: true, priceAlerts, zakatReminders, compliance });
  } catch (error) {
    reportError(error, "cron:process-notifications");
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
