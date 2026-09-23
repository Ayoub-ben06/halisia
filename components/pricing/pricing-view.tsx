"use client";

import Link from "next/link";
import {
  BadgeCheck,
  Building2,
  Check,
  ChevronRight,
  CircleCheck,
  Landmark,
  LockKeyhole,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useState, type ReactNode } from "react";

const freeFeatures = [
  "Jusqu’à 3 actifs surveillés simultanément",
  "Screening Shariah standard (actions françaises)",
  "Calculateur de Zakat al-Maal manuel",
  "Watchlist restreinte (max. 5 favoris)",
  "Support communautaire standard",
];

const premiumFeatures = [
  "Portefeuille & actifs illimités (actions, sukuks, ETF)",
  "Screening Shariah complet en temps réel",
  "Actions mondiales & ETF halal",
  "Calcul de Zakat & purification automatisé",
  "Nisab or et argent mis à jour en continu",
  "Alertes instantanées de déclassement",
  "Import CSV & synchronisation de courtiers",
  "Rapports fiscaux complets & attestations PDF",
  "Support d’ingénierie financière dédié 7j/7",
];

const comparisonSections = [
  {
    title: "1. Suivi de portefeuille",
    rows: [
      ["Nombre d’actifs suivis en direct", "3 actifs maximum", "Illimité"],
      ["Historique complet des transactions", "30 jours", "Illimité à vie"],
      ["Portefeuille multi-devises (EUR, USD, GBP, AED, SAR)", "—", "check"],
    ],
  },
  {
    title: "2. Conformité & screening Shariah",
    rows: [
      ["Audit des ratios d’endettement & liquidités (AAOIFI)", "Actions françaises uniquement", "Actions mondiales & ETF halal"],
      ["Analyse détaillée des revenus impurs / non-conformes", "—", "check"],
      ["Alertes instantanées en cas de radiation ou reclassement", "—", "check"],
    ],
  },
  {
    title: "3. Zakat al-Maal & purification",
    rows: [
      ["Calcul automatique selon le Hawl et l’évolution des actifs", "Calcul manuel", "100% automatisé"],
      ["Suivi des cours de l’or & l’argent (Nisab temps réel)", "Mise à jour mensuelle", "Temps réel continu"],
      ["Attestation PDF officielle de purification certifiée", "—", "check"],
    ],
  },
  {
    title: "4. Outils avancés & accompagnement",
    rows: [
      ["Import CSV & intégration API banques / courtiers", "—", "check"],
      ["Export fiscal IFU / Flat-tax avec quote-part éthique", "—", "check"],
      ["Niveau d’assistance", "FAQ & Forum", "Support prioritaire dédié 7j/7"],
    ],
  },
] as const;

const faqs = [
  {
    question: "Comment est vérifiée la conformité Shariah des actions ?",
    answer: "Nos algorithmes appliquent fidèlement les normes du standard international AAOIFI. Ils analysent en temps réel la nature des activités commerciales, les ratios de dette, les revenus d’intérêts et la liquidité.",
  },
  {
    question: "Puis-je annuler mon abonnement à tout moment ?",
    answer: "Absolument. Aucune durée d’engagement n’est imposée au-delà de la période souscrite. Vous pouvez interrompre le renouvellement automatique depuis les paramètres de votre compte.",
  },
  {
    question: "Le calcul de la Zakat est-il reconnu par des savants ?",
    answer: "Notre moteur applique la méthode du Nisab et du Hawl retenue par les standards AAOIFI pour les portefeuilles d’actions. Les résultats restent présentés avec leur méthodologie détaillée.",
  },
  {
    question: "Quels moyens de paiement sont acceptés ?",
    answer: "Les principales cartes bancaires sont acceptées. Les paiements sont sécurisés et les informations de carte ne sont jamais conservées directement par Halisia.",
  },
];

