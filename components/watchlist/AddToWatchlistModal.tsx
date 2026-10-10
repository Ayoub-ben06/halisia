"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCircle2,
  CircleAlert,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { halalStatusBadgeClass, type HalalStatus } from "@/lib/halal-status";
import { currencySymbol, formatQuoteAmount } from "@/lib/money";
import { useHalalStatus } from "@/lib/use-halal-status";
import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type SearchResult = {
  ticker: string;
  name: string;
  exchange: string;
  type: string;
  isin?: string;
};

type QuoteData = {
  price: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string | null;
};

function assetTypeLabel(type: string, t: (key: "stock" | "etf" | "crypto") => string): string {
  switch (type.toUpperCase()) {
    case "EQUITY":
      return t("stock");
    case "ETF":
      return t("etf");
    case "CRYPTOCURRENCY":
      return t("crypto");
    default:
      return type || t("stock");
  }
}

function dbType(type: string): string {
  const normalized = type.toUpperCase();
  if (normalized.includes("ETF")) return "etf";
  if (normalized.includes("CRYPTO")) return "crypto";
  return "stock";
}

function numeric(value: string) {
  return Number(value.replace(/\s/g, "").replace(",", "."));
}

export function AddToWatchlistModal({
  open,
  onClose,
  existingTickers,
}: {
  open: boolean;
  onClose: () => void;
  existingTickers: string[];
}) {
  const router = useRouter();
  const { t, language } = useI18n();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [halalAlert, setHalalAlert] = useState(true);
  const [priceAlert, setPriceAlert] = useState(false);
  const [priceTarget, setPriceTarget] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [toast, setToast] = useState("");

  const { status: halalStatus, loading: halalStatusLoading } =
    useHalalStatus(selected);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => searchRef.current?.focus(), 100);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    const value = query.trim();
    if (!value || selected) {
      setResults([]);
      setSearchOpen(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(
          `/api/search-assets?q=${encodeURIComponent(value)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error(t("searchUnavailable"));
        setResults(await response.json());
        setSearchOpen(true);
      } catch (fetchError) {
        if (!(
          fetchError instanceof DOMException && fetchError.name === "AbortError"
        )) {
          setResults([]);
          setSearchOpen(true);
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, selected]);

  function resetForm() {
    setQuery("");
    setResults([]);
    setSearchOpen(false);
    setSelected(null);
    setQuote(null);
    setHalalAlert(true);
    setPriceAlert(false);
    setPriceTarget("");
    setError("");
    setDuplicateWarning(false);
  }

  function handleClose() {
    if (submitting) return;
    resetForm();
    onClose();
  }

  async function chooseAsset(asset: SearchResult) {
    setSelected(asset);
    setQuery(asset.name);
    setSearchOpen(false);
    setQuote(null);
    setQuoteLoading(true);
    setError("");
    setDuplicateWarning(
      existingTickers.some(
        (ticker) => ticker.toUpperCase() === asset.ticker.toUpperCase(),
      ),
    );

    try {
      const response = await fetch(
        `/api/quote?ticker=${encodeURIComponent(asset.ticker)}`,
      );
      if (!response.ok) throw new Error(t("unavailable"));
      setQuote(await response.json());
    } catch {
      setQuote({
        price: null,
        change: null,
        changePercent: null,
        currency: null,
      });
    } finally {
      setQuoteLoading(false);
    }
  }

  function clearSelection() {
    setSelected(null);
    setQuery("");
    setQuote(null);
    setDuplicateWarning(false);
    setError("");
  }

  async function handleSubmit() {
    if (!selected || duplicateWarning) return;
    setSubmitting(true);
    setError("");

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) throw new Error(t("sessionExpired"));

      const { error: insertError } = await supabase.from("watchlist").insert({
        user_id: user.id,
        ticker: selected.ticker,
        isin: selected.isin ?? null,
        name: selected.name,
        exchange: selected.exchange || null,
        type: dbType(selected.type),
      });

      if (insertError) {
        if (insertError.code === "23505") {
          setDuplicateWarning(true);
          setError(t("watchlistAlreadyAdded"));
          return;
        }
        if (insertError.message.includes("FREE_WATCHLIST_LIMIT")) {
          setError(t("freeWatchlistLimit"));
          return;
        }
        if (insertError.message.includes("PREMIUM_ALERTS_REQUIRED")) {
          setError(t("premiumAlertsRequired"));
          return;
        }
        throw insertError;
      }

      if (halalAlert) {
        const { error: alertError } = await supabase
          .from("watchlist_alerts")
          .insert({
            user_id: user.id,
            ticker: selected.ticker,
            name: selected.name,
            alert_type: "halal_change",
            is_active: true,
          });
        if (alertError) throw alertError;
      }

      if (priceAlert) {
        const target = numeric(priceTarget);
        if (!Number.isFinite(target) || target <= 0) {
          setError(t("validPriceTarget"));
          return;
        }
        const { error: alertError } = await supabase
          .from("watchlist_alerts")
          .insert({
            user_id: user.id,
            ticker: selected.ticker,
            name: selected.name,
            alert_type: "price_target",
            price_target: target,
            is_active: true,
          });
        if (alertError) throw alertError;
      }

      const shortName = selected.name.split(" ")[0];
      setToast(t("addedToWatchlist").replace("{name}", shortName));
      handleClose();
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t("genericError"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  const changePositive = (quote?.changePercent ?? 0) >= 0;

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
        <DialogContent className="flex min-h-[620px] max-h-[calc(100vh-2rem)] flex-col overflow-y-auto border-white/[0.05] bg-[#111412] p-0 text-[#ffffff] sm:max-w-[560px]">
          <DialogHeader className="px-5 pt-5 sm:px-8 sm:pt-7">
            <DialogTitle>{t("addToWatchlist")}</DialogTitle>
            <DialogDescription className="text-[rgba(255,255,255,0.6)]">
              {t("searchHalalAsset")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-5 pb-5 sm:px-8 sm:pb-8">
            <div className="relative">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-[#8f8878]" />
              <Input
                ref={searchRef}
                value={query}
                onChange={(event) => {
                  if (selected) clearSelection();
                  setQuery(event.target.value);
                }}
                onFocus={() => query.trim() && !selected && setSearchOpen(true)}
                placeholder={t("searchAssetPlaceholder")}
                className="h-11 border-[#4d4637] bg-[#1a1c1a] pl-10 pr-10"
              />
              {query && (
                <button
                  type="button"
                  onClick={clearSelection}
                  aria-label={t("clearSearch")}
                  className="absolute right-3 top-3 text-[#8f8878] hover:text-[#ffffff]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {searchOpen && !selected && (
                <div className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-md border border-[#4d4637] bg-[#1b201c] shadow-xl">
                  {searching ? (
                    <p className="flex items-center gap-2 p-4 text-sm text-[rgba(255,255,255,0.6)]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("searchInProgress")}
                    </p>
                  ) : results.length ? (
                    results.map((result) => {
                      return (
                        <button
                          key={`${result.ticker}-${result.exchange}`}
                          type="button"
                          onClick={() => void chooseAsset(result)}
                          className="flex w-full items-center gap-3 border-b border-white/[0.05] px-4 py-3 text-left last:border-0 hover:bg-[#282d29]"
                        >
                          <span className="min-w-0 flex-1 truncate text-sm">
                            <strong>{result.ticker}</strong>{" "}
                            <span className="text-[rgba(255,255,255,0.6)]">
                              {result.name}
                            </span>
                          </span>
                          {result.exchange && (
                            <span className="shrink-0 text-xs text-[#8f8878]">
                              {result.exchange}
                            </span>
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <p className="p-4 text-sm text-[#8f8878]">
                      {t("noAssetFound")}
                    </p>
                  )}
                </div>
              )}
            </div>

            {selected && (
              <div className="rounded-xl border border-[#c9a84c] bg-[#1a1c1a] p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1a1c1a] text-sm font-bold text-[#ffffff]">
                    {selected.ticker.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-[#ffffff]">
                          {selected.name}
                        </p>
                        <p className="text-xs text-[#8f8878]">
                          {selected.ticker}
                          {selected.exchange ? ` • ${selected.exchange}` : ""}
                        </p>
                      </div>
                      {halalStatusLoading && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase text-[rgba(255,255,255,0.6)]">
                          <Loader2 className="h-3 w-3 animate-spin" /> {t("analysisInProgress")}
                        </span>
                      )}
                      {halalStatus && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${halalStatusBadgeClass(halalStatus)}`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {halalStatusText(halalStatus, t)}
                        </span>
                      )}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-[#8f8878]">{t("portfolioType")}</p>
                        <p className="font-semibold">
                          {assetTypeLabel(selected.type, t)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#8f8878]">
                          {t("currentPrice")}
                        </p>
                        {quoteLoading ? (
                          <p className="text-[rgba(255,255,255,0.6)]">
                            {t("loading")}
                          </p>
                        ) : quote?.price != null ? (
                          <p>
                            <span className="text-lg font-bold">
                              {formatQuoteAmount(quote.price, quote.currency)}
                            </span>
                            {quote.changePercent != null && (
                              <span
                                className={`ml-2 text-xs font-semibold ${changePositive ? "text-halal-compliant" : "text-halal-nonCompliant"}`}
                              >
                                {changePositive ? "+" : ""}
                                {new Intl.NumberFormat(language === "en" ? "en-US" : "fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(quote.changePercent)} %
                              </span>
                            )}
                          </p>
                        ) : (
                          <p className="text-[#8f8878]">{t("unavailable")}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {duplicateWarning && (
              <p className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
                <CircleAlert className="h-4 w-4 shrink-0" />
                {t("watchlistAlreadyAdded")}
              </p>
            )}

            {selected && !duplicateWarning && (
              <div className="space-y-4 rounded-xl border border-white/[0.05] bg-[#1a1c1a] p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-[#e6c364]">
                  <Bell className="h-4 w-4" />
                  {t("configureAlert")} ({t("optional")})
                </p>

                <AlertToggle
                  title={t("halalStatusAlert")}
                  subtitle={t("emailOnHalalChange")}
                  checked={halalAlert}
                  onChange={setHalalAlert}
                />

                <div className="space-y-3">
                  <AlertToggle
                    title={t("priceTargetAlert")}
                    checked={priceAlert}
                    onChange={setPriceAlert}
                  />
                  {priceAlert && (
                    <div className="relative pl-1">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={priceTarget}
                        onChange={(event) => setPriceTarget(event.target.value)}
                        placeholder={t("priceExample")}
                        className="h-11 border-[#4d4637] bg-[#111412] pr-10"
                      />
                      <span className="pointer-events-none absolute right-3 top-3 text-sm text-[#8f8878]">
                        {currencySymbol(quote?.currency)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && !duplicateWarning && (
              <p className="flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
                <CircleAlert className="h-4 w-4 shrink-0" />
                {error}
              </p>
            )}

            <DialogFooter className="gap-2 border-t border-white/[0.05] pt-4 sm:justify-between">
              <Button
                variant="ghost"
                onClick={handleClose}
                disabled={submitting}
              >
                {t("cancelAction")}
              </Button>
              <Button
                onClick={() => void handleSubmit()}
                disabled={!selected || duplicateWarning || submitting}
                className="gap-2 bg-[#c9a84c] font-bold text-[#111412] hover:bg-[#e6c364]"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>+ {t("addToWatchlist")}</>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-[200] flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-[#111412] px-4 py-3 text-sm text-white shadow-xl"
        >
          <CheckCircle2 className="h-5 w-5 text-halal-compliant" />
          {toast}
        </div>
      )}
    </>
  );
}

function halalStatusText(
  status: HalalStatus,
  t: (key: "statusCompliant" | "statusDoubtful" | "statusNonCompliant" | "notAnalyzed") => string,
) {
  return status === "compliant"
    ? t("statusCompliant")
    : status === "debated"
      ? t("statusDoubtful")
      : status === "non_compliant"
        ? t("statusNonCompliant")
        : t("notAnalyzed");
}

function AlertToggle({
  title,
  subtitle,
  checked,
  onChange,
}: {
  title: string;
  subtitle?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-[#ffffff]">{title}</p>
        {subtitle && <p className="mt-1 text-xs text-[#8f8878]">{subtitle}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${checked ? "bg-[#c9a84c]" : "bg-[#344038]"}`}
      >
        <span
          className={`absolute flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`}
        >
          {checked && <Check className="h-3 w-3 text-[#c9a84c]" />}
        </span>
      </button>
    </div>
  );
}
