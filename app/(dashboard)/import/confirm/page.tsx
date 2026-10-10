"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  CircleAlert,
  Droplets,
  Loader2,
  Pencil,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { recordTransaction } from "@/lib/portfolio-mutations";
import { fetchEurUsdRate, formatPriceWithFx, toEur } from "@/lib/import/currency";
import {
  clearPendingImport,
  loadPendingImport,
  screenInBatches,
} from "@/lib/import/pending-import";
import type {
  ImportAccount,
  ImportAssetType,
  ImportHalalStatus,
  PendingImportAsset,
} from "@/lib/import/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/components/providers/i18n-provider";

type ConfirmAsset = PendingImportAsset & {
  status: ImportHalalStatus;
  reason?: string | null;
  purificationRatio?: number | null;
  prixAchatEur: number;
  currentPriceEur: number;
  tickerVerified?: "ok" | "fail" | "pending" | null;
  tickerVerifyMessage?: string;
};

const euro = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

const typeLabel: Record<ImportAssetType, string> = {
  stock: "Action",
  etf: "ETF Halal",
  crypto: "Crypto",
  gold: "Or",
  cash: "Cash",
};

const statusMeta: Record<
  ImportHalalStatus,
  { label: string; border: string; badge: string }
> = {
  compliant: {
    label: "Conforme Shariah",
    border: "border-l-emerald-500",
    badge: "bg-emerald-500/15 text-emerald-300",
  },
  debated: {
    label: "Statut douteux",
    border: "border-l-amber-500",
    badge: "bg-amber-500/15 text-amber-300",
  },
  non_compliant: {
    label: "Non conforme",
    border: "border-l-red-500",
    badge: "bg-red-500/15 text-red-300",
  },
  unknown: {
    label: "À analyser",
    border: "border-l-white/20",
    badge: "bg-white/10 text-white/60",
  },
};

function dbType(type: ImportAssetType) {
  return type === "stock" ? "stock" : type;
}

async function screenAsset(ticker: string, isin?: string | null) {
  try {
    const response = await fetch("/api/halal-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tickers: [ticker] }),
    });
    if (!response.ok) return { status: "unknown" as const, reason: null, purificationRatio: null };
    const data = (await response.json()) as Record<
      string,
      { status: ImportHalalStatus; reason?: string | null }
    >;
    const key = ticker.trim().toUpperCase();
    const hit = data[key];
    return {
      status: hit?.status ?? "unknown",
      reason: hit?.reason ?? null,
      purificationRatio: null as number | null,
      isin,
    };
  } catch {
    return { status: "unknown" as const, reason: null, purificationRatio: null };
  }
}

