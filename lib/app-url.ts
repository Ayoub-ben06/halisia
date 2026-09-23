/** URL publique de l'application, utilisée dans les liens des emails. */
export function appUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}
