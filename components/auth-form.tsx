"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const isLogin = mode === "login";

  function getErrorMessage(errorMessage: string) {
    const normalized = errorMessage.toLowerCase();

    if (
      normalized.includes("invalid login credentials") ||
      normalized.includes("email not confirmed")
    ) {
      return "Email ou mot de passe incorrect";
    }

    if (
      normalized.includes("already registered") ||
      normalized.includes("already been registered") ||
      normalized.includes("user already exists")
    ) {
      return "Cet email est déjà utilisé";
    }

    return errorMessage;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (!isLogin && password !== confirmPassword) {
      setMessage("Les mots de passe ne correspondent pas");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const result = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/dashboard` } });
    setLoading(false);
    if (result.error) return setMessage(getErrorMessage(result.error.message));
    if (!isLogin && result.data.user?.identities?.length === 0) {
      return setMessage("Cet email est déjà utilisé");
    }
    if (!isLogin && !result.data.session) return setMessage("Consultez votre e-mail pour confirmer votre inscription.");
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isLogin ? "Connexion" : "Créer un compte"}</CardTitle>
        <CardDescription>{isLogin ? "Accédez à votre espace Halisia." : "Commencez à suivre votre patrimoine."}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" autoComplete="email" required /></div>
          <div className="space-y-2"><Label htmlFor="password">Mot de passe</Label><Input id="password" name="password" type="password" minLength={6} autoComplete={isLogin ? "current-password" : "new-password"} required /></div>
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" minLength={6} autoComplete="new-password" required />
            </div>
          )}
          {message && <p className="text-sm text-destructive" role="alert">{message}</p>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Chargement…" : isLogin ? "Se connecter" : "Créer mon compte"}</Button>
        </CardContent>
      </form>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}{" "}
        <Link className="ml-1 text-primary hover:underline" href={isLogin ? "/register" : "/login"}>{isLogin ? "S’inscrire" : "Se connecter"}</Link>
      </CardFooter>
    </Card>
  );
}
