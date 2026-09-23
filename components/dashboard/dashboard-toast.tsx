"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function DashboardToast({
  message,
  variant = "success",
}: {
  message?: string;
  variant?: "success" | "error";
}) {
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => {
    if (!message) return;
    setVisible(true);
    const timeout = window.setTimeout(() => setVisible(false), 4000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  if (!message || !visible) return null;

  return (
    <div
      role="status"
      className={cn(
        "fixed right-4 top-20 z-50 rounded-md border bg-background px-4 py-3 text-sm text-foreground shadow-lg",
        variant === "success"
          ? "border-halal-compliant/40"
          : "border-halal-nonCompliant/40",
      )}
    >
      {message}
    </div>
  );
}
