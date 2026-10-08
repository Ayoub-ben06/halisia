"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#111412", color: "#fff", fontFamily: "Inter, Arial, sans-serif" }}>
        <main style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 22 }}>Une erreur est survenue</h1>
          <p style={{ color: "#b8b4aa", lineHeight: 1.6 }}>L’équipe Halisia a été prévenue. Vous pouvez réessayer ou revenir à l’accueil.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 20 }}>
            <button type="button" onClick={reset} style={{ padding: "10px 16px", borderRadius: 8, border: 0, background: "#c9a84c", color: "#111412", fontWeight: 700, cursor: "pointer" }}>Réessayer</button>
            <a href="/" style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #4d4637", color: "#fff", textDecoration: "none" }}>Accueil</a>
          </div>
        </main>
      </body>
    </html>
  );
}
