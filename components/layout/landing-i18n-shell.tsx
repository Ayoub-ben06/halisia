"use client";

import type { ReactNode } from "react";
import { I18nProvider } from "@/components/providers/i18n-provider";

export function LandingI18nShell({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}
