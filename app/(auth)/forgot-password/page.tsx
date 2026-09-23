"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const email = String(new FormData(event.currentTarget).get("email"));
    const { error: resetError } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
    });
    setLoading(false);
    // The same confirmation is shown whether or not the address exists, so the
    // form cannot be used to discover registered emails.
    if (resetError && !/not found|invalid/i.test(resetError.message)) setError("Impossible d’envoyer l’email pour le moment. Réessayez plus tard.");
    else setSent(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mot de passe oublié</CardTitle>
        <CardDescription>Recevez un lien pour choisir un nouveau mot de passe.</CardDescription>
      </CardHeader>
      {sent ? (
        <CardContent>
          <p className="text-sm text-muted-foreground">Si un compte existe pour cette adresse, un email contenant un lien de réinitialisation vient d’être envoyé.</p>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" autoComplete="email" required /></div>
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Envoi…" : "Envoyer le lien"}</Button>
          </CardContent>
        </form>
      )}
      <CardFooter className="justify-center text-sm text-muted-foreground">
        <Link className="text-primary hover:underline" href="/login">Retour à la connexion</Link>
      </CardFooter>
    </Card>
  );
}
