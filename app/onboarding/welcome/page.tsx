import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlanSelection } from "@/components/onboarding/plan-selection";

export default async function WelcomePage() {
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) redirect("/register?next=/onboarding/welcome");
  return <main className="min-h-screen bg-[#101719] px-4 py-16 text-white"><div className="mx-auto max-w-6xl"><p className="text-sm font-semibold uppercase tracking-widest text-primary">Bienvenue sur Halisia</p><h1 className="mt-4 text-3xl font-bold">Choisissez votre formule</h1><p className="mt-3 max-w-2xl text-muted-foreground">Vous pourrez changer d’offre à tout moment. L’essai Premium ne demande aucune carte bancaire.</p><div className="mt-10"><PlanSelection /></div></div></main>;
}
