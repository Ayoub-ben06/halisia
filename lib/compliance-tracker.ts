import "server-only";

import { getFinancialData } from "@/lib/aaoifi/data-provider";
import { runAAOIFI } from "@/lib/aaoifi/engine";
import type { ScreeningStatus } from "@/lib/aaoifi/types";
import { emailForUser, emailShell, escapeHtml, type RunResult } from "@/lib/event-notifications";
import { writeCache } from "@/lib/halal-screening";
import { DAILY_SUMMARY_FROM, getResend } from "@/lib/resend";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types";

type ComplianceChange = Database["public"]["Tables"]["compliance_changes"]["Row"];
type Holding = { user_id: string; ticker: string; isin: string | null; name: string };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const DAY_MS = 86_400_000;
const RESCREEN_AFTER_MS = 20 * 60 * 60 * 1000;
const DEFAULT_TIME_BUDGET_MS = 40_000;
// REVIEW_REQUIRED is shown as "douteux" in the app, so it is tracked like DOUBTFUL.
const TRACKED_PREVIOUS_STATUSES = new Set<string>(["COMPLIANT", "DOUBTFUL", "REVIEW_REQUIRED"]);
const RESTORED_STATUSES = new Set<string>(["COMPLIANT", "DOUBTFUL"]);

function normalizeTicker(ticker: string) {
  return ticker.trim().toUpperCase();
}

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" }).format(new Date(value));
}

function daysLeft(deadline: string, now: Date) {
  return Math.max(0, Math.ceil((new Date(deadline).getTime() - now.getTime()) / DAY_MS));
}

async function sendComplianceEmail(userId: string, subject: string, title: string, body: string) {
  const { email } = await emailForUser(userId);
  const { error } = await getResend().emails.send({
    from: DAILY_SUMMARY_FROM,
    to: email,
    subject,
    html: emailShell(title, body, "Voir mon portefeuille", `${APP_URL}/portfolio`),
  });
  if (error) throw new Error(error.message);
}

async function sendNonComplianceNotice(change: Pick<ComplianceChange, "id" | "user_id" | "ticker" | "name" | "day_90_deadline">) {
  const safeTicker = escapeHtml(change.ticker);
  const safeName = escapeHtml(change.name ?? change.ticker);
  await sendComplianceEmail(
    change.user_id,
    `⚠️ ${change.ticker} n'est plus conforme — action requise sous 90 jours`,
    `${safeName} (${safeTicker}) n'est plus conforme`,
    `<p style="color:#b8b4aa;line-height:1.6">Selon les critères AAOIFI, vous avez :</p><ul style="color:#b8b4aa;line-height:1.8"><li>30 jours pour attendre un retour à la conformité</li><li>Si toujours non conforme après 30 jours : 60 jours pour vendre</li><li>Date limite de vente : <strong style="color:#ef4444">${change.day_90_deadline ? formatDate(change.day_90_deadline) : "—"}</strong></li></ul>`,
  );
  const { error } = await createAdminClient().from("compliance_changes").update({ notified_at: new Date().toISOString() }).eq("id", change.id);
  if (error) throw new Error(error.message);
}

async function loadStockHoldings(): Promise<Holding[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("assets")
    .select("user_id, ticker, isin, name")
    .eq("type", "stock")
    .not("ticker", "is", null);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({ ...row, ticker: normalizeTicker(row.ticker!) }));
}

