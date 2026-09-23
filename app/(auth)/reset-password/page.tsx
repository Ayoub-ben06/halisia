"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (password !== String(form.get("confirmPassword"))) return setError("Les mots de passe ne correspondent pas");
    setLoading(true);
    setError("");
    const { error: updateError } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(/session/i.test(updateError.message) ? "Le lien a expiré. Demandez un nouveau lien de réinitialisation." : updateError.message);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouveau mot de passe</CardTitle>
        <CardDescription>Choisissez un mot de passe d’au moins 8 caractères.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label htmlFor="password">Nouveau mot de passe</Label><Input id="password" name="password" type="password" minLength={8} autoComplete="new-password" required /></div>
          <div className="space-y-2"><Label htmlFor="confirmPassword">Confirmer</Label><Input id="confirmPassword" name="confirmPassword" type="password" minLength={8} autoComplete="new-password" required /></div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Enregistrement…" : "Enregistrer le mot de passe"}</Button>
        </CardContent>
      </form>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        <Link className="text-primary hover:underline" href="/forgot-password">Demander un nouveau lien</Link>
      </CardFooter>
    </Card>
  );
}
