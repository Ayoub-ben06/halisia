import type { ReactNode } from "react";
import { PublicFeatureShell } from "@/components/layout/PublicFeatureShell";

export function LegalPage({ title, updatedAt, intro, children }: { title: string; updatedAt: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <PublicFeatureShell>
      <main className="mx-auto max-w-3xl px-4 py-12 text-white sm:px-8 sm:py-16">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-xs text-muted-foreground">Dernière mise à jour : {updatedAt}</p>
        {intro && <div className="mt-6 text-sm leading-7 text-[#d0c5b2]">{intro}</div>}
        <div className="mt-10 space-y-10">{children}</div>
      </main>
    </PublicFeatureShell>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-[#f2ca6e]">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-[#d0c5b2] [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-white">{children}</div>
    </section>
  );
}

export function ToComplete({ children }: { children: ReactNode }) {
  return <mark className="rounded bg-amber-500/20 px-1 text-amber-200">[À COMPLÉTER : {children}]</mark>;
}
