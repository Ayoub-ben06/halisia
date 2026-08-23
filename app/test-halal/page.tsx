"use client";

import { useState } from "react";

export default function TestHalalPage() {
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function testHalalScreening() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/test-halal", { method: "POST" });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? `La requête a échoué (${response.status})`);
      }

      setResult(await response.json());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Une erreur inconnue est survenue.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <button onClick={testHalalScreening} disabled={loading}>
        {loading ? "Chargement..." : "Tester le screening halal"}
      </button>

      {error && <p>{error}</p>}
      {result !== null && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </main>
  );
}
