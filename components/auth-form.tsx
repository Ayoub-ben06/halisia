"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/safe-redirect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/providers/i18n-provider";

const googleEnabled = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true";

export function AuthForm({ mode, next: rawNext, initialError }: { mode: "login" | "register"; next?: string; initialError?: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const next = safeNextPath(rawNext);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(initialError === "lien-invalide" ? t("authInvalidLink") : "");
  const isLogin = mode === "login";

  function getErrorMessage(errorMessage: string) {
    const normalized = errorMessage.toLowerCase();

    if (normalized.includes("email not confirmed")) {
      return t("authConfirmEmailFirst");
    }

    if (normalized.includes("invalid login credentials")) {
      return t("authInvalidCredentials");
    }

    if (
      normalized.includes("already registered") ||
      normalized.includes("already been registered") ||
      normalized.includes("user already exists")
    ) {
      return t("authEmailAlreadyUsed");
    }

    return errorMessage;
  }

  function callbackUrl(target: string) {
    return `${location.origin}/auth/callback?next=${encodeURIComponent(target)}`;
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
      setMessage(t("authPasswordsMismatch"));
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const result = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: callbackUrl(next) } });
    if (result.error) {
      setLoading(false);
      return setMessage(getErrorMessage(result.error.message));
    }
    if (!isLogin && result.data.user?.identities?.length === 0) {
      setLoading(false);
      return setMessage(t("authEmailAlreadyUsed"));
    }
    if (!isLogin && !result.data.session) {
      setLoading(false);
      return setMessage(t("authCheckEmailConfirm"));
    }
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const target = aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2" ? `/login/mfa?next=${encodeURIComponent(next)}` : next;
    router.replace(target);
    router.refresh();
  }

  async function signInWithGoogle() {
    setMessage("");
    const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: callbackUrl(next) } });
    if (error) setMessage(t("authGoogleUnavailable"));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isLogin ? t("authLoginTitle") : t("authRegisterTitle")}</CardTitle>
        <CardDescription>{isLogin ? t("authLoginDescription") : t("authRegisterDescription")}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {googleEnabled && (
            <>
              <Button type="button" variant="outline" className="w-full" onClick={() => void signInWithGoogle()}>
                {t("authContinueGoogle")}
              </Button>
              <p className="text-center text-xs text-muted-foreground">{t("authOrWithEmail")}</p>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">{t("authEmail")}</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t("password")}</Label>
              {isLogin && (
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                  {t("authForgotPassword")}
                </Link>
              )}
            </div>
            <Input id="password" name="password" type="password" minLength={isLogin ? 6 : 8} autoComplete={isLogin ? "current-password" : "new-password"} required />
          </div>
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("authConfirmPassword")}</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" minLength={8} autoComplete="new-password" required />
            </div>
          )}
          {!isLogin && (
            <label className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
              <input type="checkbox" name="terms" required className="mt-1 accent-[#c9a84c]" />
              <span>
                {t("authTermsPrefix")}{" "}
                <Link href="/cgu" target="_blank" className="text-primary hover:underline">
                  {t("authTermsLink")}
                </Link>{" "}
                {t("authTermsMiddle")}{" "}
                <Link href="/confidentialite" target="_blank" className="text-primary hover:underline">
                  {t("authPrivacyLink")}
                </Link>
                .
              </span>
            </label>
          )}
          {message && <p className="text-sm text-destructive" role="alert">{message}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("loading") : isLogin ? t("authSignIn") : t("authCreateAccount")}
          </Button>
        </CardContent>
      </form>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        {isLogin ? t("authNoAccount") : t("authHasAccount")}{" "}
        <Link className="ml-1 text-primary hover:underline" href={isLogin ? `/register${rawNext ? `?next=${encodeURIComponent(next)}` : ""}` : `/login${rawNext ? `?next=${encodeURIComponent(next)}` : ""}`}>
          {isLogin ? t("authSignUp") : t("authSignIn")}
        </Link>
      </CardFooter>
    </Card>
  );
}