async function openComplianceChanges(ticker: string, previousStatus: string, newStatus: ScreeningStatus, holders: Holding[], now: Date, result: RunResult) {
  const admin = createAdminClient();
  const seen = new Set<string>();
  for (const holder of holders) {
    if (seen.has(holder.user_id)) continue;
    seen.add(holder.user_id);
    try {
      const { data: existing, error: existingError } = await admin
        .from("compliance_changes")
        .select("id")
        .eq("user_id", holder.user_id)
        .eq("ticker", ticker)
        .eq("resolved", false)
        .maybeSingle();
      if (existingError) throw new Error(existingError.message);
      if (existing) {
        result.skipped += 1;
        continue;
      }
      const day30 = new Date(now.getTime() + 30 * DAY_MS).toISOString();
      const day90 = new Date(now.getTime() + 90 * DAY_MS).toISOString();
      const { data: inserted, error: insertError } = await admin
        .from("compliance_changes")
        .insert({ user_id: holder.user_id, ticker, isin: holder.isin, name: holder.name, previous_status: previousStatus, new_status: newStatus, change_date: now.toISOString(), day_30_deadline: day30, day_90_deadline: day90 })
        .select("id, user_id, ticker, name, day_90_deadline")
        .single();
      if (insertError) throw new Error(insertError.message);
      await sendNonComplianceNotice(inserted);
      result.sent += 1;
    } catch (error) {
      result.failed.push({ id: `${holder.user_id}:${ticker}`, error: error instanceof Error ? error.message : "Erreur inconnue" });
    }
  }
}

async function resolveComplianceChanges(filter: { ticker: string; userId?: string }, resolution: "sold" | "restored_compliant", now: Date) {
  const admin = createAdminClient();
  let query = admin
    .from("compliance_changes")
    .update({ resolved: true, resolution, resolved_at: now.toISOString() })
    .eq("ticker", filter.ticker)
    .eq("resolved", false);
  if (filter.userId) query = query.eq("user_id", filter.userId);
  const { error } = await query;
  if (error) throw new Error(error.message);
}

/**
 * Re-screens a batch of held tickers (oldest first) and opens a 90-day
 * compliance case for every holder when a ticker becomes NON_COMPLIANT.
 */
