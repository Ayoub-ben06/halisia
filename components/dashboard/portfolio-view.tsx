"use client";

import Link from "next/link";
import {
  CircleCheck,
  CircleHelp,
  CircleX,
  Download,
  Eye,
  HandCoins,
  Pencil,
  Plus,
  ShieldAlert,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { AddAssetModal } from "@/components/dashboard/add-asset-modal";
import {
  PositionActionsDialog,
  type PositionAction,
  type PositionActionTarget,
} from "@/components/dashboard/position-actions-dialog";
import type { AssetClass, PositionSource } from "@/lib/portfolio-mutations";
import { moneyFormatter } from "@/lib/money";

export type PortfolioRow = {
  id: string;
  source: PositionSource;
  ticker: string;
  /** Yahoo symbol of the detail page, when one exists. */
  detailTicker: string | null;
  name: string;
  type: "Action" | "ETF" | "Crypto" | "Or";
  account: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  status: "compliant" | "debated" | "non_compliant" | "unknown";
  /** Amount to purify from estimated dividends; null when unknown. */
  purification: number | null;
  purificationRatio?: number | null;
  /** Days elapsed since the asset became non-compliant (90-day rule). */
  complianceDay?: number | null;
};
type AssetFilter = "Tous" | "PEA" | "CTO" | "Crypto" | "Or";
type StatusFilter = "Tous" | PortfolioRow["status"];
const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 8 });
const typeStyles = {
  Action: "border-blue-500/50 bg-blue-500/10 text-blue-300",
  ETF: "border-teal-500/50 bg-teal-500/10 text-teal-300",
  Crypto: "border-amber-500/50 bg-amber-500/10 text-amber-300",
  Or: "border-yellow-600/50 bg-yellow-600/10 text-yellow-400",
};

