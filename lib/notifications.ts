import "server-only";

import { createClient } from "@/lib/supabase/server";

export type AppNotification = {
  id: string;
  kind: "compliance" | "price";
  title: string;
  text: string;
  href: string;
  date: string;
};

const DAY_MS = 86_400_000;
const PRICE_ALERT_WINDOW_DAYS = 14;

/**
 * Notifications derived from real state: open 90-day compliance cases and
 * price targets reached recently. Tables missing before a migration simply
 * yield no notification.
 */
export async function getUserNotifications(userId: string): Promise<AppNotification[]> {
  const supabase = createClient();
  const since = new Date(Date.now() - PRICE_ALERT_WINDOW_DAYS * DAY_MS).toISOString();
  const [changes, alerts] = await Promise.all([
    supabase.from("compliance_changes").select("id, ticker, name, change_date, day_90_deadline").eq("user_id", userId).eq("resolved", false),
    supabase.from("watchlist_alerts").select("id, ticker, name, alert_type, price_target, last_triggered_at").eq("user_id", userId).gte("last_triggered_at", since),
  ]);
  const now = Date.now();
  const notifications: AppNotification[] = [
    ...(changes.data ?? []).map((change) => {
      const day = Math.min(90, Math.max(0, Math.floor((now - new Date(change.change_date).getTime()) / DAY_MS)));
      const deadline = change.day_90_deadline ? new Date(change.day_90_deadline).toLocaleDateString("fr-FR") : null;
      return {
        id: `compliance-${change.id}`,
        kind: "compliance" as const,
        title: `${change.name ?? change.ticker} n’est plus conforme`,
        text: `J+${day}/90${deadline ? ` · vente au plus tard le ${deadline}` : ""}`,
        href: "/portfolio",
        date: change.change_date,
      };
    }),
    ...(alerts.data ?? []).map((alert) => alert.alert_type === "halal_change"
      ? {
          id: `status-${alert.id}-${alert.last_triggered_at}`,
          kind: "compliance" as const,
          title: `Changement de statut : ${alert.name}`,
          text: `Le statut Shariah de ${alert.ticker} a changé — voir l’analyse`,
          href: `/asset/${encodeURIComponent(alert.ticker)}`,
          date: alert.last_triggered_at!,
        }
      : {
          id: `price-${alert.id}-${alert.last_triggered_at}`,
          kind: "price" as const,
          title: `Objectif atteint : ${alert.name}`,
          text: alert.price_target != null ? `Cours passé sous ${Number(alert.price_target).toLocaleString("fr-FR")} (${alert.ticker})` : alert.ticker,
          href: "/watchlist",
          date: alert.last_triggered_at!,
        }),
  ];
  return notifications.sort((a, b) => b.date.localeCompare(a.date));
}
