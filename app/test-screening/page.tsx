"use client";

import { FormEvent, useState } from "react";

type IsinResolution = {
  ticker?: string;
  error?: string;
};

type ScreeningResult = {
  companyName: string;
  logo?: string;
  sector: string;
  debtRatio: number;
  interestRatio: number;
  sectorForbidden: boolean;
  debtPassed: boolean;
  interestPassed: boolean;
};

function percentage(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function TestScreeningPage() {
  const [isin, setIsin] = useState("FR0000120073");
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const normalizedIsin = isin.trim().toUpperCase();
      const mappingResponse = await fetch("/api/resolve-isin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isin: normalizedIsin }),
      });

      const mappingResult = (await mappingResponse.json()) as IsinResolution;
      if (!mappingResponse.ok) {
        throw new Error(mappingResult.error ?? "ISIN introuvable.");
      }

      const ticker = mappingResult.ticker;

      if (!ticker) {
        throw new Error("ISIN introuvable.");
      }

      const screeningResponse = await fetch("/api/alpha-screening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      const screeningResult = (await screeningResponse.json()) as
        | ScreeningResult
        | { error: string };

      if (!screeningResponse.ok || "error" in screeningResult) {
        throw new Error(
          "error" in screeningResult
            ? screeningResult.error
            : "Screening impossible.",
        );
      }

      setResult(screeningResult);
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

  const allPassed =
    result &&
    !result.sectorForbidden &&
    result.debtPassed &&
    result.interestPassed;
  return (
    <main className="min-h-screen bg-[#111412] px-4 py-12 text-white">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-3xl font-bold text-[#C9A84C]">
          Screening halal
        </h1>

        <form onSubmit={analyze} className="grid gap-4">
          <label className="grid gap-2">
            <span>ISIN</span>
            <input
              value={isin}
              onChange={(event) => setIsin(event.target.value)}
              placeholder="FR0000120073"
              required
              className="rounded border border-[#C9A84C] bg-[#13273B] px-4 py-3 outline-none"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="rounded bg-[#C9A84C] px-5 py-3 font-bold text-[#111412] disabled:opacity-60"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#111412] border-t-transparent" />
                Analyse en cours…
              </span>
            ) : (
              "Analyser"
            )}
          </button>
        </form>

        {error && (
          <p className="mt-6 rounded border border-red-500 bg-red-950/50 p-4 text-red-200">
            {error}
          </p>
        )}

        {result && (
          <section className="mt-8 rounded-lg border border-[#C9A84C] bg-[#13273B] p-6">
            <header className="mb-6 flex items-center gap-4">
              {result.logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={result.logo}
                  alt=""
                  className="h-14 w-14 rounded bg-white object-contain p-1"
                />
              )}
              <div>
                <h2 className="text-2xl font-bold">{result.companyName}</h2>
                <p className="text-white/70">{result.sector}</p>
              </div>
            </header>

            <div className="space-y-3">
              <p>
                {result.sectorForbidden
                  ? `❌ NON CONFORME - Secteur interdit : ${result.sector}`
                  : `✅ Secteur autorisé : ${result.sector}`}
              </p>
              <p>
                {result.debtPassed ? "✅" : "⚠️ À PURGER -"} {" "}
                Ratio dette {result.debtPassed ? "OK" : "trop élevé"} ({percentage(result.debtRatio)})
              </p>
              <p>
                {result.interestPassed ? "✅" : "⚠️ À PURGER -"} {" "}
                Revenus d’intérêts {result.interestPassed ? "OK" : "trop élevés"} ({percentage(result.interestRatio)})
              </p>
            </div>

            <p className="mt-8 text-2xl font-bold text-[#C9A84C]">
              {allPassed
                ? "✅ CONFORME - Cette action est halal"
                : result.sectorForbidden
                  ? "❌ NON CONFORME - Secteur interdit"
                  : "⚠️ À PURGER - Un ou plusieurs ratios dépassent les seuils"}
            </p>

          </section>
        )}
      </div>
    </main>
  );
}
