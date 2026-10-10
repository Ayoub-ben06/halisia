import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { LandingI18nShell } from "@/components/layout/landing-i18n-shell";
import { LandingContent } from "@/components/landing/landing-content";
import { LandingHero } from "@/components/landing/landing-hero";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Halisia — Votre patrimoine halal, enfin centralisé",
  description:
    "Screening halal AAOIFI, calcul de Zakat automatique et alertes en temps réel pour votre patrimoine.",
  keywords: [
    "investissement halal",
    "screening halal",
    "zakat bourse",
    "finance islamique france",
    "portefeuille halal",
    "ETF islamique",
  ],
  openGraph: {
    title: "Halisia — Votre patrimoine halal, enfin centralisé",
    description:
      "Screening halal AAOIFI, calcul de Zakat automatique et alertes en temps réel.",
    url: "https://halisia.finance",
    siteName: "Halisia",
    locale: "fr_FR",
    type: "website",
  },
};

export default async function HomePage() {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <LandingI18nShell>
      <main className="landing-page min-h-screen overflow-hidden bg-[#101719] text-white">
        <PublicNavbar />
        <LandingHero />
        <LandingContent />
        <SiteFooter />
      </main>
    </LandingI18nShell>
  );
}
