import "server-only";

import { Resend } from "resend";

let client: Resend | null = null;

export const isResendConfigured = Boolean(process.env.RESEND_API_KEY);

/** Instancié à la demande : le constructeur Resend échoue sans clé API. */
export function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY est requis pour envoyer des emails.");
  }
  client ??= new Resend(apiKey);
  return client;
}

/** Expéditeur vérifié par Resend ; remplacez-le par votre domaine une fois validé. */
export const DAILY_SUMMARY_FROM =
  process.env.RESEND_FROM ?? "Halisia <onboarding@resend.dev>";
