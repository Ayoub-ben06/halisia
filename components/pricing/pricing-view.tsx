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
  "Jusqu’à 3 actifs suivis dans le portefeuille",
  "Screening AAOIFI des actions (US, Europe, Asie, Golfe)",
  "Calculateur de Zakat al-Maal",
  "Watchlist jusqu’à 5 favoris",
  "FAQ et méthodologie publique",
];

const premiumFeatures = [
  "Portefeuille illimité (actions, ETF, crypto, or)",
  "Screening AAOIFI détaillé avec sources et ratios",
  "Calcul de Zakat et purification des dividendes",
  "Nisab or ou argent au cours du jour",
  "Alertes email de déclassement et règle des 90 jours",
  "Import CSV Fortuneo, Bitpanda, Degiro, Trade Republic",
  "Résumé quotidien du portefeuille par email",
];

const comparisonSections = [
  {
    title: "1. Suivi de portefeuille",
    rows: [
      ["Nombre d’actifs suivis", "3 actifs maximum", "Illimité"],
      ["Historique des transactions", "check", "check"],
      ["Devise d’affichage (EUR, USD, GBP)", "check", "check"],
    ],
  },
  {
    title: "2. Conformité & screening Shariah",
    rows: [
      ["Ratios d’endettement, placements et revenus impurs (AAOIFI)", "check", "check"],
      ["Détail des sources de données et limites de l’analyse", "—", "check"],
      ["Alertes email en cas de déclassement (règle des 90 jours)", "—", "check"],
    ],
  },
  {
    title: "3. Zakat al-Maal & purification",
    rows: [
      ["Calcul de la Zakat à partir du portefeuille", "check", "check"],
      ["Nisab or ou argent au cours du jour", "check", "check"],
      ["Purification des dividendes par ligne", "—", "check"],
    ],
  },
  {
    title: "4. Outils",
    rows: [
      ["Import CSV des courtiers", "—", "check"],
      ["Résumé quotidien et rappel annuel de Zakat par email", "—", "check"],
      ["Assistance", "FAQ", "Email"],
    ],
  },
] as const;

const faqs = [
  {
    question: "Comment est vérifiée la conformité Shariah des actions ?",
    answer: "Halisia applique les critères de la norme AAOIFI n°21 à partir de données publiques (rapports SEC, Yahoo Finance) : activité, dette, placements portant intérêt et revenus impurs. La méthode, les seuils et les limites sont détaillés sur la page Méthodologie.",
  },
  {
    question: "Quand Premium sera-t-il disponible ?",
    answer: "Premium n’est pas encore ouvert à la souscription. Pendant la phase de lancement, toutes les fonctionnalités sont accessibles gratuitement ; les limites du plan Découverte s’appliqueront à l’ouverture de Premium.",
  },
  {
    question: "Le calcul de la Zakat est-il reconnu par des savants ?",
    answer: "Halisia n’émet pas de fatwa. Le calcul suit la méthode du Nisab et du Hawl et affiche chaque hypothèse (nisab or ou argent, inclusion du Bitcoin) ; en cas de doute, consultez un savant de confiance.",
  },
  {
    question: "Dois-je fournir un moyen de paiement ?",
    answer: "Non. Aucun moyen de paiement n’est demandé aujourd’hui : le compte est gratuit pendant la phase de lancement.",
  },
];

