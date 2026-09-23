"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileUp,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { AddAssetModal } from "@/components/dashboard/add-asset-modal";
import { createClient } from "@/lib/supabase/client";
import { moneyFormatter } from "@/lib/money";

export type HistoryTransaction = {
  id: string;
  date: string;
  name: string;
  ticker: string;
  assetClass: "stock" | "etf" | "crypto" | "gold" | "cash";
  type: "Achat" | "Vente";
  account: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  gain?: number;
  gainPercent?: number;
  broker: string;
};

const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 5 });
function displayDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR");
}

export function HistoryView({ transactions, displayCurrency = "EUR", displayRate = 1 }: { transactions: HistoryTransaction[]; displayCurrency?: string; displayRate?: number }) {
  const router = useRouter();
  const euro = useMemo(() => moneyFormatter(displayCurrency, displayRate), [displayCurrency, displayRate]);
  const [account, setAccount] = useState("Tous");
  const [type, setType] = useState("Tous");
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [addAsset, setAddAsset] = useState<"manual" | "csv" | null>(null);

  const accounts = useMemo(() => ["Tous", ...Array.from(new Set(transactions.map((item) => item.account)))], [transactions]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return transactions
      .filter((item) => account === "Tous" || item.account === account)
      .filter((item) => type === "Tous" || item.type === type)
      .filter((item) => !fromDate || item.date.slice(0, 10) >= fromDate)
      .filter((item) => !toDate || item.date.slice(0, 10) <= toDate)
      .filter((item) => !needle || item.name.toLowerCase().includes(needle) || item.ticker.toLowerCase().includes(needle))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [account, fromDate, query, toDate, transactions, type]);

  const summary = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    return {
      buys: transactions.filter((item) => item.type === "Achat").reduce((sum, item) => sum + item.total, 0),
      sells: transactions.filter((item) => item.type === "Vente").reduce((sum, item) => sum + item.total, 0),
      gains: transactions.reduce((sum, item) => sum + (item.gain ?? 0), 0),
      thisMonth: transactions.filter((item) => item.date.slice(0, 7) === month).length,
    };
  }, [transactions]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function resetFilters() {
    setAccount("Tous"); setType("Tous"); setQuery(""); setFromDate(""); setToDate(""); setPage(1);
  }

  function exportCsv() {
    const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [
      "Date,Actif,Ticker,Type,Compte,Quantité,Prix unitaire (EUR),Montant total (EUR),Plus-value réalisée (EUR),Courtier",
      ...filtered.map((item) => [item.date.slice(0, 10), item.name, item.ticker, item.type, item.account, item.quantity, item.unitPrice, item.total, item.gain?.toFixed(2) ?? "", item.broker].map(escape).join(",")),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = "historique-halisia.csv"; link.click(); URL.revokeObjectURL(url);
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleting(true);
    setDeleteError("");
    const { data, error } = await createClient().from("transactions").delete().eq("id", deleteId).select("id");
    setDeleting(false);
    if (error) return setDeleteError("Suppression impossible. Réessayez plus tard.");
    if (!data?.length) return setDeleteError("Suppression refusée : la migration du 24/09/2026 doit être appliquée.");
    setDeleteId(null);
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-[1400px] p-4 text-white sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-3xl font-bold">Historique</h1><p className="mt-2 text-sm text-[rgba(255,255,255,0.6)]">Achats et ventes enregistrés dans Halisia</p></div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={exportCsv} disabled={!filtered.length} className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#c9a84c] px-4 text-sm font-semibold text-[#e6c364] transition-colors hover:bg-[#c9a84c]/10 disabled:opacity-40">Exporter <Download className="h-4 w-4" /></button>
          <button type="button" onClick={() => setAddAsset("manual")} className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#c9a84c] px-5 text-sm font-bold text-[#111412] transition-colors hover:bg-[#e6c364]"><Plus className="h-4 w-4" />Nouvel achat</button>
        </div>
      </div>

      <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total des achats" value={euro.format(summary.buys)} icon={<ArrowUpRight />} />
        <SummaryCard label="Total des ventes" value={euro.format(summary.sells)} icon={<ArrowDownRight />} />
        <SummaryCard label="Plus-values réalisées" value={`${summary.gains >= 0 ? "+" : ""}${euro.format(summary.gains)}`} icon={<TrendingUp />} positive={summary.gains >= 0} hint="Prix moyen pondéré" />
        <SummaryCard label="Transactions ce mois" value={String(summary.thisMonth)} icon={<CalendarDays />} />
      </section>

      <section className="mt-8 overflow-hidden rounded-2xl border border-white/[0.05] bg-[#1a1c1a]">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.05] p-5">
          <DateField label="Du" value={fromDate} onChange={(value) => { setFromDate(value); setPage(1); }} />
          <DateField label="au" value={toDate} onChange={(value) => { setToDate(value); setPage(1); }} />
          <FilterSelect label="Compte" value={account} options={accounts} onChange={(value) => { setAccount(value); setPage(1); }} />
          <FilterSelect label="Type" value={type} options={["Tous", "Achat", "Vente"]} onChange={(value) => { setType(value); setPage(1); }} />
          <label className="relative min-w-[220px] flex-1 xl:max-w-[290px]"><span className="sr-only">Rechercher un actif</span><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#a9a291]" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Rechercher un actif..." className="h-11 w-full rounded-lg border border-[#4d544e] bg-[#202321] pl-10 pr-3 text-sm outline-none placeholder:text-[#777d78] focus:border-[#c9a84c]" /></label>
          <button type="button" onClick={resetFilters} className="ml-auto text-xs text-[#a9a291] underline-offset-4 hover:text-white hover:underline">Réinitialiser les filtres</button>
        </div>

        {visible.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="border-b border-white/[0.05] bg-[#181b19] text-left text-[11px] uppercase tracking-wider text-[rgba(255,255,255,0.6)]"><tr><th className="px-5 py-4 font-medium">Date</th><th className="px-5 py-4 font-medium">Actif</th><th className="px-5 py-4 font-medium">Type</th><th className="px-5 py-4 font-medium">Compte</th><th className="px-5 py-4 text-right font-medium">Quantité</th><th className="px-5 py-4 text-right font-medium">Prix unitaire</th><th className="px-5 py-4 text-right font-medium">Montant total</th><th className="px-5 py-4 text-right font-medium">Plus-value</th><th className="px-5 py-4 text-right font-medium">Actions</th></tr></thead>
              <tbody>{visible.map((item) => (
                <TransactionRows key={item.id} item={item} format={euro.format} confirming={deleteId === item.id} busy={deleting} error={deleteId === item.id ? deleteError : ""} onDelete={() => { setDeleteError(""); setDeleteId(item.id); }} onCancelDelete={() => setDeleteId(null)} onConfirmDelete={() => void confirmDelete()} />
              ))}</tbody>
            </table>
          </div>
        ) : <EmptyState filtered={transactions.length > 0} onImport={() => setAddAsset("csv")} />}

        {visible.length > 0 && <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.05] px-5 py-4 text-xs text-[#a9a291]"><p>Affichage de {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filtered.length)} sur {filtered.length} transaction{filtered.length > 1 ? "s" : ""}</p><div className="flex flex-wrap items-center gap-4"><label className="flex items-center gap-2"><span>Lignes par page</span><span className="relative"><select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="h-8 appearance-none rounded-md border border-white/[0.05] bg-[#202321] pl-3 pr-8 text-xs text-white outline-none focus:border-[#c9a84c]">{[10, 20, 50].map((size) => <option key={size} value={size}>{size}</option>)}</select><ChevronDown className="pointer-events-none absolute right-2 top-2 h-4 w-4 text-[#777d78]" /></span></label><div className="flex items-center gap-1"><PageButton label="Page précédente" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft className="h-4 w-4" /></PageButton>{Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => <PageButton key={pageNumber} active={currentPage === pageNumber} onClick={() => setPage(pageNumber)}>{pageNumber}</PageButton>)}<PageButton label="Page suivante" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}><ChevronRight className="h-4 w-4" /></PageButton></div></div></div>}
      </section>
      <p className="mt-4 text-xs text-[#8f8878]">Pour enregistrer une vente, utilisez l’action « Enregistrer une vente » sur la ligne du portefeuille : la position et l’historique sont mis à jour ensemble.</p>
      <AddAssetModal open={addAsset !== null} initialTab={addAsset ?? "manual"} onClose={() => setAddAsset(null)} />
    </main>
  );
}