export function PortfolioView({ rows, displayCurrency = "EUR", displayRate = 1 }: { rows: PortfolioRow[]; displayCurrency?: string; displayRate?: number }) {
  const money = useMemo(() => moneyFormatter(displayCurrency, displayRate), [displayCurrency, displayRate]);
  const [assetFilter, setAssetFilter] = useState<AssetFilter>("Tous");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Tous");
  const [modalOpen, setModalOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState<PositionActionTarget | null>(null);
  const [action, setAction] = useState<PositionAction | null>(null);
  const openAction = (row: PortfolioRow, next: PositionAction) => {
    const assetClass: AssetClass = row.type === "ETF" ? "etf" : row.type === "Crypto" ? "crypto" : row.type === "Or" ? "gold" : "stock";
    setActionTarget({ id: row.id, source: row.source, name: row.name, ticker: row.ticker, assetClass, account: row.account, quantity: row.quantity, averagePrice: row.averagePrice, currentPrice: row.currentPrice, unit: row.type === "Or" ? " g" : undefined });
    setAction(next);
  };
  const filtered = rows.filter(
    (row) =>
      (assetFilter === "Tous" ||
        row.account === assetFilter ||
        row.type === assetFilter) &&
      (statusFilter === "Tous" || row.status === statusFilter),
  );
  const totals = useMemo(
    () =>
      rows.reduce(
        (sum, row) => ({
          invested: sum.invested + row.quantity * row.averagePrice,
          current: sum.current + row.quantity * row.currentPrice,
          purification: sum.purification + (row.purification ?? 0),
        }),
        { invested: 0, current: 0, purification: 0 },
      ),
    [rows],
  );
  const gain = totals.current - totals.invested;
  const gainPercent = totals.invested ? (gain / totals.invested) * 100 : 0;
  const exportPortfolio = () => {
    const csv = [
      "Actif,Type,Compte,Quantité,PRU,Prix actuel,Valeur,Statut",
      ...filtered.map((row) =>
        [
          row.name,
          row.type,
          row.account,
          row.quantity,
          row.averagePrice,
          row.currentPrice,
          row.quantity * row.currentPrice,
          row.status,
        ].join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "portefeuille-halisia.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="mx-auto max-w-[1280px] text-[#ffffff]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Mon Portefeuille</h1>
        <div className="flex items-stretch gap-3">
          <button
            type="button"
            onClick={exportPortfolio}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#344038] px-4 py-0 text-sm leading-none hover:bg-[#1a1e1b]"
          >
            Exporter <Download className="h-4 w-4 shrink-0" />
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-transparent bg-[#c9a84c] px-5 py-0 text-sm font-bold leading-none text-[#111412] hover:bg-[#e6c364]"
          >
            Ajouter un actif <Plus className="h-4 w-4 shrink-0" />
          </button>
        </div>
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total investi" value={money.format(totals.invested)} />
        <Metric
          label="Valeur actuelle"
          value={money.format(totals.current)}
        />
        <Metric
          label="Plus-value globale"
          value={`${gain >= 0 ? "+" : ""}${money.format(gain)}`}
          note={`(${gainPercent >= 0 ? "+" : ""}${gainPercent.toFixed(1).replace(".", ",")}%)`}
          positive={gain >= 0}
        />
        <Metric
          label="À purifier"
          value={money.format(totals.purification)}
          icon={<ShieldAlert className="h-5 w-5 text-[#c9a84c]" />}
        />
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {(["Tous", "PEA", "CTO", "Crypto", "Or"] as AssetFilter[]).map(
            (filter) => (
              <FilterButton
                key={filter}
                active={assetFilter === filter}
                onClick={() => setAssetFilter(filter)}
              >
                {filter}
              </FilterButton>
            ),
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterButton
            active={statusFilter === "Tous"}
            onClick={() => setStatusFilter("Tous")}
          >
            Tous
          </FilterButton>
          <FilterButton
            active={statusFilter === "compliant"}
            onClick={() => setStatusFilter("compliant")}
          >
            <CircleCheck className="h-3.5 w-3.5 text-halal-compliant" /> Conforme
          </FilterButton>
          <FilterButton
            active={statusFilter === "debated"}
            onClick={() => setStatusFilter("debated")}
          >
            <TriangleAlert className="h-3.5 w-3.5 text-halal-debated" /> Douteux
          </FilterButton>
          <FilterButton
            active={statusFilter === "non_compliant"}
            onClick={() => setStatusFilter("non_compliant")}
          >
            <CircleX className="h-3.5 w-3.5 text-halal-nonCompliant" /> Non conforme
          </FilterButton>
          {rows.some((row) => row.status === "unknown") && (
            <FilterButton
              active={statusFilter === "unknown"}
              onClick={() => setStatusFilter("unknown")}
            >
              <CircleHelp className="h-3.5 w-3.5 text-[rgba(255,255,255,0.6)]" /> Non analysé
            </FilterButton>
          )}
        </div>
      </div>
      <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.05] bg-[#1a1c1a]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-sm">
            <thead className="border-b border-white/[0.05] text-left text-[11px] uppercase tracking-wider text-[rgba(255,255,255,0.6)]">
              <tr>
                {[
                  "Actif",
                  "Type",
                  "Compte",
                  "Qté",
                  "PRU",
                  "Prix actuel",
                  "Valeur",
                  "+/-",
                  "Statut halal",
                  "Purification",
                  "Action",
                ].map((heading) => (
                  <th key={heading} className="px-4 py-4 font-medium">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const value = row.quantity * row.currentPrice;
                const rowGain = value - row.quantity * row.averagePrice;
                return (
                  <tr
                    key={row.id}
                    className="border-b border-white/[0.05] last:border-0 hover:bg-[#1c211d]"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-[10px] font-bold ${row.type === "Crypto" || row.type === "Or" ? "bg-[#d9a917] text-[#151813]" : "bg-slate-100 text-slate-900"}`}
                        >
                          {row.ticker.slice(0, 4)}
                        </span>
                        <span className="max-w-[150px] font-semibold">
                          {row.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Badge className={typeStyles[row.type]}>{row.type}</Badge>
                    </td>
                    <td className="px-4 py-4">
                      <Badge
                        className={
                          row.account === "PEA"
                            ? "border-purple-500/50 bg-purple-500/10 text-purple-300"
                            : "border-orange-500/50 bg-orange-500/10 text-halal-debated"
                        }
                      >
                        {row.account}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {number.format(row.quantity)}
                      {row.type === "Or" ? " g" : ""}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {money.format(row.averagePrice)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {money.format(row.currentPrice)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {money.format(value)}
                    </td>
                    <td
                      className={`px-4 py-4 text-right font-medium ${rowGain >= 0 ? "text-halal-compliant" : "text-halal-nonCompliant"}`}
                    >
                      {rowGain >= 0 ? "+" : ""}
                      {money.format(rowGain)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <StatusIcon status={row.status} />
                      {row.complianceDay != null && (
                        <ComplianceCountdown day={row.complianceDay} />
                      )}
                    </td>
                    <td
                      className={`px-4 py-4 text-right ${row.purification === null ? "text-halal-nonCompliant" : "text-[rgba(255,255,255,0.6)]"}`}
                      title={
                        row.purificationRatio
                          ? `${(row.purificationRatio * 100).toFixed(2).replace(".", ",")} % des dividendes (estimation à partir de l'historique Yahoo Finance)`
                          : undefined
                      }
                    >
                      {row.purification === null
                        ? "N/A"
                        : row.purification === 0
                          ? "Aucune"
                          : money.format(row.purification)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2 text-[rgba(255,255,255,0.6)]">
                        {row.detailTicker && (
                          <Link href={`/asset/${encodeURIComponent(row.detailTicker)}`} aria-label={`Voir ${row.name}`} title="Voir la fiche" className="rounded p-1 hover:text-[#e6c364]">
                            <Eye className="h-4 w-4" />
                          </Link>
                        )}
                        <button type="button" onClick={() => openAction(row, "edit")} aria-label={`Modifier ${row.name}`} title="Modifier" className="rounded p-1 hover:text-[#e6c364]">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => openAction(row, "sell")} aria-label={`Vendre ${row.name}`} title="Enregistrer une vente" className="rounded p-1 hover:text-[#e6c364]">
                          <HandCoins className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => openAction(row, "delete")} aria-label={`Supprimer ${row.name}`} title="Supprimer" className="rounded p-1 hover:text-halal-nonCompliant">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filtered.length && (
            <p className="py-12 text-center text-sm text-[#8f8878]">
              Aucun actif ne correspond à ces filtres.
            </p>
          )}
        </div>
        <div className="flex flex-wrap justify-between gap-3 bg-[#1a1c1a] px-4 py-4 text-xs text-[rgba(255,255,255,0.6)]">
          <span>
            Investi : <strong>{money.format(totals.invested)}</strong>　 Valeur
            : <strong>{money.format(totals.current)}</strong>　 Zakat est. :{" "}
            <strong className="text-[#c9a84c]">
              {money.format(totals.current * 0.025)}
            </strong>
          </span>
          <span>
            Purification totale :{" "}
            <strong className="text-halal-debated">
              {money.format(totals.purification)}
            </strong>
          </span>
        </div>
      </div>
      <p className="mt-4 text-right text-xs text-[#8f8878]">
        {filtered.length} actif{filtered.length > 1 ? "s" : ""} affiché
        {filtered.length > 1 ? "s" : ""}
      </p>
      <AddAssetModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <PositionActionsDialog target={actionTarget} action={action} onClose={() => { setAction(null); setActionTarget(null); }} />
    </div>
  );
}

function Metric({
  label,
  value,
  note,
  positive,
  icon,
}: {
  label: string;
  value: string;
  note?: string;
  positive?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className="min-h-[172px] rounded-2xl border border-white/[0.05] bg-[#1a1c1a] p-6">
      <div className="flex items-center justify-between text-sm text-[rgba(255,255,255,0.6)]">
        <span>{label}</span>
        {icon}
      </div>
      <div
        className={`mt-3 flex items-center gap-3 ${positive === true ? "text-halal-compliant" : positive === false ? "text-halal-nonCompliant" : "text-[#c9a84c]"}`}
      >
        <strong className="text-2xl">{value}</strong>
        {note && <span className="text-xs">{note}</span>}
      </div>
      <div className="mt-10 border-t border-dashed border-[#344038]" />
    </div>
  );
}
function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs transition-colors ${active ? "border-[#8c762e] bg-[#40391e] text-[#e6c364]" : "border-[#344038] text-[rgba(255,255,255,0.6)] hover:border-[#8c762e]"}`}
    >
      {children}
    </button>
  );
}
function Badge({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] ${className}`}
    >
      {children}
    </span>
  );
}
function ComplianceCountdown({ day }: { day: number }) {
  return (
    <div className="mx-auto mt-2 w-[150px] text-left">
      <span className="inline-flex whitespace-nowrap rounded-full border border-halal-nonCompliant/50 bg-halal-nonCompliant/10 px-2 py-0.5 text-[10px] font-semibold text-halal-nonCompliant">
        ⚠️ Non conforme — J+{day}/90
      </span>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-halal-nonCompliant"
          style={{ width: `${Math.min(100, (day / 90) * 100)}%` }}
        />
      </div>
    </div>
  );
}
function StatusIcon({ status }: { status: PortfolioRow["status"] }) {
  if (status === "compliant")
    return (
      <CircleCheck
        aria-label="Conforme"
        className="mx-auto h-4 w-4 text-halal-compliant"
      />
    );
  if (status === "debated")
    return (
      <TriangleAlert
        aria-label="Douteux"
        className="mx-auto h-4 w-4 text-halal-debated"
      />
    );
  if (status === "unknown")
    return (
      <CircleHelp
        aria-label="Non analysé"
        className="mx-auto h-4 w-4 text-[rgba(255,255,255,0.5)]"
      />
    );
  return (
    <CircleX
      aria-label="Non conforme"
      className="mx-auto h-4 w-4 text-halal-nonCompliant"
    />
  );
}
