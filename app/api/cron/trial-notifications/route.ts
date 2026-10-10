import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DAILY_SUMMARY_FROM, getResend } from "@/lib/resend";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const admin = createAdminClient();
  const now = new Date();
  const reminderLimit = new Date(now.getTime() + 2 * 86400000);
  const { data: trials, error } = await admin.from("user_entitlements").select("user_id,trial_ends_at,trial_reminder_sent_at,trial_expired_sent_at").not("trial_ends_at", "is", null).or(`trial_ends_at.lte.${reminderLimit.toISOString()},trial_ends_at.lte.${now.toISOString()}`);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  let sent = 0;
  for (const trial of trials ?? []) {
    const endsAt = trial.trial_ends_at ? new Date(trial.trial_ends_at) : null;
    if (!endsAt) continue;
    const expired = endsAt.getTime() <= now.getTime();
    const alreadySent = expired ? trial.trial_expired_sent_at : trial.trial_reminder_sent_at;
    if (alreadySent) continue;
    const { data: authUser } = await admin.auth.admin.getUserById(trial.user_id);
    const email = authUser.user?.email;
    if (!email) continue;
    const subject = expired ? "Votre essai Premium Halisia est terminé" : "Votre essai Premium Halisia se termine bientôt";
    const text = expired
      ? "Votre essai Premium est terminé. Vos données sont conservées ; passez Premium pour retrouver toutes les fonctionnalités."
      : `Votre essai Premium se termine le ${endsAt.toLocaleDateString("fr-FR")}. Aucune carte bancaire ne sera débitée automatiquement.`;
    try {
      await getResend().emails.send({ from: DAILY_SUMMARY_FROM, to: email, subject, html: `<p>${text}</p><p><a href="${(process.env.NEXT_PUBLIC_APP_URL ?? "https://halisia.app").replace(/\/$/, "")}/tarifs">Voir les tarifs</a></p>` });
      await admin.from("user_entitlements").update(expired ? { trial_expired_sent_at: now.toISOString() } : { trial_reminder_sent_at: now.toISOString() }).eq("user_id", trial.user_id);
      sent += 1;
    } catch (sendError) { console.error("Trial notification failed", sendError); }
  }
  return NextResponse.json({ processed: trials?.length ?? 0, sent });
}
