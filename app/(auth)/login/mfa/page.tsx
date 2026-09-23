"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/safe-redirect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function MfaChallengePage({ searchParams }: { searchParams: { next?: string } }) {
  const router = useRouter();
  const next = safeNextPath(searchParams.next);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code")).replace(/\s/g, "");
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp.find((item) => item.status === "verified");
    if (factorsError || !factor) {
      setLoading(false);
      return setError("Aucune application d’authentification n’est associée à ce compte.");
    }
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    setLoading(false);
    if (verifyError) return setError("Code invalide ou expiré.");
    router.replace(next);
    router.refresh();
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vérification en deux étapes</CardTitle>
        <CardDescription>Saisissez le code à 6 chiffres affiché dans votre application d’authentification.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus />
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Vérification…" : "Valider"}</Button>
        </CardContent>
      </form>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        <button type="button" onClick={() => void signOut()} className="text-primary hover:underline">Se déconnecter</button>
      </CardFooter>
    </Card>
  );
}
