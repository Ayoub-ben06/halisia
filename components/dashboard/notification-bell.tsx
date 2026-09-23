"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, BellRing, TriangleAlert } from "lucide-react";
import type { AppNotification } from "@/lib/notifications";

const LAST_SEEN_KEY = "halisia-notifications-seen-at";

export function useUnreadNotifications(notifications: AppNotification[]) {
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  useEffect(() => { setLastSeen(localStorage.getItem(LAST_SEEN_KEY)); }, []);
  const unread = notifications.filter((item) => !lastSeen || item.date > lastSeen);
  const markAllRead = () => {
    const now = new Date().toISOString();
    localStorage.setItem(LAST_SEEN_KEY, now);
    setLastSeen(now);
    window.dispatchEvent(new Event("halisia-notifications-read"));
  };
  useEffect(() => {
    const sync = () => setLastSeen(localStorage.getItem(LAST_SEEN_KEY));
    window.addEventListener("halisia-notifications-read", sync);
    return () => window.removeEventListener("halisia-notifications-read", sync);
  }, []);
  return { unread, markAllRead };
}

export function NotificationList({ notifications, compact = false }: { notifications: AppNotification[]; compact?: boolean }) {
  if (!notifications.length) return <p className={`${compact ? "px-4 py-6" : "mt-5"} text-sm text-[#8f8878]`}>Aucune alerte pour le moment.</p>;
  return (
    <ul className={compact ? "max-h-80 overflow-y-auto" : "mt-5 space-y-3"}>
      {notifications.map((item) => (
        <li key={item.id}>
          <Link href={item.href} className={`flex gap-3 ${compact ? "border-b border-white/[0.05] px-4 py-3 hover:bg-white/[0.04]" : "rounded-xl border-l-4 bg-[#282b28] p-4"} ${!compact && item.kind === "compliance" ? "border-red-500" : !compact ? "border-amber-500" : ""}`}>
            {item.kind === "compliance" ? <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-400" /> : <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />}
            <span className="min-w-0">
              <span className="block text-xs font-bold text-white">{item.title}</span>
              <span className="mt-1 block text-xs leading-5 text-[#d0c5b2]">{item.text}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function NotificationBell({ notifications }: { notifications: AppNotification[] }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { unread, markAllRead } = useUnreadNotifications(notifications);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!containerRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button type="button" aria-label={`Notifications${unread.length ? ` (${unread.length} non lues)` : ""}`} aria-expanded={open} onClick={() => setOpen(!open)} className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1a1c1a]">
        <Bell className="h-5 w-5 text-[#d0c5b2]" />
        {unread.length > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#c9a84c] px-1 text-[9px] font-bold text-[#111412]">{unread.length}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-xl border border-white/[0.08] bg-[#151816] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">
            <p className="text-sm font-bold">Notifications</p>
            {unread.length > 0 && <button type="button" onClick={markAllRead} className="text-xs font-semibold text-[#e6c364] hover:underline">Tout marquer comme lu</button>}
          </div>
          <NotificationList notifications={notifications} compact />
        </div>
      )}
    </div>
  );
}
