import Link from "next/link";
import { Calculator, Landmark, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    title: "Screening Halal",
    description: "Vérifiez la conformité de vos investissements selon des critères clairs.",
    icon: ShieldCheck,
  },
  {
    title: "Calcul Zakat",
    description: "Estimez simplement la zakat due sur l’ensemble de votre patrimoine.",
    icon: Calculator,
  },
  {
    title: "Fiscalité Française",
    description: "Centralisez les informations utiles à vos déclarations fiscales.",
    icon: Landmark,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-xl font-semibold tracking-tight text-primary">Halisia</Link>
        <Button asChild variant="outline"><Link href="/login">Se connecter</Link></Button>
      </nav>
      <section className="mx-auto flex max-w-5xl flex-col items-center px-6 pb-20 pt-24 text-center sm:pt-32">
        <span className="mb-6 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary">
          Finance éthique, vision claire
        </span>
        <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl">
          Suivez votre patrimoine halal en un seul endroit
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
          Pilotez vos investissements, contrôlez leur conformité et préparez votre zakat depuis une interface simple.
        </p>
        <Button asChild size="lg" className="mt-10"><Link href="/register">Commencer gratuitement</Link></Button>
      </section>
      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-24 md:grid-cols-3">
        {features.map(({ title, description, icon: Icon }) => (
          <Card key={title} className="bg-card/80">
            <CardHeader>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <CardTitle className="text-xl">{title}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">{description}</CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