export async function processComplianceScreening(now = new Date(), timeBudgetMs = DEFAULT_TIME_BUDGET_MS): Promise<RunResult> {
  const deadline = Date.now() + timeBudgetMs;
  const admin = createAdminClient();
  const result: RunResult = { sent: 0, skipped: 0, failed: [] };
  const holdings = await loadStockHoldings();
  // Watchlist tickers are refreshed too so the watchlist shows current
  // statuses; compliance cases are only opened for actual holders.
  const { data: watched } = await admin.from("watchlist").select("ticker");
  const tickers = Array.from(new Set([...holdings.map((holding) => holding.ticker), ...(watched ?? []).map((row) => normalizeTicker(row.ticker))]));
  if (!tickers.length) return result;

  const { data: cacheRows, error: cacheError } = await admin.from("screening_cache").select("*").in("ticker", tickers);
  if (cacheError) throw new Error(cacheError.message);
  const cache = new Map((cacheRows ?? []).map((row) => [row.ticker, row]));
  const due = tickers
    .filter((ticker) => {
      const row = cache.get(ticker);
      return !row || now.getTime() - new Date(row.screened_at).getTime() > RESCREEN_AFTER_MS;
    })
    .sort((a, b) => (cache.get(a)?.screened_at ?? "").localeCompare(cache.get(b)?.screened_at ?? ""));

  // Oldest screenings first, until the time budget of the cron run is spent;
  // the remaining tickers are picked up by the next run.
  for (const ticker of due) {
    if (Date.now() > deadline) {
      result.skipped += 1;
      continue;
    }
    const cached = cache.get(ticker);
    try {
      const screening = runAAOIFI(await getFinancialData(ticker));
      const previousStatus = cached?.status ?? null;
      await writeCache(ticker, screening, previousStatus, now.toISOString());

      if (screening.status === "NON_COMPLIANT" && previousStatus && TRACKED_PREVIOUS_STATUSES.has(previousStatus)) {
        await openComplianceChanges(ticker, previousStatus, screening.status, holdings.filter((holding) => holding.ticker === ticker), now, result);
      } else if (RESTORED_STATUSES.has(screening.status)) {
        await resolveComplianceChanges({ ticker }, "restored_compliant", now);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      // A failed fetch must never look like a status change: the previous
      // status is kept and only the error and timestamp are recorded.
      await admin.from("screening_cache").upsert(
        cached
          ? { ...cached, error: message, screened_at: now.toISOString() }
          : { ticker, status: "INSUFFICIENT_DATA", error: message, screened_at: now.toISOString() },
      );
      result.failed.push({ id: ticker, error: message });
    }
  }
  return result;
}

/** Day-30 and day-85 reminders; closes cases whose position was sold. */
export async function processComplianceReminders(now = new Date()): Promise<RunResult> {
  const admin = createAdminClient();
  const result: RunResult = { sent: 0, skipped: 0, failed: [] };
  const { data: openChanges, error } = await admin.from("compliance_changes").select("*").eq("resolved", false);
  if (error) throw new Error(error.message);
  if (!openChanges?.length) return result;

  const userIds = Array.from(new Set(openChanges.map((change) => change.user_id)));
  const { data: assets, error: assetsError } = await admin.from("assets").select("user_id, ticker").in("user_id", userIds).not("ticker", "is", null);
  if (assetsError) throw new Error(assetsError.message);
  const held = new Set((assets ?? []).map((asset) => `${asset.user_id}|${normalizeTicker(asset.ticker!)}`));

  for (const change of openChanges as ComplianceChange[]) {
    try {
      if (!held.has(`${change.user_id}|${change.ticker}`)) {
        await resolveComplianceChanges({ ticker: change.ticker, userId: change.user_id }, "sold", now);
        result.skipped += 1;
        continue;
      }
      if (!change.day_30_deadline || !change.day_90_deadline) {
        result.skipped += 1;
        continue;
      }
      if (!change.notified_at) {
        await sendNonComplianceNotice(change);
        result.sent += 1;
        continue;
      }
      const name = escapeHtml(change.name ?? change.ticker);
      const urgentFrom = new Date(change.day_90_deadline).getTime() - 5 * DAY_MS;
      if (now.getTime() >= urgentFrom && !change.reminder_85_sent_at) {
        const remaining = daysLeft(change.day_90_deadline, now);
        await sendComplianceEmail(
          change.user_id,
          `⛔ Il vous reste ${remaining} jours pour vendre ${change.name ?? change.ticker}`,
          `⛔ Il vous reste ${remaining} jours pour vendre ${name}`,
          `<p style="color:#b8b4aa;line-height:1.6">${name} est toujours non conforme. Date limite de vente : <strong style="color:#ef4444">${formatDate(change.day_90_deadline)}</strong>.</p><p style="color:#b8b4aa;line-height:1.6">Si vous vendez, purifiez 100% des gains réalisés depuis le ${formatDate(change.change_date)}.</p>`,
        );
        await admin.from("compliance_changes").update({ reminder_85_sent_at: now.toISOString(), reminder_30_sent_at: change.reminder_30_sent_at ?? now.toISOString() }).eq("id", change.id);
        result.sent += 1;
      } else if (now.getTime() >= new Date(change.day_30_deadline).getTime() && !change.reminder_30_sent_at) {
        const remaining = daysLeft(change.day_90_deadline, now);
        await sendComplianceEmail(
          change.user_id,
          `${change.name ?? change.ticker} est toujours non conforme — ${remaining} jours pour vendre`,
          `${name} est toujours non conforme`,
          `<p style="color:#b8b4aa;line-height:1.6">${name} est toujours non conforme. Il vous reste ${remaining} jours pour vendre (avant le <strong style="color:#ef4444">${formatDate(change.day_90_deadline)}</strong>).</p><p style="color:#b8b4aa;line-height:1.6">Si vous vendez, purifiez 100% des gains réalisés depuis le ${formatDate(change.change_date)}.</p>`,
        );
        await admin.from("compliance_changes").update({ reminder_30_sent_at: now.toISOString() }).eq("id", change.id);
        result.sent += 1;
      } else {
        result.skipped += 1;
      }
    } catch (caught) {
      result.failed.push({ id: change.id, error: caught instanceof Error ? caught.message : "Erreur inconnue" });
    }
  }
  return result;
}
