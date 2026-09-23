import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { fetchYahooQuotes } from "@/lib/yahoo-quote";
import { DAILY_SUMMARY_FROM, getResend } from "@/lib/resend";

export type RunResult = {
  sent: number;
  skipped: number;
  failed: { id: string; error: string }[];
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const HAWL_DAYS = 354;
const DAY_MS = 86_400_000;

export function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ]!,
  );
}

function formatMoney(value: number, currency = "EUR") {
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export function emailShell(title: string, body: string, cta: string, href: string) {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#111412;color:#fff;font-family:Inter,Arial,sans-serif"><div style="max-width:580px;margin:0 auto;padding:40px 20px"><div style="color:#c9a84c;font-weight:700;margin-bottom:24px">HALISIA</div><div style="background:#1a1c1a;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:28px"><h1 style="font-size:24px;margin:0 0 16px">${title}</h1>${body}<a href="${href}" style="display:inline-block;margin-top:24px;padding:12px 18px;border-radius:8px;background:#c9a84c;color:#111412;text-decoration:none;font-weight:700">${cta}</a></div></div></body></html>`;
}

export async function emailForUser(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user?.email) {
    throw new Error(error?.message ?? "Aucune adresse email pour cet utilisateur");
  }
  return { email: data.user.email, metadata: data.user.user_metadata ?? {} };
}

export async function processPriceAlerts(): Promise<RunResult> {
  const admin = createAdminClient();
  const result: RunResult = { sent: 0, skipped: 0, failed: [] };
  const { data: preferences, error: preferencesError } = await admin
    .from("user_preferences")
    .select("user_id")
    .eq("price_alerts_enabled", true);

  if (preferencesError) throw new Error(preferencesError.message);
  const userIds = (preferences ?? []).map((row) => row.user_id);
  if (!userIds.length) return result;

  const { data: alerts, error: alertsError } = await admin
    .from("watchlist_alerts")
    .select("id, user_id, ticker, name, price_target")
    .in("user_id", userIds)
    .eq("alert_type", "price_target")
    .eq("is_active", true)
    .not("price_target", "is", null);

  if (alertsError) throw new Error(alertsError.message);
  const quotes = await fetchYahooQuotes(
    Array.from(new Set((alerts ?? []).map((alert) => alert.ticker))),
  );

  for (const alert of alerts ?? []) {
    const target = Number(alert.price_target);
    const quote = quotes[alert.ticker];
    if (quote?.price == null || quote.price > target) {
      result.skipped += 1;
      continue;
    }

    try {
      const { email } = await emailForUser(alert.user_id);
      const name = escapeHtml(alert.name);
      const ticker = escapeHtml(alert.ticker);
      const currency = quote.currency ?? "EUR";
      const { error } = await getResend().emails.send({
        from: DAILY_SUMMARY_FROM,
        to: email,
        subject: `Objectif atteint : ${alert.name}`,
        html: emailShell(
          `Votre objectif sur ${name} est atteint`,
          `<p style="color:#b8b4aa;line-height:1.6">${name} (${ticker}) cote désormais <strong style="color:#10b981">${formatMoney(quote.price, currency)}</strong>, soit sous votre objectif de ${formatMoney(target, currency)}.</p><p style="color:#8f8878;font-size:13px">Cette alerte a été automatiquement désactivée pour éviter les emails répétés.</p>`,
          "Voir ma watchlist",
          `${APP_URL}/watchlist`,
        ),
      });
      if (error) throw new Error(error.message);

      const { error: updateError } = await admin
        .from("watchlist_alerts")
        .update({ is_active: false, last_triggered_at: new Date().toISOString() })
        .eq("id", alert.id);
      if (updateError) throw new Error(updateError.message);
      result.sent += 1;
    } catch (error) {
      result.failed.push({
        id: alert.id,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      });
    }
  }
  return result;
}

function nextHawlDate(startDate: string, now: Date) {
  const start = new Date(`${startDate}T12:00:00Z`);
  if (Number.isNaN(start.getTime())) return null;
  const elapsed = Math.max(0, now.getTime() - start.getTime());
  const periods = Math.max(1, Math.ceil(elapsed / (HAWL_DAYS * DAY_MS)));
  return new Date(start.getTime() + periods * HAWL_DAYS * DAY_MS);
}

function nextAnnualPaymentDate(paymentDate: string, now: Date) {
  const configured = new Date(`${paymentDate}T12:00:00Z`);
  if (Number.isNaN(configured.getTime())) return null;
  let dueDate = new Date(
    Date.UTC(now.getUTCFullYear(), configured.getUTCMonth(), configured.getUTCDate(), 12),
  );
  if (dueDate.getTime() < now.getTime()) {
    dueDate = new Date(
      Date.UTC(now.getUTCFullYear() + 1, configured.getUTCMonth(), configured.getUTCDate(), 12),
    );
  }
  return dueDate;
}

export async function processAnnualZakatReminders(
  now = new Date(),
): Promise<RunResult> {
  const admin = createAdminClient();
  const result: RunResult = { sent: 0, skipped: 0, failed: [] };
  const { data: preferences, error } = await admin
    .from("user_preferences")
    .select("user_id, zakat_reminder_last_sent_for, zakat_payment_date")
    .eq("annual_zakat_reminder_enabled", true);
  if (error) throw new Error(error.message);

  for (const preference of preferences ?? []) {
    try {
      const { email, metadata } = await emailForUser(preference.user_id);
      const paymentDate = preference.zakat_payment_date ?? metadata.zakat_profile?.paymentDate;
      const startDate = metadata.zakat_profile?.startDate;
      if (typeof paymentDate !== "string" && typeof startDate !== "string") {
        result.skipped += 1;
        continue;
      }
      const dueDate =
        typeof paymentDate === "string"
          ? nextAnnualPaymentDate(paymentDate, now)
          : nextHawlDate(startDate, now);
      if (!dueDate) {
        result.skipped += 1;
        continue;
      }
      const dueKey = dueDate.toISOString().slice(0, 10);
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / DAY_MS);
      if (
        daysUntilDue < 0 ||
        daysUntilDue > 7 ||
        preference.zakat_reminder_last_sent_for === dueKey
      ) {
        result.skipped += 1;
        continue;
      }

      const formattedDate = new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "long",
        timeZone: "UTC",
      }).format(dueDate);
      const { error: sendError } = await getResend().emails.send({
        from: DAILY_SUMMARY_FROM,
        to: email,
        subject: "Votre échéance annuelle de Zakat approche",
        html: emailShell(
          "Votre Hawl arrive à échéance",
          `<p style="color:#b8b4aa;line-height:1.6">Votre échéance annuelle est prévue le <strong style="color:#c9a84c">${formattedDate}</strong>. Vous pouvez dès maintenant vérifier votre patrimoine zakatable et préparer votre calcul.</p>`,
          "Calculer ma Zakat",
          `${APP_URL}/zakat`,
        ),
      });
      if (sendError) throw new Error(sendError.message);

      const { error: updateError } = await admin
        .from("user_preferences")
        .update({ zakat_reminder_last_sent_for: dueKey })
        .eq("user_id", preference.user_id);
      if (updateError) throw new Error(updateError.message);
      result.sent += 1;
    } catch (caught) {
      result.failed.push({
        id: preference.user_id,
        error: caught instanceof Error ? caught.message : "Erreur inconnue",
      });
    }
  }
  return result;
}