export default function ImportConfirmPage() {
  const router = useRouter();
  const { t, language } = useI18n();
  const [assets, setAssets] = useState<ConfirmAsset[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [progressLabel, setProgressLabel] = useState("Chargement…");
  const [enrichDone, setEnrichDone] = useState(0);
  const [enrichTotal, setEnrichTotal] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [eurUsdRate, setEurUsdRate] = useState(1.09);

  const enrich = useCallback(async (pending: PendingImportAsset[]) => {
    setLoading(true);
    setEnrichTotal(pending.length);
    setEnrichDone(0);
    setProgressLabel(t("analyzing"));

    const rate = await fetchEurUsdRate();
    setEurUsdRate(rate);

    const priceBody = {
      assets: pending.map((asset) => ({
        isin: asset.isin ?? asset.ticker,
        ticker: asset.ticker,
        name: asset.name,
        currency: asset.currency || "EUR",
      })),
    };

    let prices: Record<string, number | null> = {};
    try {
      const response = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(priceBody),
      });
      if (response.ok) prices = (await response.json()) as Record<string, number | null>;
    } catch {
      prices = {};
    }

    const screenable = pending.filter(
      (asset) => asset.type === "stock" || asset.type === "etf",
    );
    let screened = 0;
    const screeningMap = new Map<string, Awaited<ReturnType<typeof screenAsset>>>();

    await screenInBatches(
      screenable,
      async (asset) => {
        const result = await screenAsset(asset.ticker, asset.isin);
        screeningMap.set(asset.id, result);
        screened += 1;
        setEnrichDone(screened);
        setProgressLabel(`${t("analyzing")} ${screened}/${screenable.length || pending.length}`);
        return result;
      },
      3,
      500,
    );

    const next: ConfirmAsset[] = pending.map((asset) => {
      const prixAchatEur = toEur(asset.averageBuyPrice, asset.currency, rate);
      const yahooPrice = prices[asset.ticker] ?? null;
      const rawCurrent = asset.currentPrice ?? yahooPrice ?? asset.averageBuyPrice;
      const currentPriceEur = asset.currentPrice != null
        ? toEur(asset.currentPrice, asset.currency, rate)
        : yahooPrice ?? prixAchatEur;

      let status: ImportHalalStatus = "unknown";
      let reason: string | null = null;
      if (asset.type === "gold") status = "compliant";
      else if (asset.type === "crypto") status = "debated";
      else if (/ISLAMIC|SHARIAH|SHARIA/i.test(asset.name)) status = "compliant";
      else {
        const screenedHit = screeningMap.get(asset.id);
        status = screenedHit?.status ?? "unknown";
        reason = screenedHit?.reason ?? null;
      }

      if (asset.formatError) status = "unknown";

      return {
        ...asset,
        averageBuyPrice: asset.averageBuyPrice,
        currentPrice: rawCurrent ?? undefined,
        prixAchatEur,
        currentPriceEur,
        status,
        reason,
        purificationRatio: status === "compliant" ? 0.0074 : null,
        tickerVerified: null,
      };
    });

    setAssets(next);
    setEnrichDone(pending.length);
    setLoading(false);
  }, []);

  useEffect(() => {
    const payload = loadPendingImport();
    if (!payload?.assets?.length) {
      router.replace("/portfolio");
      return;
    }
    setFileName(payload.fileName ?? "");
    void enrich(payload.assets);
  }, [enrich, router]);

  const stats = useMemo(() => {
    const detected = assets.length;
    const compliant = assets.filter((a) => a.status === "compliant" && !a.formatError).length;
    const debated = assets.filter((a) => a.status === "debated" && !a.formatError).length;
    const errors = assets.filter((a) => a.formatError).length;
    const ready = assets.filter((a) => !a.formatError && a.quantity > 0 && a.prixAchatEur > 0).length;
    return { detected, compliant, debated, errors, ready };
  }, [assets]);

  async function verifyTicker(id: string, ticker: string) {
    setAssets((prev) =>
      prev.map((asset) =>
        asset.id === id
          ? { ...asset, tickerVerified: "pending", tickerVerifyMessage: "Vérification…" }
          : asset,
      ),
    );
    try {
      const response = await fetch(`/api/search-assets?q=${encodeURIComponent(ticker)}`);
      if (!response.ok) throw new Error();
      const results = (await response.json()) as { ticker: string; name: string }[];
      const match = results.find(
        (item) => item.ticker.toUpperCase() === ticker.trim().toUpperCase(),
      ) ?? results[0];
      if (!match) {
        setAssets((prev) =>
          prev.map((asset) =>
            asset.id === id
              ? {
                  ...asset,
                  tickerVerified: "fail",
                  tickerVerifyMessage: "❌ Ticker non trouvé",
                }
              : asset,
          ),
        );
        return;
      }
      setAssets((prev) =>
        prev.map((asset) =>
          asset.id === id
            ? {
                ...asset,
                ticker: match.ticker,
                name: asset.name || match.name,
                tickerVerified: "ok",
                tickerVerifyMessage: `✅ ${match.ticker} trouvé: ${match.name}`,
                formatError: null,
              }
            : asset,
        ),
      );
    } catch {
      setAssets((prev) =>
        prev.map((asset) =>
          asset.id === id
            ? {
                ...asset,
                tickerVerified: "fail",
                tickerVerifyMessage: "❌ Ticker non trouvé",
              }
            : asset,
        ),
      );
    }
  }

  function updateAsset(id: string, patch: Partial<ConfirmAsset>) {
    setAssets((prev) =>
      prev.map((asset) => {
        if (asset.id !== id) return asset;
        const next = { ...asset, ...patch };
        if (patch.averageBuyPrice != null || patch.currency) {
          next.prixAchatEur = toEur(next.averageBuyPrice, next.currency, eurUsdRate);
        }
        if (patch.quantity != null && next.quantity <= 0) next.formatError = "Quantité invalide";
        else if (patch.averageBuyPrice != null && next.averageBuyPrice <= 0) {
          next.formatError = "Prix invalide";
        } else if (patch.purchaseDate && patch.purchaseDate > new Date().toISOString().slice(0, 10)) {
          next.formatError = "Date dans le futur";
        } else if (next.formatError && !patch.formatError) {
          next.formatError = null;
        }
        return next;
      }),
    );
  }

  function removeAsset(id: string) {
    setAssets((prev) => prev.filter((asset) => asset.id !== id));
  }

  async function importAll() {
    const valid = assets.filter((asset) => !asset.formatError && asset.quantity > 0 && asset.prixAchatEur > 0);
    if (!valid.length) {
      setError("Aucun actif valide à importer.");
      return;
    }
    setImporting(true);
    setImportProgress(0);
    setError("");
    try {
      const entitlementResponse = await fetch("/api/entitlements");
      const entitlement = await entitlementResponse.json() as { plan?: string };
      if (entitlement.plan === "free") throw new Error(t("premiumImportRequired"));
      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Session expirée. Veuillez vous reconnecter.");

      let imported = 0;
      for (const asset of valid) {
        const broker = asset.broker;
        if (asset.type === "gold") {
          const { error: goldError } = await supabase.from("gold_assets").upsert(
            {
              user_id: user.id,
              name: asset.name,
              ticker: asset.ticker || "XAU",
              quantity_grams: asset.quantity,
              average_buy_price_per_gram: asset.prixAchatEur,
              current_price_per_gram: asset.currentPriceEur || asset.prixAchatEur,
              total_invested: asset.quantity * asset.prixAchatEur,
              currency: "EUR",
              broker,
              halal_status: "compliant",
            },
            { onConflict: "user_id,ticker,broker" },
          );
          if (goldError) throw goldError;
        } else if (asset.type === "crypto") {
          const { error: cryptoError } = await supabase.from("crypto_assets").upsert(
            {
              user_id: user.id,
              name: asset.name,
              ticker: asset.ticker,
              quantity: asset.quantity,
              average_buy_price: asset.prixAchatEur,
              current_price: asset.currentPriceEur || asset.prixAchatEur,
              total_invested: asset.quantity * asset.prixAchatEur,
              currency: "EUR",
              broker,
              halal_status: asset.status === "unknown" ? "debated" : asset.status,
            },
            { onConflict: "user_id,ticker,broker" },
          );
          if (cryptoError) throw cryptoError;
        } else {
          const { data: inserted, error: assetError } = await supabase
            .from("assets")
            .upsert(
              {
                user_id: user.id,
                name: asset.name,
                ticker: asset.ticker,
                isin: asset.isin ?? null,
                type: dbType(asset.type),
                quantity: asset.quantity,
                average_buy_price: asset.prixAchatEur,
                current_price: asset.currentPriceEur || asset.prixAchatEur,
                currency: "EUR",
                broker,
                account_type: asset.account,
                purchase_date: asset.purchaseDate,
                halal_status: asset.status,
              },
              { onConflict: "user_id,ticker,purchase_date", ignoreDuplicates: true },
            )
            .select("id");
          if (assetError) throw assetError;
          if (inserted?.length) {
            await recordTransaction({
              position: {
                name: asset.name,
                ticker: asset.ticker,
                assetClass: dbType(asset.type),
                account: asset.account,
              },
              side: "buy",
              quantity: asset.quantity,
              price: asset.prixAchatEur,
              date: asset.purchaseDate,
              broker,
            });
          }
        }
        imported += 1;
        setImportProgress(imported);
      }

      clearPendingImport();
      setToast(`${imported} actifs importés avec succès ✅`);
      window.setTimeout(() => {
        router.push(`/portfolio?imported=${imported}`);
      }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "L’import a échoué.");
    } finally {
      setImporting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <p className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-[#c9a84c]">
          Étape 2 sur 2 • Validation Shariah & revue des actifs
        </p>
        <h1 className="text-2xl font-bold text-white">Confirmez vos actifs</h1>
        <p className="mt-4 flex items-center gap-2 text-sm text-[#e6c364]">
          <Loader2 className="h-4 w-4 animate-spin" />
          {progressLabel}
          {enrichTotal > 0 ? ` (${enrichDone}/${enrichTotal})` : ""}
        </p>
        <div className="mt-8 space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-xl border border-white/[0.06] bg-[#1a1c1a]"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c9a84c]">
            {language === "en" ? "Step 2 of 2 • " : "Étape 2 sur 2 • "}{t("shariaValidation")}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{t("confirmAssets")}</h1>
            {fileName && (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                {fileName}
              </span>
            )}
          </div>
          <p className="mt-2 max-w-2xl text-sm text-white/55">
            {t("validationSubtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="text-white/70"
            onClick={() => {
              clearPendingImport();
              router.push("/portfolio");
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("changeFile")}
          </Button>
          <Link
            href="/portfolio"
            aria-label="Fermer"
            className="rounded-md p-2 text-white/50 hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Link>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<BarChart3 className="h-4 w-4" />} label={language === "en" ? "Detected" : "Détectés"} value={`${stats.detected} ${stats.detected > 1 ? t("detectedPlural") : t("detected")}`} />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
          label={t("compliant")}
          value={`${stats.compliant} ${language === "en" ? "lines" : "lignes"}`}
          tone="text-emerald-300"
        />
        <StatCard
          icon={<TriangleAlert className="h-4 w-4 text-amber-400" />}
          label={t("doubtful")}
          value={`${stats.debated} ${language === "en" ? "alert" : "alerte"}${stats.debated > 1 ? "s" : ""}`}
          tone="text-amber-300"
        />
        <StatCard
          icon={<CircleAlert className="h-4 w-4 text-red-400" />}
          label={t("formatErrors")}
          value={`${stats.errors} ${language === "en" ? "to fix" : "à corriger"}`}
          tone="text-red-300"
        />
      </div>

      {error && (
        <p className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          <CircleAlert className="h-4 w-4" />
          {error}
        </p>
      )}

      <div className="space-y-4">
        {assets.map((asset) => {
          const meta = asset.formatError
            ? {
                label: "Erreur format",
                border: "border-l-red-500",
                badge: "bg-red-500/15 text-red-300",
              }
            : statusMeta[asset.status];
          const editing = editingId === asset.id;
          const gainPct =
            asset.prixAchatEur > 0
              ? ((asset.currentPriceEur - asset.prixAchatEur) / asset.prixAchatEur) * 100
              : 0;

          return (
            <article
              key={asset.id}
              className={`rounded-xl border border-white/[0.06] border-l-4 bg-[#1a1c1a] p-4 ${meta.border} ${
                editing ? "ring-1 ring-[#c9a84c]/50" : ""
              }`}
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-white">
                      {asset.ticker}{" "}
                      <span className="font-medium text-white/70">{asset.name}</span>
                    </h2>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${meta.badge}`}>
                      • {meta.label}
                    </span>
                    {editing && (
                      <span className="rounded-full bg-[#c9a84c]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#e6c364]">
                        Édition active
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    aria-label="Modifier"
                    onClick={() => setEditingId(editing ? null : asset.id)}
                    className="rounded-md p-2 text-white/50 hover:bg-white/5 hover:text-[#e6c364]"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Supprimer"
                    onClick={() => removeAsset(asset.id)}
                    className="rounded-md p-2 text-white/50 hover:bg-white/5 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {editing ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Nom de l'actif">
                    <Input
                      value={asset.name}
                      onChange={(event) => updateAsset(asset.id, { name: event.target.value })}
                      className="border-[#4d4637] bg-[#111412]"
                    />
                  </Field>
                  <Field label="Code / Symbole">
                    <Input
                      value={asset.ticker}
                      onChange={(event) =>
                        updateAsset(asset.id, {
                          ticker: event.target.value.toUpperCase(),
                          tickerVerified: null,
                        })
                      }
                      onBlur={() => void verifyTicker(asset.id, asset.ticker)}
                      className="border-[#4d4637] bg-[#111412]"
                    />
                    {asset.tickerVerifyMessage && (
                      <p className="mt-1 text-xs text-white/60">{asset.tickerVerifyMessage}</p>
                    )}
                  </Field>
                  <Field label="Type d'actif">
                    <Select
                      value={asset.type}
                      onValueChange={(value) =>
                        updateAsset(asset.id, { type: value as ImportAssetType })
                      }
                    >
                      <SelectTrigger className="border-[#4d4637] bg-[#111412]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(typeLabel) as ImportAssetType[]).map((type) => (
                          <SelectItem key={type} value={type}>
                            {typeLabel[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Compte d'affectation">
                    <Select
                      value={asset.account}
                      onValueChange={(value) =>
                        updateAsset(asset.id, { account: value as ImportAccount })
                      }
                    >
                      <SelectTrigger className="border-[#4d4637] bg-[#111412]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(["PEA", "CTO", "Compte crypto", "Autre"] as ImportAccount[]).map(
                          (account) => (
                            <SelectItem key={account} value={account}>
                              {account}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Quantité">
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={asset.quantity}
                      onChange={(event) =>
                        updateAsset(asset.id, { quantity: Number(event.target.value) })
                      }
                      className="border-[#4d4637] bg-[#111412]"
                    />
                  </Field>
                  <Field label="Prix d'achat">
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={asset.averageBuyPrice}
                      onChange={(event) =>
                        updateAsset(asset.id, { averageBuyPrice: Number(event.target.value) })
                      }
                      className="border-[#4d4637] bg-[#111412]"
                    />
                  </Field>
                  <Field label="Date d'achat">
                    <Input
                      type="date"
                      max={new Date().toISOString().slice(0, 10)}
                      value={asset.purchaseDate}
                      onChange={(event) =>
                        updateAsset(asset.id, { purchaseDate: event.target.value })
                      }
                      className="border-[#4d4637] bg-[#111412] [color-scheme:dark]"
                    />
                  </Field>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-4">
                  <Meta label="Type" value={typeLabel[asset.type]} />
                  <Meta label="Quantité" value={String(asset.quantity)} />
                  <Meta
                    label="PRU"
                    value={formatPriceWithFx(
                      asset.averageBuyPrice,
                      asset.currency,
                      asset.prixAchatEur,
                    )}
                  />
                  <Meta label="Compte" value={asset.account} />
                  <Meta
                    label="Date"
                    value={new Date(`${asset.purchaseDate}T12:00:00`).toLocaleDateString("fr-FR")}
                  />
                  <Meta
                    label="Valeur actuelle"
                    value={`${euro.format(asset.currentPriceEur * asset.quantity)} (${gainPct >= 0 ? "+" : ""}${gainPct.toFixed(1)} %)`}
                  />
                  {asset.isin && <Meta label="ISIN" value={asset.isin} />}
                </div>
              )}

              {asset.formatError && (
                <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {asset.formatError}
                </p>
              )}
              {!asset.formatError && asset.status === "compliant" && asset.purificationRatio != null && (
                <p className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                  <Droplets className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Purification requise : {(asset.purificationRatio * 100).toFixed(2)} % sur
                  dividendes (seuil d&apos;impureté &lt; 5 %)
                </p>
              )}
              {!asset.formatError && asset.status === "debated" && (
                <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {asset.reason ||
                    "Alerte Shariah : statut à surveiller selon les ratios AAOIFI."}
                </p>
              )}
            </article>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.08] bg-[#111412]/95 backdrop-blur md:left-72">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="text-xs text-white/60">
            <span className="text-emerald-300">• {stats.ready} actifs prêts</span>
            {"  "}
            <span className="text-emerald-300">• {stats.compliant} conformes</span>
            {"  "}
            <span className="text-amber-300">• {stats.debated} à surveiller</span>
            {"  "}
            <span className="text-red-300">• {stats.errors} erreur{stats.errors > 1 ? "s" : ""}</span>
            {importing && (
              <div className="mt-2">
                <p className="mb-1 text-[#e6c364]">
                  Import en cours… {importProgress}/{stats.ready} actifs ajoutés
                </p>
                <div className="h-1.5 w-48 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[#c9a84c] transition-all"
                    style={{
                      width: `${stats.ready ? (importProgress / stats.ready) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              disabled={importing}
              onClick={() => {
                clearPendingImport();
                router.push("/portfolio");
              }}
            >
              {t("cancel")}
            </Button>
            <Button
              disabled={!stats.ready || importing}
              onClick={() => void importAll()}
              className="bg-[#c9a84c] text-[#111412] hover:bg-[#e6c364]"
            >
              {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("importIntoPortfolio")} ({stats.ready})
            </Button>
          </div>
        </div>
      </div>

      {toast && (
        <div
          role="status"
          className="fixed bottom-24 right-5 z-[200] flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-[#111412] px-4 py-3 text-sm text-white shadow-xl"
        >
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#1a1c1a] p-4">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/45">
        {icon}
        {label}
      </div>
      <p className={`text-lg font-semibold ${tone ?? "text-white"}`}>{value}</p>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-white/40">{label}</p>
      <p className="font-medium text-white/90">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5 text-xs text-white/55">
      <span>{label}</span>
      {children}
    </label>
  );
}