export function PricingView() {
  const [annual, setAnnual] = useState(true);

  return (
    <main className="mx-auto max-w-[1180px] px-4 py-10 text-white sm:px-8 sm:py-14">
      <section className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
          <ShieldCheck className="h-3.5 w-3.5" />
          Critères AAOIFI · Méthodologie publique
        </span>
        <h1 className="mt-6 text-3xl font-bold">Tarifs transparents & sans compromis</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Investissez selon vos principes avec un screening Shariah documenté, le suivi de votre portefeuille et le calcul de votre Zakat.
        </p>
        <p className="mx-auto mt-4 max-w-2xl rounded-lg border border-primary/20 bg-primary/[0.06] px-4 py-3 text-xs leading-5 text-primary">
          Phase de lancement : toutes les fonctionnalités sont gratuites. Premium ouvrira prochainement, aucun moyen de paiement n’est demandé.
        </p>
        <div className="mx-auto mt-7 inline-flex flex-wrap items-center justify-center gap-1 rounded-xl border border-border bg-card p-1">
          <button type="button" onClick={() => setAnnual(false)} className={`h-9 rounded-lg px-4 text-xs font-semibold transition-colors ${!annual ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-white"}`}>Facturation mensuelle</button>
          <button type="button" onClick={() => setAnnual(true)} className={`h-9 rounded-lg px-4 text-xs font-semibold transition-colors ${annual ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-white"}`}>Facturation annuelle</button>
          <span className="px-3 text-[10px] font-bold uppercase tracking-wide text-primary">-20% à l’année</span>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5 text-primary" />Prix indicatifs de Premium à son ouverture, sans engagement</span>
        </div>
      </section>

      <section className="mt-10 grid items-stretch gap-6 lg:grid-cols-2">
        <PlanCard eyebrow="Niveau découverte" title="Gratuit / Découverte" description="Idéal pour évaluer gratuitement la conformité éthique de vos premiers actifs cotés." price="0€" suffix="/ mois" features={freeFeatures}>
          <Link href="/register" className="mt-auto flex h-11 items-center justify-center gap-2 rounded-lg bg-white/[0.06] text-xs font-bold transition-colors hover:bg-white/10">Commencer gratuitement <ChevronRight className="h-4 w-4" /></Link>
        </PlanCard>

        <PlanCard premium eyebrow="Suivi complet & automatisation" title="Premium" description="Pour suivre tout votre patrimoine, être alerté des déclassements et purifier vos dividendes." price={annual ? "9,58€" : "14,99€"} suffix="/ mois" features={premiumFeatures} note={annual ? "Soit 115€ / an à l’ouverture" : "Facturation mensuelle, sans engagement"}>
          <Link href="/register" className="mt-auto flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground transition-colors hover:bg-[#e6c364]">Tout est gratuit pendant le lancement <ChevronRight className="h-4 w-4" /></Link>
        </PlanCard>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <TrustCard icon={<Scale />} title="Norme AAOIFI n°21" text="Seuils de dette et de placements à 30 %, revenus impurs à 5 %, purification des dividendes." />
        <TrustCard icon={<Building2 />} title="Données publiques vérifiables" text="Chaque ratio affiche sa source (rapports SEC, Yahoo Finance) et sa période." />
        <TrustCard icon={<Landmark />} title="Méthodologie publique" text={<>Seuils, sources et limites détaillés sur la page <Link href="/methodologie" className="text-primary underline-offset-2 hover:underline">Méthodologie</Link>.</>} />
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
        <div className="flex flex-wrap gap-3"><Link href="/register" className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-xs font-bold text-primary-foreground hover:bg-[#e6c364]">Créer mon compte gratuit <ChevronRight className="h-4 w-4" /></Link><Link href="/screening" className="inline-flex h-11 items-center rounded-lg border border-border px-5 text-xs font-bold hover:bg-white/5">Tester un actif</Link></div>
      </section>
    </main>
  );
}

function PlanCard({ eyebrow, title, description, price, suffix, note, features, premium, children }: { eyebrow: string; title: string; description: string; price: string; suffix: string; note?: string; features: string[]; premium?: boolean; children: ReactNode }) {
  return <article className={`relative flex min-h-[590px] flex-col rounded-2xl border bg-card p-6 sm:p-8 ${premium ? "border-primary/25 shadow-[0_0_35px_rgba(201,168,76,0.08)]" : "border-border"}`}>{premium && <span className="absolute -top-3 right-5 rounded-full border border-primary/25 bg-[#2a2d29] px-3 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-primary"><Sparkles className="mr-1 inline h-3 w-3" />Bientôt disponible</span>}<div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{eyebrow}</p><h2 className="mt-2 text-xl font-bold">{title}</h2></div><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${premium ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground"}`}>{premium ? <LockKeyhole className="h-5 w-5" /> : <CircleCheck className="h-5 w-5" />}</span></div><p className="mt-5 min-h-12 text-xs leading-5 text-muted-foreground">{description}</p><div className="mt-6"><span className="text-3xl font-bold text-primary">{price}</span><span className="ml-1 text-xs text-muted-foreground">{suffix}</span>{note && <p className="mt-2 text-[11px] text-primary">{note}</p>}</div><p className="mt-8 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Fonctionnalités incluses</p><ul className="mb-8 mt-4 space-y-3">{features.map((feature) => <li key={feature} className="flex gap-2 text-xs leading-5"><Check className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${premium ? "text-primary" : "text-muted-foreground"}`} />{feature}</li>)}</ul>{children}</article>;
}

function TrustCard({ icon, title, text }: { icon: ReactNode; title: string; text: ReactNode }) {
  return <article className="flex gap-4 rounded-xl border border-border bg-card p-5"><span className="text-primary [&>svg]:h-5 [&>svg]:w-5">{icon}</span><div><h3 className="text-xs font-bold">{title}</h3><p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">{text}</p></div></article>;
}

function ComparisonGroup({ title, rows }: { title: string; rows: readonly (readonly [string, string, string])[] }) {
  return <><tr><th colSpan={3} className="border-t border-border bg-[#151816] px-5 py-3 text-left text-[9px] font-bold uppercase tracking-[0.14em] text-primary/70">{title}</th></tr>{rows.map(([feature, free, premium]) => <tr key={feature} className="border-t border-border"><td className="px-5 py-4 font-medium">{feature}</td><td className="px-5 py-4 text-center text-muted-foreground">{free === "check" ? <CircleCheck className="mx-auto h-4 w-4" /> : free}</td><td className="bg-primary/[0.025] px-5 py-4 text-center font-semibold text-primary">{premium === "check" ? <CircleCheck className="mx-auto h-4 w-4" /> : premium}</td></tr>)}</>;
}
