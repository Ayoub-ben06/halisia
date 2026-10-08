"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Check, CircleCheck, ChevronDown, Loader2, Search, ShieldCheck } from "lucide-react";
import type { CriterionResult, ScreeningResult } from "@/lib/aaoifi/types";
import { useI18n } from "@/components/providers/i18n-provider";

type SearchResult = { ticker: string; name: string; exchange: string; type: string };

export function ScreeningView({ initialSymbol }: { initialSymbol?: string }) {
  const { t, language } = useI18n();
  const locale = language === "en" ? "en-US" : "fr-FR";
  const [query, setQuery] = useState(initialSymbol?.trim().toUpperCase() || "");
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const skipNextSuggestions = useRef(false);

  useEffect(() => {
    if (initialSymbol?.trim()) void analyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (skipNextSuggestions.current) {
      skipNextSuggestions.current = false;
      setSuggestions([]);
      setSuggestionsOpen(false);
      return;
    }
    const value = query.trim();
    if (!value || value === initialSymbol?.trim().toUpperCase()) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/search-assets?q=${encodeURIComponent(value)}`, { signal: controller.signal });
        if (!response.ok) throw new Error(t("searchUnavailable"));
        const data = await response.json() as SearchResult[];
        if (!controller.signal.aborted) {
          setSuggestions(data.slice(0, 6));
          setSuggestionsOpen(true);
        }
      } catch (requestError) {
        if (!(requestError instanceof DOMException && requestError.name === "AbortError")) {
          setSuggestions([]);
          setSuggestionsOpen(true);
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [initialSymbol, query, t]);

  function chooseSuggestion(suggestion: SearchResult) {
    skipNextSuggestions.current = true;
    setQuery(suggestion.ticker);
    setSuggestionsOpen(false);
    setSuggestions([]);
    void analyze(undefined, suggestion.ticker);
  }

  async function analyze(event?: FormEvent, selectedTicker?: string) {
    event?.preventDefault();
    const ticker = (selectedTicker ?? query).trim().toUpperCase();
    if (!ticker) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/alpha-screening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      const data = await response.json() as ScreeningResult & { error?: string };
      if (!response.ok || data.error) throw new Error(data.error ?? t("analysisFailed"));
      setResult(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("analysisFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-[1180px] p-4 text-white sm:p-8">
      <section className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t("freeAudit")}
        </span>
        <h1 className="mt-5 text-3xl font-bold">{t("screeningTitle")}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{t("screeningSubtitle")}</p>
        <div className="relative mx-auto mt-7 max-w-2xl">
          <form onSubmit={analyze} className="flex gap-2 rounded-xl border border-primary/40 bg-card p-2">
            <Search className="ml-2 mt-2.5 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSuggestionsOpen(true);
              }}
              onFocus={() => query.trim() && setSuggestionsOpen(true)}
              onBlur={() => window.setTimeout(() => setSuggestionsOpen(false), 150)}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder={t("screeningPlaceholder")}
              autoComplete="off"
            />
            <button disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-xs font-bold text-primary-foreground disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("analyze")}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>
          {suggestionsOpen && query.trim() && (
            <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-border bg-card text-left shadow-2xl">
              {searching ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                  {t("searching")}
                </p>
              ) : suggestions.length ? (
                suggestions.map((suggestion) => (
                  <button
                    key={`${suggestion.ticker}-${suggestion.exchange}`}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => chooseSuggestion(suggestion)}
                    className="flex w-full items-center gap-3 border-b border-border px-4 py-3 last:border-0 hover:bg-white/[0.06]"
                  >
                    <span className="font-semibold">{suggestion.ticker}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{suggestion.name}</span>
                    <span className="text-xs text-muted-foreground">{suggestion.exchange}</span>
                  </button>
                ))
              ) : (
                <p className="px-4 py-3 text-sm text-muted-foreground">{t("noAssetFound")}</p>
              )}
            </div>
          )}
        </div>
        {error && <p className="mx-auto mt-3 max-w-2xl text-xs text-halal-nonCompliant">{error}</p>}
      </section>

      {result ? (
        <section className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between gap-4 p-5">
            <div>
              <h2 className="text-lg font-bold">{result.companyName}</h2>
              <p className="text-xs text-muted-foreground">
                {result.ticker} · {result.sector ?? t("sectorUnknown")}
              </p>
            </div>
            <span className="text-right text-[10px] uppercase text-muted-foreground">
              {result.methodology}
              <br />
              <strong className="text-white">{result.fiscalPeriod}</strong>
            </span>
          </div>
          <div
            className={`flex items-center justify-center gap-2 py-4 text-sm font-bold uppercase tracking-wide ${
              result.status === "COMPLIANT"
                ? "bg-halal-compliant text-[#07150f]"
                : result.status === "NON_COMPLIANT"
                  ? "bg-halal-nonCompliant text-white"
                  : "bg-halal-debated text-[#1b1203]"
            }`}
          >
            <CircleCheck className="h-5 w-5" />
            {result.status === "COMPLIANT"
              ? t("statusCompliant")
              : result.status === "NON_COMPLIANT"
                ? t("statusNonCompliant")
                : t("statusDoubtful")}
          </div>
          <div className="p-5">
            {(result.reason || result.note) && (
              <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-5">
                {result.reason && <p className="text-white">{result.reason}</p>}
                {result.note && <p className="mt-1 text-muted-foreground">{result.note}</p>}
                {result.confidence && (
                  <p className="mt-1 text-[10px] uppercase text-muted-foreground">
                    {t("screeningConfidence")} {result.confidence}
                  </p>
                )}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {[result.business, ...result.criteria].map((criterion) => (
                <Criterion key={criterion.key} criterion={criterion} locale={locale} />
              ))}
            </div>
            {result.limitations.length > 0 && (
              <div className="mt-5 rounded-xl border border-halal-debated/30 bg-halal-debated/[0.06] p-4">
                <p className="text-xs font-bold text-halal-debated">{t("screeningLimitationsTitle")}</p>
                <ul className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">
                  {result.limitations.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="mt-5 text-[10px] leading-4 text-muted-foreground">{t("screeningDisclaimer")}</p>
          </div>
        </section>
      ) : (
        <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-muted-foreground">{t("noAnalysisYet")}</p>
      )}
    </main>
  );
}

function Criterion({ criterion, locale }: { criterion: CriterionResult; locale: string }) {
  const { t } = useI18n();
  const passed = criterion.status === "PASS";
  const failed = criterion.status === "FAIL";

  return (
    <details
      className={`group rounded-xl border p-4 ${
        passed
          ? "border-halal-compliant/40 bg-halal-compliant/[0.05]"
          : failed
            ? "border-halal-nonCompliant/40 bg-halal-nonCompliant/[0.05]"
            : "border-halal-debated/40 bg-halal-debated/[0.05]"
      }`}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span>
          <span className="block text-[10px] text-muted-foreground">{criterion.label}</span>
          <strong className="mt-2 block text-sm">{criterion.status}</strong>
        </span>
        <span className="flex items-center gap-2">
          {passed ? (
            <Check className="h-3.5 w-3.5 text-halal-compliant" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 text-halal-debated" />
          )}
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className="mt-4 border-t border-white/10 pt-3 text-[11px] leading-5 text-muted-foreground">
        <p>{criterion.explanation}</p>
        <p className="mt-2">
          {t("screeningPeriod")} {criterion.fiscalPeriod ?? "—"} · {t("screeningConfidence")} {criterion.confidence}
          {criterion.dataSource && (
            <>
              {" "}
              · {t("screeningSource")} {criterion.dataSource}
            </>
          )}
        </p>
        {criterion.ratio !== undefined && (
          <p>
            {t("screeningRatio")}{" "}
            <strong className="text-white">{(criterion.ratio * 100).toFixed(2)} %</strong> · {t("screeningThreshold")}{" "}
            {criterion.operator} {(criterion.threshold! * 100).toFixed(0)} %
          </p>
        )}
        {criterion.numerator && (
          <p>
            {t("screeningNumerator")} {criterion.numerator.value.toLocaleString(locale)}{" "}
            {criterion.numerator.currency} · {criterion.numerator.source.provider} · {criterion.numerator.source.field}
          </p>
        )}
        {criterion.denominator && (
          <p>
            {t("screeningDenominator")} {criterion.denominator.value.toLocaleString(locale)}{" "}
            {criterion.denominator.currency} · {criterion.denominator.source.provider} · {criterion.denominator.source.field}
          </p>
        )}
      </div>
    </details>
  );
}