type TransactionRowsProps = {
  item: HistoryTransaction; format: (value: number) => string; confirming: boolean; busy: boolean; error: string;
  onDelete: () => void; onCancelDelete: () => void; onConfirmDelete: () => void;
};

function TransactionRows({ item, format, confirming, busy, error, onDelete, onCancelDelete, onConfirmDelete }: TransactionRowsProps) {
  return <>
    <tr className={`border-b border-white/[0.05] transition-colors ${confirming ? "bg-red-500/[0.06]" : "hover:bg-white/[0.025]"}`}>
      <td className="whitespace-nowrap px-5 py-4 text-[#d8d8d5]">{displayDate(item.date)}</td>
      <td className="px-5 py-4"><div className="flex items-center gap-3"><AssetLogo item={item} /><div><p className="font-semibold">{item.name}</p><p className="mt-0.5 text-xs text-[#8f958f]">{item.ticker}</p></div></div></td>
      <td className="px-5 py-4"><span className={`inline-flex rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${item.type === "Achat" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/20 text-red-300"}`}>{item.type}</span></td>
      <td className="px-5 py-4 text-[#d8d8d5]">{item.account}</td>
      <td className="whitespace-nowrap px-5 py-4 text-right">{number.format(item.quantity)}{item.unit ? ` ${item.unit}` : ""}</td>
      <td className="whitespace-nowrap px-5 py-4 text-right">{format(item.unitPrice)}{item.unit === "g" ? "/g" : ""}</td>
      <td className="whitespace-nowrap px-5 py-4 text-right font-semibold">{format(item.total)}</td>
      <td className="whitespace-nowrap px-5 py-4 text-right">{item.gain == null ? <span className="text-[#777d78]">—</span> : <span className={item.gain >= 0 ? "font-semibold text-emerald-400" : "font-semibold text-red-400"}>{item.gain >= 0 ? "+" : ""}{format(item.gain)}{item.gainPercent != null ? ` (${item.gainPercent.toFixed(1).replace(".", ",")} %)` : ""}</span>}</td>
      <td className="px-5 py-4"><div className="flex items-center justify-end"><button type="button" aria-label={`Supprimer la ligne ${item.name}`} onClick={onDelete} className="flex h-8 w-8 items-center justify-center rounded-md text-[#777d78] transition-colors hover:bg-red-500/10 hover:text-red-400"><Trash2 className="h-4 w-4" /></button></div></td>
    </tr>
    {confirming && <tr className="border-b border-red-500/20 bg-red-500/[0.06]"><td colSpan={9} className="px-5 py-3"><div className="flex flex-wrap items-center justify-end gap-3"><span className="mr-2 text-sm text-red-200">{error || "Supprimer cette ligne de l’historique ? Le portefeuille n’est pas modifié."}</span><button type="button" onClick={onCancelDelete} className="h-8 rounded-md border border-[#4d544e] px-3 text-xs text-[#d8d8d5] hover:bg-white/5">Annuler</button><button type="button" disabled={busy} onClick={onConfirmDelete} className="h-8 rounded-md bg-red-500 px-3 text-xs font-semibold text-white hover:bg-red-400 disabled:opacity-60">Confirmer</button></div></td></tr>}
  </>;
}

