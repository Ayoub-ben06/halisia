"use client";

import { useEffect, useState } from "react";

export function DashboardToast({ message }: { message?: string }) {
  const [visible, setVisible] = useState(Boolean(message));
  useEffect(() => {
    if (!message) return;
    setVisible(true);
    const timeout = window.setTimeout(() => setVisible(false), 4000);
    return () => window.clearTimeout(timeout);
  }, [message]);
  if (!message || !visible) return null;
  return <div role="status" className="fixed right-4 top-20 z-50 rounded-md border border-red-500/40 bg-[#0D1B2A] px-4 py-3 text-sm text-white shadow-lg">{message}</div>;
}