export function PricingView() {
  const [annual, setAnnual] = useState(true);

  return (
    <main className="mx-auto max-w-[1180px] px-4 py-10 text-white sm:px-8 sm:py-14">
      <section className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
          <ShieldCheck className="h-3.5 w-3.5" />
          AAOIFI Shariah certified · Gestion éthique
        </span>
        <h1 className="mt-6 text-3xl font-bold">Tarifs transparents & sans compromis</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Investissez en toute sérénité selon vos principes, avec les meilleurs outils de screening financier, d’audit en continu et d’automatisation de la Zakat.
        </p>
        <div className="mx-auto mt-7 inline-flex flex-wrap items-center justify-center gap-1 rounded-xl border border-border bg-card p-1">
          <button type="button" onClick={() => setAnnual(false)} className={`h-9 rounded-lg px-4 text-xs font-semibold transition-colors ${!annual ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-white"}`}>Facturation mensuelle</button>
          <button type="button" onClick={() => setAnnual(true)} className={`h-9 rounded-lg px-4 text-xs font-semibold transition-colors ${annual ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-white"}`}>Facturation annuelle</button>
          <span className="px-3 text-[10px] font-bold uppercase tracking-wide text-primary">-20% à l’année</span>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" />Essai gratuit 14 jours sans engagement</span>
          <span className="inline-flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5 text-primary" />Annulation en 1 clic</span>
        </div>
      </section>

      <section className="mt-10 grid items-stretch gap-6 lg:grid-cols-2">
        <PlanCard eyebrow="Niveau découverte" title="Gratuit / Découverte" description="Idéal pour évaluer gratuitement la conformité éthique de vos premiers actifs cotés." price="0€" suffix="/ mois" features={freeFeatures}>
          <Link href="/dashboard" className="mt-auto flex h-11 items-center justify-center gap-2 rounded-lg bg-white/[0.06] text-xs font-bold transition-colors hover:bg-white/10">Commencer gratuitement <ChevronRight className="h-4 w-4" /></Link>
        </PlanCard>

        <PlanCard premium eyebrow="Banque privée & automatisation" title="Premium / Halisia Private" description="La solution d’excellence pour piloter l’éthique, la purification automatique et la croissance de vos investissements." price={annual ? "9,58€" : "14,99€"} suffix="/ mois" features={premiumFeatures} note={annual ? "Facturé 115€ / an · économie de 65€" : "Facturation mensuelle, sans engagement"}>
          <Link href="/settings/abonnement" className="mt-auto flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground transition-colors hover:bg-[#e6c364]">Passer à Halisia Premium <span className="hidden sm:inline">(14 jours gratuits)</span><ChevronRight className="h-4 w-4" /></Link>
        </PlanCard>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <TrustCard icon={<Scale />} title="Standard AAOIFI No. 21" text="Règles strictes de purification et seuils d’endettement à 30%." />
        <TrustCard icon={<Building2 />} title="Agrégation bancaire DSP2" text="Connexion en lecture seule 256-bits à plus de 350 banques & courtiers." />
        <TrustCard icon={<Landmark />} title="Attestations fiscales PDF" text="Justificatifs clairs pour la déclaration d’impôts et l’audit des dons éthiques." />
      </section>

      <section className="mt-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary/70">Matrice exhaustive</p><h2 className="mt-2 text-2xl font-bold">Comparatif des fonctionnalités</h2></div>
          <p className="text-xs text-muted-foreground">Transparence absolue sur chaque niveau d’habilitation.</p>
        </div>
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-xs">
              <thead><tr className="bg-white/[0.06] text-left"><th className="w-[48%] px-5 py-4 font-semibold">Modules & fonctionnalités</th><th className="w-[26%] px-5 py-4 text-center font-semibold">Plan Découverte (0€)</th><th className="w-[26%] bg-primary/[0.06] px-5 py-4 text-center font-semibold text-primary">Halisia Premium</th></tr></thead>
              <tbody>
                {comparisonSections.map((section) => (
                  <ComparisonGroup key={section.title} title={section.title} rows={section.rows} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mt-16">
        <div className="text-center"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary/70">Questions fréquentes</p><h2 className="mt-2 text-2xl font-bold">Tout ce que vous devez savoir</h2><p className="mt-2 text-xs text-muted-foreground">Des réponses nettes sur la conformité de nos algorithmes et les modalités d’abonnement.</p></div>
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {faqs.map((faq, index) => <article key={faq.question} className="rounded-2xl border border-border bg-card p-6"><div className="flex gap-4"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{index + 1}</span><div><h3 className="text-base font-bold">{faq.question}</h3><p className="mt-3 text-xs leading-5 text-muted-foreground">{faq.answer}</p></div></div></article>)}
        </div>
      </section>

      <section className="mt-14 flex flex-col gap-7 rounded-2xl border border-primary/15 bg-gradient-to-r from-primary/[0.08] to-card p-7 sm:p-9 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl"><p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-primary"><LockKeyhole className="h-3.5 w-3.5" />Engagement zéro riba</p><h2 className="mt-3 text-2xl font-bold">Prêt à assainir et faire fructifier votre patrimoine ?</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Rejoignez une nouvelle génération d’investisseurs qui pilotent leur portefeuille en conformité totale avec leurs valeurs.</p></div>
        <div className="flex flex-wrap gap-3"><Link href="/settings/abonnement" className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-xs font-bold text-primary-foreground hover:bg-[#e6c364]">Activer mon essai de 14 jours <ChevronRight className="h-4 w-4" /></Link><Link href="/dashboard" className="inline-flex h-11 items-center rounded-lg border border-border px-5 text-xs font-bold hover:bg-white/5">Tester un actif</Link></div>
      </section>
    </main>
  );
}

function PlanCard({ eyebrow, title, description, price, suffix, note, features, premium, children }: { eyebrow: string; title: string; description: string; price: string; suffix: string; note?: string; features: string[]; premium?: boolean; children: ReactNode }) {
  return <article className={`relative flex min-h-[590px] flex-col rounded-2xl border bg-card p-6 sm:p-8 ${premium ? "border-primary/25 shadow-[0_0_35px_rgba(201,168,76,0.08)]" : "border-border"}`}>{premium && <span className="absolute -top-3 right-5 rounded-full border border-primary/25 bg-[#2a2d29] px-3 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-primary"><Sparkles className="mr-1 inline h-3 w-3" />Recommandé · Le choix des investisseurs</span>}<div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{eyebrow}</p><h2 className="mt-2 text-xl font-bold">{title}</h2></div><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${premium ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground"}`}>{premium ? <LockKeyhole className="h-5 w-5" /> : <CircleCheck className="h-5 w-5" />}</span></div><p className="mt-5 min-h-12 text-xs leading-5 text-muted-foreground">{description}</p><div className="mt-6"><span className="text-3xl font-bold text-primary">{price}</span><span className="ml-1 text-xs text-muted-foreground">{suffix}</span>{note && <p className="mt-2 text-[11px] text-primary">{note}</p>}</div><p className="mt-8 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Fonctionnalités incluses</p><ul className="mb-8 mt-4 space-y-3">{features.map((feature) => <li key={feature} className="flex gap-2 text-xs leading-5"><Check className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${premium ? "text-primary" : "text-muted-foreground"}`} />{feature}</li>)}</ul>{children}</article>;
}

function TrustCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <article className="flex gap-4 rounded-xl border border-border bg-card p-5"><span className="text-primary [&>svg]:h-5 [&>svg]:w-5">{icon}</span><div><h3 className="text-xs font-bold">{title}</h3><p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">{text}</p></div></article>;
}

function ComparisonGroup({ title, rows }: { title: string; rows: readonly (readonly [string, string, string])[] }) {
  return <><tr><th colSpan={3} className="border-t border-border bg-[#151816] px-5 py-3 text-left text-[9px] font-bold uppercase tracking-[0.14em] text-primary/70">{title}</th></tr>{rows.map(([feature, free, premium]) => <tr key={feature} className="border-t border-border"><td className="px-5 py-4 font-medium">{feature}</td><td className="px-5 py-4 text-center text-muted-foreground">{free}</td><td className="bg-primary/[0.025] px-5 py-4 text-center font-semibold text-primary">{premium === "check" ? <CircleCheck className="mx-auto h-4 w-4" /> : premium}</td></tr>)}</>;
}