function SummaryCard({ label, value, icon, positive, hint }: { label: string; value: string; icon: ReactNode; positive?: boolean; hint?: string }) {
  return <article className="flex min-h-[128px] items-center justify-between rounded-2xl border border-white/[0.05] bg-[#1a1c1a] p-6"><div><p className="text-xs font-semibold uppercase tracking-wide text-[rgba(255,255,255,0.6)]">{label}</p><p className={`mt-3 text-2xl font-bold ${positive === true ? "text-emerald-400" : positive === false ? "text-red-400" : "text-white"}`}>{value}</p>{hint && <p className="mt-1 text-[10px] text-[#8f8878]">{hint}</p>}</div><span className={positive ? "text-emerald-400 [&>svg]:h-5 [&>svg]:w-5" : "text-[#c9a84c] [&>svg]:h-5 [&>svg]:w-5"}>{icon}</span></article>;
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="flex h-11 items-center gap-2 rounded-lg border border-[#4d544e] bg-[#202321] px-3 text-xs text-[#a9a291] focus-within:border-[#c9a84c]"><CalendarDays className="h-4 w-4" /><span>{label}</span><input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="w-[116px] bg-transparent text-sm text-white outline-none [color-scheme:dark]" /></label>;
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="relative"><span className="sr-only">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 min-w-[145px] appearance-none rounded-lg border border-[#4d544e] bg-[#202321] pl-3 pr-9 text-sm outline-none focus:border-[#c9a84c]">{options.map((option) => <option key={option} value={option}>{option === "Tous" ? `Tous les ${label.toLowerCase()}s` : option}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-[#777d78]" /></label>;
}

function AssetLogo({ item }: { item: HistoryTransaction }) {
  const tone = item.assetClass === "gold" || item.assetClass === "crypto" ? "border-[#c9a84c]/20 bg-[#c9a84c]/10 text-[#e6c364]" : item.assetClass === "etf" ? "border-blue-400/20 bg-blue-400/10 text-blue-300" : "border-white/10 bg-white/5 text-[#d8d8d5]";
  return <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-[9px] font-bold ${tone}`}>{item.assetClass === "gold" ? "AU" : item.ticker.slice(0, 4)}</span>;
}

function PageButton({ children, label, active, disabled, onClick }: { children: ReactNode; label?: string; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className={`flex h-8 min-w-8 items-center justify-center rounded-md border px-2 transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${active ? "border-[#c9a84c] bg-[#c9a84c]/10 text-[#e6c364]" : "border-white/[0.05] text-[#a9a291] hover:border-[#c9a84c]/50 hover:text-white"}`}>{children}</button>;
}

function EmptyState({ filtered, onImport }: { filtered: boolean; onImport: () => void }) {
  return <div className="flex min-h-[360px] flex-col items-center justify-center px-5 py-12 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#c9a84c]/10 text-[#c9a84c]"><ReceiptText className="h-7 w-7" /></span><h2 className="mt-5 text-lg font-bold">{filtered ? "Aucune transaction ne correspond à ces filtres" : "Aucune transaction enregistrée"}</h2><p className="mt-2 max-w-md text-sm text-[#a9a291]">Les achats saisis ou importés et les ventes enregistrées depuis le portefeuille apparaissent ici.</p>{!filtered && <button type="button" onClick={onImport} className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-[#c9a84c] px-4 text-sm font-bold text-[#111412] hover:bg-[#e6c364]"><FileUp className="h-4 w-4" />Importer un fichier CSV</button>}</div>;
}
