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
import { useMemo, useState, type ReactNode } from "react";
import { AddAssetModal } from "@/components/dashboard/add-asset-modal";

type TransactionType = "Achat" | "Vente";
type Account = "PEA" | "CTO" | "Crypto";
type Transaction = {
  id: string;
  date: string;
  name: string;
  ticker: string;
  logo: string;
  logoTone: "gold" | "light" | "blue";
  type: TransactionType;
  account: Account;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  gain?: number;
  gainPercent?: number;
};

const initialTransactions: Transaction[] = [
  { id: "1", date: "2026-08-14T10:32", name: "Bitcoin", ticker: "BTC", logo: "₿", logoTone: "gold", type: "Achat", account: "Crypto", quantity: 0.002, unit: "BTC", unitPrice: 88450, total: 176.9 },
  { id: "2", date: "2026-08-01T09:15", name: "Or Bitpanda", ticker: "XAU", logo: "AU", logoTone: "gold", type: "Achat", account: "Crypto", quantity: 0.5, unit: "g", unitPrice: 128.5, total: 64.25 },
  { id: "3", date: "2026-07-15T14:20", name: "Apple Inc.", ticker: "AAPL", logo: "AAPL", logoTone: "light", type: "Achat", account: "CTO", quantity: 5, unit: "", unitPrice: 165, total: 825 },
  { id: "4", date: "2026-06-10T11:45", name: "HSBC Islamic ETF", ticker: "IWQU", logo: "HSBC", logoTone: "light", type: "Achat", account: "CTO", quantity: 10, unit: "", unitPrice: 23.6, total: 236 },
  { id: "5", date: "2026-05-28T16:30", name: "Air Liquide", ticker: "AIR", logo: "AIR", logoTone: "blue", type: "Vente", account: "PEA", quantity: 2, unit: "", unitPrice: 175, total: 350, gain: 31.3, gainPercent: 9.8 },
  { id: "6", date: "2026-05-15T09:00", name: "BioMérieux", ticker: "BIO", logo: "BIO", logoTone: "blue", type: "Achat", account: "PEA", quantity: 4, unit: "", unitPrice: 85.09, total: 340.36 },
  { id: "7", date: "2026-04-01T10:15", name: "Bitcoin", ticker: "BTC", logo: "₿", logoTone: "gold", type: "Achat", account: "Crypto", quantity: 0.0015, unit: "BTC", unitPrice: 75200, total: 112.8 },
  { id: "8", date: "2026-03-15T08:45", name: "Air Liquide", ticker: "AIR", logo: "AIR", logoTone: "blue", type: "Achat", account: "PEA", quantity: 3, unit: "", unitPrice: 159.35, total: 478.05 },
  { id: "9", date: "2026-02-01T14:00", name: "Or Bitpanda", ticker: "XAU", logo: "AU", logoTone: "gold", type: "Achat", account: "Crypto", quantity: 1.2, unit: "g", unitPrice: 115, total: 138 },
  { id: "10", date: "2026-01-10T11:30", name: "HSBC Islamic ETF", ticker: "IWQU", logo: "HSBC", logoTone: "light", type: "Achat", account: "CTO", quantity: 37, unit: "", unitPrice: 23.6, total: 873.2 },
];

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 5 });
function displayDate(value: string) {
  const date = new Date(value);
  return `${date.toLocaleDateString("fr-FR")} ${date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
}

export function HistoryView() {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [account, setAccount] = useState("Tous");
  const [type, setType] = useState("Tous");
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteHoverId, setDeleteHoverId] = useState<string | null>(null);
  const [sellId, setSellId] = useState<string | null>(null);
  const [salePrice, setSalePrice] = useState("");
  const [saleDate, setSaleDate] = useState("2026-09-01");
  const [soldIds, setSoldIds] = useState<string[]>([]);
  const [addAssetOpen, setAddAssetOpen] = useState(false);

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

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function resetFilters() {
    setAccount("Tous"); setType("Tous"); setQuery(""); setFromDate(""); setToDate(""); setPage(1);
  }

  function exportCsv() {
    const csv = [
      "Date,Actif,Type,Compte,Quantité,Prix unitaire,Montant total,Plus-value",
      ...filtered.map((item) => [item.date, item.name, item.type, item.account, item.quantity, item.unitPrice, item.total, item.gain ?? ""].join(",")),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = "historique-halisia.csv"; link.click(); URL.revokeObjectURL(url);
  }

  function confirmDelete() {
    if (!deleteId) return;
    setTransactions((items) => items.filter((item) => item.id !== deleteId));
    setDeleteId(null);
  }

  function openSale(item: Transaction) {
    setDeleteId(null); setSellId(item.id); setSalePrice(String(item.unitPrice));
  }

  function confirmSale(item: Transaction) {
    const price = Number(salePrice.replace(",", "."));
    if (!Number.isFinite(price) || price <= 0 || !saleDate) return;
    const gain = (price - item.unitPrice) * item.quantity;
    setTransactions((items) => [...items, { ...item, id: `sale-${item.id}-${Date.now()}`, date: `${saleDate}T12:00`, type: "Vente", unitPrice: price, total: price * item.quantity, gain, gainPercent: item.unitPrice ? ((price - item.unitPrice) / item.unitPrice) * 100 : 0 }]);
    setSoldIds((ids) => [...ids, item.id]); setSellId(null); setPage(1);
  }

  return (
    <main className="mx-auto max-w-[1400px] p-4 text-white sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-3xl font-bold">Historique</h1><p className="mt-2 text-sm text-[rgba(255,255,255,0.6)]">Toutes vos transactions en un seul endroit</p></div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={exportCsv} className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#c9a84c] px-4 text-sm font-semibold text-[#e6c364] transition-colors hover:bg-[#c9a84c]/10">Exporter <Download className="h-4 w-4" /></button>
          <button type="button" onClick={() => setAddAssetOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#c9a84c] px-5 text-sm font-bold text-[#111412] transition-colors hover:bg-[#e6c364]"><Plus className="h-4 w-4" />New</button>
        </div>
      </div>

      <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total des achats" value="8 450,00 €" icon={<ArrowUpRight />} />
        <SummaryCard label="Total des ventes" value="1 200,00 €" icon={<ArrowDownRight />} />
        <SummaryCard label="Plus-values réalisées" value="+340,50 €" icon={<TrendingUp />} positive />
        <SummaryCard label="Transactions ce mois" value="6" icon={<CalendarDays />} />
      </section>

      <section className="mt-8 overflow-hidden rounded-2xl border border-white/[0.05] bg-[#1a1c1a]">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.05] p-5">
          <DateField label="Du" value={fromDate} onChange={(value) => { setFromDate(value); setPage(1); }} />
          <DateField label="au" value={toDate} onChange={(value) => { setToDate(value); setPage(1); }} />
          <FilterSelect label="Compte" value={account} options={["Tous", "PEA", "CTO", "Crypto"]} onChange={(value) => { setAccount(value); setPage(1); }} />
          <FilterSelect label="Type" value={type} options={["Tous", "Achat", "Vente"]} onChange={(value) => { setType(value); setPage(1); }} />
          <label className="relative min-w-[220px] flex-1 xl:max-w-[290px]"><span className="sr-only">Rechercher un actif</span><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#a9a291]" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Rechercher un actif..." className="h-11 w-full rounded-lg border border-[#4d544e] bg-[#202321] pl-10 pr-3 text-sm outline-none placeholder:text-[#777d78] focus:border-[#c9a84c]" /></label>
          <button type="button" onClick={resetFilters} className="ml-auto text-xs text-[#a9a291] underline-offset-4 hover:text-white hover:underline">Réinitialiser les filtres</button>
        </div>

        {visible.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1320px] text-sm">
              <thead className="border-b border-white/[0.05] bg-[#181b19] text-left text-[11px] uppercase tracking-wider text-[rgba(255,255,255,0.6)]"><tr><th className="px-5 py-4 font-medium">Date</th><th className="px-5 py-4 font-medium">Actif</th><th className="px-5 py-4 font-medium">Type</th><th className="px-5 py-4 font-medium">Compte</th><th className="px-5 py-4 text-right font-medium">Quantité</th><th className="px-5 py-4 text-right font-medium">Prix unitaire</th><th className="px-5 py-4 text-right font-medium">Montant total</th><th className="px-5 py-4 text-right font-medium">+/-</th><th className="px-5 py-4 text-right font-medium">Actions</th></tr></thead>
              <tbody>{visible.map((item) => <TransactionRows key={item.id} item={item} deleting={deleteId === item.id} deleteHovered={deleteHoverId === item.id} selling={sellId === item.id} sold={soldIds.includes(item.id)} salePrice={salePrice} saleDate={saleDate} onDelete={() => { setSellId(null); setDeleteId(item.id); }} onDeleteHover={setDeleteHoverId} onCancelDelete={() => setDeleteId(null)} onConfirmDelete={confirmDelete} onSell={() => openSale(item)} onCancelSale={() => setSellId(null)} onSalePrice={setSalePrice} onSaleDate={setSaleDate} onConfirmSale={() => confirmSale(item)} />)}</tbody>
            </table>
          </div>
        ) : <EmptyState />}

        {visible.length > 0 && <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.05] px-5 py-4 text-xs text-[#a9a291]"><p>Affichage de {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filtered.length)} sur {filtered.length} transaction{filtered.length > 1 ? "s" : ""}</p><div className="flex flex-wrap items-center gap-4"><label className="flex items-center gap-2"><span>Lignes par page</span><span className="relative"><select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="h-8 appearance-none rounded-md border border-white/[0.05] bg-[#202321] pl-3 pr-8 text-xs text-white outline-none focus:border-[#c9a84c]">{[10, 20, 50].map((size) => <option key={size} value={size}>{size}</option>)}</select><ChevronDown className="pointer-events-none absolute right-2 top-2 h-4 w-4 text-[#777d78]" /></span></label><div className="flex items-center gap-1"><PageButton label="Page précédente" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft className="h-4 w-4" /></PageButton>{Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => <PageButton key={pageNumber} active={currentPage === pageNumber} onClick={() => setPage(pageNumber)}>{pageNumber}</PageButton>)}<PageButton label="Page suivante" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}><ChevronRight className="h-4 w-4" /></PageButton></div></div></div>}
      </section>
      <AddAssetModal open={addAssetOpen} onClose={() => setAddAssetOpen(false)} />
    </main>
  );
}

type TransactionRowsProps = {
  item: Transaction; deleting: boolean; deleteHovered: boolean; selling: boolean; sold: boolean; salePrice: string; saleDate: string;
  onDelete: () => void; onDeleteHover: (id: string | null) => void; onCancelDelete: () => void; onConfirmDelete: () => void; onSell: () => void; onCancelSale: () => void; onSalePrice: (value: string) => void; onSaleDate: (value: string) => void; onConfirmSale: () => void;
};

function TransactionRows({ item, deleting, deleteHovered, selling, sold, salePrice, saleDate, onDelete, onDeleteHover, onCancelDelete, onConfirmDelete, onSell, onCancelSale, onSalePrice, onSaleDate, onConfirmSale }: TransactionRowsProps) {
  return <>
    <tr className={`group border-b border-white/[0.05] transition-colors ${deleting || deleteHovered ? "bg-red-500/[0.06]" : "hover:bg-white/[0.025]"}`}>
      <td className="whitespace-nowrap px-5 py-4 text-[#d8d8d5]">{displayDate(item.date)}</td>
      <td className="px-5 py-4"><div className="flex items-center gap-3"><AssetLogo item={item} /><div><p className="font-semibold">{item.name}</p><p className="mt-0.5 text-xs text-[#8f958f]">{item.ticker}</p></div></div></td>
      <td className="px-5 py-4"><span className={`inline-flex rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${item.type === "Achat" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/20 text-red-300"}`}>{item.type}</span></td>
      <td className="px-5 py-4 text-[#d8d8d5]">{item.account}</td>
      <td className="whitespace-nowrap px-5 py-4 text-right">{number.format(item.quantity)}{item.unit ? ` ${item.unit}` : ""}</td>
      <td className="whitespace-nowrap px-5 py-4 text-right">{euro.format(item.unitPrice)}{item.unit === "g" ? "/g" : ""}</td>
      <td className="whitespace-nowrap px-5 py-4 text-right font-semibold">{euro.format(item.total)}</td>
      <td className="whitespace-nowrap px-5 py-4 text-right">{item.gain == null ? <span className="text-[#777d78]">—</span> : <span className={item.gain >= 0 ? "font-semibold text-emerald-400" : "font-semibold text-red-400"}>{item.gain >= 0 ? "+" : ""}{euro.format(item.gain)} ({item.gainPercent?.toFixed(1).replace(".", ",")} %)</span>}</td>
      <td className="px-5 py-4"><div className="flex min-w-[128px] items-center justify-end gap-2">{item.type === "Achat" && !sold && <button type="button" onClick={onSell} className="pointer-events-none rounded-md border border-[#c9a84c]/70 px-2.5 py-1.5 text-[11px] font-semibold text-[#e6c364] opacity-0 transition-opacity hover:bg-[#c9a84c]/10 group-hover:pointer-events-auto group-hover:opacity-100">Vendre</button>}{sold && <span className="text-[11px] text-[#8f958f]">Vendu</span>}<button type="button" aria-label={`Supprimer ${item.name}`} onClick={onDelete} onMouseEnter={() => onDeleteHover(item.id)} onMouseLeave={() => onDeleteHover(null)} className="flex h-8 w-8 items-center justify-center rounded-md text-[#777d78] transition-colors hover:bg-red-500/10 hover:text-red-400"><Trash2 className="h-4 w-4" /></button></div></td>
    </tr>
    {deleting && <tr className="border-b border-red-500/20 bg-red-500/[0.06]"><td colSpan={9} className="px-5 py-3"><div className="flex items-center justify-end gap-3"><span className="mr-2 text-sm text-red-200">Supprimer cette transaction ?</span><button type="button" onClick={onCancelDelete} className="h-8 rounded-md border border-[#4d544e] px-3 text-xs text-[#d8d8d5] hover:bg-white/5">Annuler</button><button type="button" onClick={onConfirmDelete} className="h-8 rounded-md bg-red-500 px-3 text-xs font-semibold text-white hover:bg-red-400">Confirmer</button></div></td></tr>}
    {selling && <tr className="border-b border-[#c9a84c]/20 bg-[#c9a84c]/[0.04]"><td colSpan={9} className="px-5 py-4"><div className="flex flex-wrap items-end justify-end gap-3"><label className="grid gap-1.5 text-xs text-[#a9a291]">Prix de vente<input type="number" min="0" step="0.01" value={salePrice} onChange={(event) => onSalePrice(event.target.value)} className="h-9 w-36 rounded-md border border-[#4d544e] bg-[#202321] px-3 text-sm text-white outline-none focus:border-[#c9a84c]" /></label><label className="grid gap-1.5 text-xs text-[#a9a291]">Date de vente<input type="date" value={saleDate} onChange={(event) => onSaleDate(event.target.value)} className="h-9 rounded-md border border-[#4d544e] bg-[#202321] px-3 text-sm text-white outline-none focus:border-[#c9a84c]" /></label><button type="button" onClick={onCancelSale} className="h-9 rounded-md border border-[#4d544e] px-3 text-xs hover:bg-white/5">Annuler</button><button type="button" onClick={onConfirmSale} className="h-9 rounded-md bg-[#c9a84c] px-4 text-xs font-bold text-[#111412] hover:bg-[#e6c364]">Confirmer la vente</button></div></td></tr>}
  </>;
}

function SummaryCard({ label, value, icon, positive }: { label: string; value: string; icon: ReactNode; positive?: boolean }) {
  return <article className="flex min-h-[128px] items-center justify-between rounded-2xl border border-white/[0.05] bg-[#1a1c1a] p-6"><div><p className="text-xs font-semibold uppercase tracking-wide text-[rgba(255,255,255,0.6)]">{label}</p><p className={`mt-3 text-2xl font-bold ${positive ? "text-emerald-400" : "text-white"}`}>{value}</p></div><span className={positive ? "text-emerald-400 [&>svg]:h-5 [&>svg]:w-5" : "text-[#c9a84c] [&>svg]:h-5 [&>svg]:w-5"}>{icon}</span></article>;
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="flex h-11 items-center gap-2 rounded-lg border border-[#4d544e] bg-[#202321] px-3 text-xs text-[#a9a291] focus-within:border-[#c9a84c]"><CalendarDays className="h-4 w-4" /><span>{label}</span><input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="w-[116px] bg-transparent text-sm text-white outline-none" /></label>;
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="relative"><span className="sr-only">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 min-w-[145px] appearance-none rounded-lg border border-[#4d544e] bg-[#202321] pl-3 pr-9 text-sm outline-none focus:border-[#c9a84c]">{options.map((option) => <option key={option} value={option}>{option === "Tous" ? `Tous les ${label.toLowerCase()}s` : option}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-[#777d78]" /></label>;
}

function AssetLogo({ item }: { item: Transaction }) {
  const tone = item.logoTone === "gold" ? "border-[#c9a84c]/20 bg-[#c9a84c]/10 text-[#e6c364]" : item.logoTone === "blue" ? "border-blue-400/20 bg-blue-400/10 text-blue-300" : "border-white/10 bg-white/5 text-[#d8d8d5]";
  return <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-[9px] font-bold ${tone}`}>{item.logo}</span>;
}

function PageButton({ children, label, active, disabled, onClick }: { children: ReactNode; label?: string; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className={`flex h-8 min-w-8 items-center justify-center rounded-md border px-2 transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${active ? "border-[#c9a84c] bg-[#c9a84c]/10 text-[#e6c364]" : "border-white/[0.05] text-[#a9a291] hover:border-[#c9a84c]/50 hover:text-white"}`}>{children}</button>;
}

function EmptyState() {
  return <div className="flex min-h-[360px] flex-col items-center justify-center px-5 py-12 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#c9a84c]/10 text-[#c9a84c]"><ReceiptText className="h-7 w-7" /></span><h2 className="mt-5 text-lg font-bold">Aucune transaction trouvée</h2><p className="mt-2 text-sm text-[#a9a291]">Importez votre portefeuille ou ajoutez un actif manuellement</p><button type="button" className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-[#c9a84c] px-4 text-sm font-bold text-[#111412] hover:bg-[#e6c364]"><FileUp className="h-4 w-4" />Importer un fichier CSV</button></div>;
}
