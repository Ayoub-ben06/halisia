"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PlanSelection() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  async function choose(plan: "free" | "trial") {
    setLoading(plan); setError("");
    const response = await fetch("/api/plan/select", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
    const data = await response.json() as { error?: string };
    if (!response.ok) { setError(data.error ?? "Impossible de sélectionner cette offre."); setLoading(null); return; }
    router.replace("/dashboard"); router.refresh();
  }
  async function subscribePremium() {
    setLoading("premium"); setError("");
    const response = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: "monthly", returnTo: "/onboarding/welcome" }) });
    const data = await response.json() as { url?: string; error?: string };
    if (!response.ok || !data.url) { setError(data.error ?? "Impossible d’ouvrir le paiement."); setLoading(null); return; }
    window.location.assign(data.url);
  }
  return <div className="grid gap-5 md:grid-cols-3">
    <Plan title="Gratuit" price="0 €" description="Pour commencer simplement." features={["5 actifs maximum", "3 actifs en watchlist", "Screening basique", "Calculateur Zakat", "Pas d’import ni d’alertes avancées"]} action="Continuer gratuitement" onClick={() => void choose("free")} loading={loading === "free"} />
    <Plan highlighted title="Essai Premium" price="7 jours gratuits" description="Toutes les fonctionnalités, sans carte bancaire." features={["Portefeuille et watchlist illimités", "Screening AAOIFI détaillé", "Imports CSV/XLSX", "Alertes et purification", "Résumé quotidien", "Aucun prélèvement automatique"]} action="Essayer gratuitement" onClick={() => void choose("trial")} loading={loading === "trial"} />
    <Plan title="Premium" price="6,99 € / mois" description="Accédez immédiatement à toutes les fonctionnalités Premium. Économisez 20 % avec la formule annuelle." features={["Portefeuille et watchlist illimités", "Screening AAOIFI détaillé", "Imports CSV/XLSX", "Alertes et purification", "Résumé quotidien par email", "-20 % avec l’abonnement annuel", "Résiliation depuis Stripe"]} action="Souscrire à Premium" onClick={() => void subscribePremium()} loading={loading === "premium"} />
    {error && <p className="md:col-span-3 text-center text-sm text-red-300" role="alert">{error}</p>}
  </div>;
}

function Plan({ title, price, description, features, action, onClick, loading, highlighted }: { title: string; price: string; description: string; features: string[]; action: string; onClick: () => void; loading: boolean; highlighted?: boolean }) {
  return <article className={`flex flex-col rounded-2xl border p-6 ${highlighted ? "border-primary bg-primary/[0.08] shadow-[0_0_30px_rgba(201,168,76,0.12)]" : "border-border bg-card"}`}>
    <h2 className="text-xl font-bold">{title}</h2><p className="mt-3 text-2xl font-bold text-primary">{price}</p><p className="mt-2 min-h-10 text-sm text-muted-foreground">{description}</p>
    <ul className="my-6 flex-1 space-y-2 text-sm">{features.map((feature) => <li key={feature}>✓ {feature}</li>)}</ul>
    <button type="button" disabled={loading} onClick={onClick} className="h-11 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60">{loading ? "Activation…" : action}</button>
  </article>;
}
