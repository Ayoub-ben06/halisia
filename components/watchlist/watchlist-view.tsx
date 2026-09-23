"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Binoculars,
  CheckCircle2,
  CircleAlert,
  Eye,
  Info,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  halalStatusBadgeClass,
  halalStatusLabel,
  isWatchlistCompliant,
  isWatchlistToMonitor,
  type HalalStatus,
} from "@/lib/halal-status";
import { AddAssetModal } from "@/components/dashboard/add-asset-modal";
import { AddToWatchlistModal } from "@/components/watchlist/AddToWatchlistModal";

export type WatchlistItem = {
  id: string;
  ticker: string;
  isin: string | null;
  name: string;
  exchange: string | null;
  type: string;
  addedAt: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  halalStatus: HalalStatus;
  sparkline: number[];
};

export type WatchlistAlert = {
  id: string;
  ticker: string;
  name: string;
  alertType: "halal_change" | "price_target";
  priceTarget: number | null;
  isActive: boolean;
};

const euro = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});
const pct = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function WatchlistView({
  items,
  alerts,
  complianceAlertsEnabled = false,
  priceAlertsEnabled = false,
}: {
  items: WatchlistItem[];
  alerts: WatchlistAlert[];
  complianceAlertsEnabled?: boolean;
  priceAlertsEnabled?: boolean;
}) {
  const pausedAlerts = [
    !complianceAlertsEnabled && alerts.some((alert) => alert.isActive && alert.alertType === "halal_change") ? "de conformité" : null,
    !priceAlertsEnabled && alerts.some((alert) => alert.isActive && alert.alertType === "price_target") ? "de prix" : null,
  ].filter(Boolean);
  const router = useRouter();
  const [watchlistModalOpen, setWatchlistModalOpen] = useState(false);
  const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);
  const [portfolioInitialAsset, setPortfolioInitialAsset] = useState<{
    ticker: string;
    name: string;
    exchange: string;
    type: string;
    isin?: string;
  } | null>(null);
  const [toast, setToast] = useState("");
  const [errorToast, setErrorToast] = useState("");

  const compliantCount = items.filter((item) =>
    isWatchlistCompliant(item.halalStatus),
  ).length;
  const monitorCount = items.filter((item) =>
    isWatchlistToMonitor(item.halalStatus),
  ).length;

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 4000);
  }

  function showError(message: string) {
    setErrorToast(message);
    window.setTimeout(() => setErrorToast(""), 4000);
  }

  async function deleteItem(id: string) {
    try {
      const supabase = createClient();
      const { error } = await supabase.from("watchlist").delete().eq("id", id);
      if (error) throw error;
      showToast("Retiré de la watchlist");
      router.refresh();
    } catch {
      showError("Une erreur est survenue");
    }
  }

  async function toggleAlert(id: string, isActive: boolean) {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("watchlist_alerts")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
      router.refresh();
    } catch {
      showError("Une erreur est survenue");
    }
  }

  function openPortfolioModal(item: WatchlistItem) {
    setPortfolioInitialAsset({
      ticker: item.ticker,
      name: item.name,
      exchange: item.exchange ?? "",
      type: item.type,
      isin: item.isin ?? undefined,
    });
    setPortfolioModalOpen(true);
  }

  return (
    <div className="mx-auto max-w-[1280px] text-[#ffffff]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Watchlist</h1>
          <p className="mt-1 text-sm text-[rgba(255,255,255,0.6)]">
            Suivez vos actifs halal avant d&apos;investir
          </p>
        </div>
        <button
          type="button"
          onClick={() => setWatchlistModalOpen(true)}
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#c9a84c] px-5 text-sm font-bold text-[#111412] hover:bg-[#e6c364]"
        >
          <Plus className="h-4 w-4" />
          Ajouter un actif
        </button>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        <SummaryCard
          label="Total Suivi"
          value={String(items.length)}
          suffix="actifs"
          icon={<Eye className="h-5 w-5 text-[#c9a84c]" />}
        />
        <SummaryCard
          label="Conformes"
          value={String(compliantCount)}
          icon={<CheckCircle2 className="h-5 w-5 text-halal-compliant" />}
          valueClass="text-halal-compliant"
        />
        <SummaryCard
          label="À Surveiller"
          value={String(monitorCount)}
          icon={<TriangleAlert className="h-5 w-5 text-halal-debated" />}
          valueClass="text-halal-debated"
        />
      </div>

      {items.length === 0 ? (
        <EmptyState onAdd={() => setWatchlistModalOpen(true)} />
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {items.map((item) => (
            <WatchlistCard
              key={item.id}
              item={item}
              onDelete={() => void deleteItem(item.id)}
              onAddToPortfolio={() => openPortfolioModal(item)}
            />
          ))}
        </div>
      )}

      <section className="mt-10 rounded-2xl border border-white/[0.05] bg-[#1a1c1a] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            Alertes configurées
            <Info className="h-4 w-4 text-[#8f8878]" aria-hidden />
          </h2>
          <button
            type="button"
            onClick={() => setWatchlistModalOpen(true)}
            className="text-sm font-semibold text-[#c9a84c] hover:text-[#e6c364]"
          >
            + Ajouter une alerte
          </button>
        </div>

        {pausedAlerts.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-halal-debated/30 bg-halal-debated/[0.06] px-4 py-3 text-sm">
            <p className="text-[#e8d9b0]">
              Vos alertes {pausedAlerts.join(" et ")} sont configurées mais les emails correspondants sont désactivés dans vos paramètres.
            </p>
            <Link href="/settings/notifications" className="font-semibold text-[#e6c364] hover:underline">
              Activer les emails
            </Link>
          </div>
        )}

        {alerts.length === 0 ? (
          <p className="mt-6 text-sm text-[#8f8878]">
            Aucune alerte configurée pour le moment.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-white/[0.05]">
            {alerts.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                onToggle={(active) => void toggleAlert(alert.id, active)}
              />
            ))}
          </ul>
        )}
      </section>

      <AddToWatchlistModal
        open={watchlistModalOpen}
        onClose={() => setWatchlistModalOpen(false)}
        existingTickers={items.map((item) => item.ticker)}
      />

      <AddAssetModal
        open={portfolioModalOpen}
        onClose={() => {
          setPortfolioModalOpen(false);
          setPortfolioInitialAsset(null);
        }}
        initialAsset={portfolioInitialAsset}
      />

      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-[200] flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-[#111412] px-4 py-3 text-sm text-white shadow-xl"
        >
          <CheckCircle2 className="h-5 w-5 text-halal-compliant" />
          {toast}
        </div>
      )}

      {errorToast && (
        <div
          role="alert"
          className="fixed bottom-5 right-5 z-[200] flex items-center gap-2 rounded-lg border border-red-500/40 bg-[#111412] px-4 py-3 text-sm text-red-300 shadow-xl"
        >
          <CircleAlert className="h-5 w-5 shrink-0" />
          {errorToast}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  suffix,
  icon,
  valueClass,
}: {
  label: string;
  value: string;
  suffix?: string;
  icon: ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-[#1a1c1a] p-6">
      <div className="flex items-center justify-between text-sm text-[rgba(255,255,255,0.6)]">
        <span>{label}</span>
        {icon}
      </div>
      <p className={`mt-3 text-3xl font-bold ${valueClass ?? "text-[#ffffff]"}`}>
        {value}
        {suffix && (
          <span className="ml-2 text-sm font-normal text-[#8f8878]">{suffix}</span>
        )}
      </p>
    </div>
  );
}

function WatchlistCard({
  item,
  onDelete,
  onAddToPortfolio,
}: {
  item: WatchlistItem;
  onDelete: () => void;
  onAddToPortfolio: () => void;
}) {
  const positive = (item.changePercent ?? 0) >= 0;
  const initials = item.ticker.slice(0, 2).toUpperCase();

  return (
    <article className="rounded-2xl border border-white/[0.05] bg-[#1a1c1a] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1a1c1a] text-xs font-bold">
            {initials}
          </span>
          <Link href={`/asset/${encodeURIComponent(item.ticker)}`} className="min-w-0 hover:text-[#e6c364]">
            <p className="truncate font-bold">{item.name}</p>
            <p className="text-xs text-[#8f8878]">{item.ticker}</p>
          </Link>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${halalStatusBadgeClass(item.halalStatus)}`}
        >
          {halalStatusLabel(item.halalStatus)}
        </span>
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          {item.price != null ? (
            <p className="text-2xl font-bold">{euro.format(item.price)}</p>
          ) : (
            <p className="text-lg text-[#8f8878]">Prix indisponible</p>
          )}
          {item.changePercent != null && item.change != null && (
            <p
              className={`mt-1 flex items-center gap-1 text-sm font-semibold ${positive ? "text-halal-compliant" : "text-halal-nonCompliant"}`}
            >
              {positive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {positive ? "+" : ""}
              {pct.format(item.changePercent)} % ({positive ? "+" : ""}
              {euro.format(item.change)})
            </p>
          )}
        </div>
        {item.sparkline.length > 1 && (
          <Sparkline points={item.sparkline} positive={item.sparkline[item.sparkline.length - 1] >= item.sparkline[0]} />
        )}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-white/[0.05] pt-4">
        <p className="text-xs text-[#8f8878]">
          Ajouté le {dateFmt.format(new Date(item.addedAt))}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Retirer ${item.name} de la watchlist`}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#344038] text-[rgba(255,255,255,0.6)] hover:border-red-500/40 hover:text-halal-nonCompliant"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onAddToPortfolio}
            aria-label={`Ajouter ${item.name} au portefeuille`}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#c9a84c]/40 text-[#c9a84c] hover:bg-[#c9a84c]/10"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

function Sparkline({
  points,
  positive,
}: {
  points: number[];
  positive: boolean;
}) {
  const width = 100;
  const height = 36;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const path = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((point - min) / range) * (height - 4) - 2;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-9 w-24 shrink-0"
      aria-hidden
    >
      <path
        d={path}
        fill="none"
        stroke={positive ? "#34d399" : "#f472b6"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AlertRow({
  alert,
  onToggle,
}: {
  alert: WatchlistAlert;
  onToggle: (active: boolean) => void;
}) {
  const description =
    alert.alertType === "halal_change"
      ? "Changement du statut Halal"
      : alert.priceTarget != null
        ? `Prix inférieur à ${euro.format(alert.priceTarget)}`
        : "Alerte prix";

  return (
    <li className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1a1c1a] text-[10px] font-bold">
          {alert.ticker.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{alert.name}</p>
          <p className="truncate text-xs text-[#8f8878]">{description}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={alert.isActive}
        aria-label={`Activer l'alerte pour ${alert.name}`}
        onClick={() => onToggle(!alert.isActive)}
        className={`relative flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${alert.isActive ? "bg-[#c9a84c]" : "bg-[#344038]"}`}
      >
        <span
          className={`absolute h-5 w-5 rounded-full bg-white shadow transition-transform ${alert.isActive ? "translate-x-6" : "translate-x-1"}`}
        />
      </button>
    </li>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#344038] bg-[#1a1c1a]/50 px-6 py-16 text-center">
      <Binoculars className="h-12 w-12 text-[#c9a84c]" />
      <h2 className="mt-5 text-xl font-bold">Votre watchlist est vide</h2>
      <p className="mt-2 max-w-sm text-sm text-[rgba(255,255,255,0.6)]">
        Ajoutez des actifs halal à surveiller avant d&apos;investir
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-[#c9a84c] px-5 text-sm font-bold text-[#111412] hover:bg-[#e6c364]"
      >
        <Plus className="h-4 w-4" />
        Ajouter un actif
      </button>
    </div>
  );
}
