"use client";

import { NotificationList, useUnreadNotifications } from "@/components/dashboard/notification-bell";
import type { AppNotification } from "@/lib/notifications";

export function DashboardAlerts({ notifications }: { notifications: AppNotification[] }) {
  const { unread, markAllRead } = useUnreadNotifications(notifications);
  return (
    <section id="alertes" className="scroll-mt-24 rounded-[2rem] border border-white/[0.05] bg-[#1a1c1a] p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Alertes actives</h2>
        {unread.length > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold">{unread.length}</span>}
      </div>
      <NotificationList notifications={notifications} />
      {unread.length > 0 && (
        <button type="button" onClick={markAllRead} className="mt-5 w-full text-xs font-bold text-[#d0c5b2] hover:text-white">
          Tout marquer comme lu
        </button>
      )}
    </section>
  );
}
