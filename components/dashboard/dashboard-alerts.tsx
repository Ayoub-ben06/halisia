"use client";

import { NotificationList, useUnreadNotifications } from "@/components/dashboard/notification-bell";
import type { AppNotification } from "@/lib/notifications";
import { useI18n } from "@/components/providers/i18n-provider";

export type DashboardActiveAlert = {
  id: string;
  ticker: string;
  name: string;
  alertType: "halal_change" | "price_target";
  priceTarget: number | null;
};

export function DashboardAlerts({ notifications, activeAlerts }: { notifications: AppNotification[]; activeAlerts: DashboardActiveAlert[] }) {
  const { t, language } = useI18n();
  const locale = language === "en" ? "en-US" : "fr-FR";
  const { unread, markAllRead } = useUnreadNotifications(notifications);
  return (
    <section id="alertes" className="scroll-mt-24 rounded-[2rem] border border-white/[0.05] bg-[#1a1c1a] p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{t("activeAlerts")}</h2>
        {activeAlerts.length > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold">{activeAlerts.length}</span>}
      </div>
      {activeAlerts.length > 0 && (
        <ul className="mt-5 space-y-3">
          {activeAlerts.map((alert) => (
            <li key={alert.id}>
              <a href={alert.alertType === "halal_change" ? `/asset/${encodeURIComponent(alert.ticker)}` : "/watchlist"} className="flex gap-3 rounded-xl border-l-4 border-amber-500 bg-[#282b28] p-4 hover:bg-[#323632]">
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-white">{alert.name}</span>
                  <span className="mt-1 block text-xs leading-5 text-[#d0c5b2]">
                    {alert.alertType === "halal_change" ? t("monitorShariahStatus") : t("priceTargetLabel").replace("{price}", alert.priceTarget != null ? Number(alert.priceTarget).toLocaleString(locale) : t("priceTargetUndefined"))}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {notifications.length > 0 ? <NotificationList notifications={notifications} /> : activeAlerts.length === 0 ? <NotificationList notifications={notifications} /> : null}
      {unread.length > 0 && (
        <button type="button" onClick={markAllRead} className="mt-5 w-full text-xs font-bold text-[#d0c5b2] hover:text-white">
          {t("markAllRead")}
        </button>
      )}
    </section>
  );
}
