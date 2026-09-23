import Link from "next/link";
import { ArrowRight, BellRing, Coins, Globe2, SearchCheck, WalletCards } from "lucide-react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { SiteFooter } from "@/components/layout/SiteFooter";

const features = [
  { icon: SearchCheck, title: "Screening AAOIFI documenté", text: "Activité, dette, placements portant intérêt et revenus impurs, avec la source et la période de chaque ratio." },
  { icon: Globe2, title: "15 marchés couverts", text: "Actions américaines via les rapports SEC, et Europe, Japon, Inde, Golfe, Canada, Australie ou Hong Kong via Yahoo Finance." },
  { icon: WalletCards, title: "Portefeuille centralisé", text: "Actions, ETF, crypto et or au même endroit, avec import CSV Fortuneo, Bitpanda, Degiro et Trade Republic." },
  { icon: Coins, title: "Zakat et purification", text: "Calcul de la Zakat au nisab or ou argent du jour, et purification des dividendes ligne par ligne." },
  { icon: BellRing, title: "Alertes de déclassement", text: "Email dès qu’une action détenue devient non conforme, avec le suivi de la règle des 90 jours." },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#101719] text-white">
      <PublicNavbar />

      <section className="relative isolate min-h-[calc(100vh-81px)] px-6 pb-24 pt-[218px] text-center sm:px-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-35"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.065) 0.7px, transparent 0.8px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[330px] bg-[radial-gradient(ellipse_at_center,rgba(201,168,76,0.035),transparent_68%)]"
        />

        <div className="mx-auto flex max-w-[900px] flex-col items-center">
          <div className="mb-[33px] inline-flex h-[30px] items-center gap-2 rounded-full border border-white/[0.13] bg-white/[0.045] px-4 text-[12px] tracking-[0.035em] text-[#d2c7b4]">
            <span className="h-2 w-2 rounded-full bg-[#baa052]" />
            Screening halal · Zakat · Purification
          </div>

          <h1 className="max-w-[850px] text-[45px] font-bold leading-[1.07] tracking-[-0.035em] text-[#f7f7f7] sm:text-[58px] lg:text-[68px]">
            Votre patrimoine halal,
            <span className="block text-[#f2ca6e]">enfin centralisé.</span>
          </h1>

          <p className="mt-[29px] max-w-[640px] text-[16px] leading-[1.7] text-[#c9c0af] sm:text-[17px]">
            Suivez, analysez et purifiez vos investissements en toute sérénité.
            Une plateforme conçue pour allier performance financière et
            conformité éthique.
          </p>

          <div className="mt-[40px] flex w-full flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="group flex h-[60px] w-full max-w-[257px] items-center justify-center gap-3 rounded-full bg-[#d2ad45] text-[14px] font-semibold text-[#4d3b0d] shadow-[0_9px_28px_rgba(201,168,76,0.23)] transition-all hover:-translate-y-0.5 hover:bg-[#dfbd58]"
            >
              Créer un compte gratuit
              <ArrowRight className="h-[18px] w-[18px] transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/screening"
              className="flex h-[52px] w-full max-w-[220px] items-center justify-center rounded-full border border-white/[0.12] text-[13px] font-semibold text-[#f4f4f2] transition-colors hover:border-white/25 hover:bg-white/[0.04]"
            >
              Tester le screener gratuit
            </Link>
          </div>

          <p className="mt-[48px] text-[12.5px] text-[#a9a291]">
            Gratuit pendant la phase de lancement · Aucune carte bancaire demandée
          </p>
        </div>

        <div className="absolute inset-x-6 bottom-[96px] h-px bg-gradient-to-r from-transparent via-[#796934]/80 to-transparent sm:inset-x-16" />
      </section>

      <section id="fonctionnalites" className="mx-auto max-w-[1180px] scroll-mt-24 px-6 pb-24 sm:px-10">
        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#c9a84c]">Fonctionnalités</p>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.02em]">Tout pour investir selon vos principes</h2>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#c9a84c]/10 text-[#e6c364]"><Icon className="h-5 w-5" /></span>
              <h3 className="mt-5 text-base font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#c9c0af]">{text}</p>
            </article>
          ))}
          <article className="flex flex-col justify-center rounded-2xl border border-[#c9a84c]/25 bg-[#c9a84c]/[0.06] p-6">
            <h3 className="text-base font-bold">Une méthode transparente</h3>
            <p className="mt-2 text-sm leading-6 text-[#c9c0af]">Seuils, sources de données et limites de l’analyse sont publics.</p>
            <Link href="/methodologie" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#f2ca6e] hover:underline">Lire la méthodologie <ArrowRight className="h-4 w-4" /></Link>
          </article>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
