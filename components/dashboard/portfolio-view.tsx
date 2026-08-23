"use client";

import { CircleCheck, CircleX, Download, Eye, Plus, ShieldAlert, TriangleAlert } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { AddAssetModal } from "@/components/dashboard/add-asset-modal";

export type PortfolioRow = { id: string; ticker: string; name: string; type: "Action" | "ETF" | "Crypto" | "Or"; account: string; quantity: number; averagePrice: number; currentPrice: number; status: "compliant" | "debated" | "non_compliant"; purification: number | null };
type AssetFilter = "Tous" | "PEA" | "CTO" | "Crypto" | "Or";
type StatusFilter = "Tous" | PortfolioRow["status"];
const money = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 8 });
const typeStyles = { Action: "border-blue-500/50 bg-blue-500/10 text-blue-300", ETF: "border-teal-500/50 bg-teal-500/10 text-teal-300", Crypto: "border-amber-500/50 bg-amber-500/10 text-amber-300", Or: "border-yellow-600/50 bg-yellow-600/10 text-yellow-400" };

export function PortfolioView({ rows }: { rows: PortfolioRow[] }) {
  const [assetFilter, setAssetFilter] = useState<AssetFilter>("Tous");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Tous");
  const [modalOpen, setModalOpen] = useState(false);
  const filtered = rows.filter((row) => (assetFilter === "Tous" || row.account === assetFilter || row.type === assetFilter) && (statusFilter === "Tous" || row.status === statusFilter));
  const totals = useMemo(() => rows.reduce((sum, row) => ({ invested: sum.invested + row.quantity * row.averagePrice, current: sum.current + row.quantity * row.currentPrice, purification: sum.purification + (row.purification ?? 0) }), { invested: 0, current: 0, purification: 0 }), [rows]);
  const gain = totals.current - totals.invested;
  const gainPercent = totals.invested ? gain / totals.invested * 100 : 0;
  const exportPortfolio = () => {
    const csv = ["Actif,Type,Compte,Quantité,PRU,Prix actuel,Valeur,Statut", ...filtered.map((row) => [row.name, row.type, row.account, row.quantity, row.averagePrice, row.currentPrice, row.quantity * row.currentPrice, row.status].join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "portefeuille-halisia.csv"; link.click(); URL.revokeObjectURL(url);
  };
  return <div className="mx-auto max-w-[1280px] text-[#e2e3df]">
    <div className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-3xl font-bold">Mon Portefeuille</h1><div className="flex items-stretch gap-3"><button type="button" onClick={exportPortfolio} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#344038] px-4 py-0 text-sm leading-none hover:bg-[#1a1e1b]">Exporter <Download className="h-4 w-4 shrink-0" /></button><button type="button" onClick={() => setModalOpen(true)} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-transparent bg-[#d5b34f] px-5 py-0 text-sm font-bold leading-none text-[#101411] hover:bg-[#e6c364]">Ajouter un actif <Plus className="h-4 w-4 shrink-0" /></button></div></div>
    <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Total investi" value={money.format(totals.invested)} /><Metric label="Valeur actuelle" value={money.format(totals.current)} note="+2,4% ce mois" /><Metric label="Plus-value globale" value={`${gain >= 0 ? "+" : ""}${money.format(gain)}`} note={`(${gainPercent >= 0 ? "+" : ""}${gainPercent.toFixed(1).replace(".", ",")}%)`} positive={gain >= 0} /><Metric label="À purifier" value={money.format(totals.purification)} icon={<ShieldAlert className="h-5 w-5 text-[#c9a84c]" />} /></div>
    <div className="mt-8 flex flex-wrap items-center justify-between gap-4"><div className="flex flex-wrap gap-2">{(["Tous", "PEA", "CTO", "Crypto", "Or"] as AssetFilter[]).map((filter) => <FilterButton key={filter} active={assetFilter === filter} onClick={() => setAssetFilter(filter)}>{filter}</FilterButton>)}</div><div className="flex flex-wrap gap-2"><FilterButton active={statusFilter === "Tous"} onClick={() => setStatusFilter("Tous")}>Tous</FilterButton><FilterButton active={statusFilter === "compliant"} onClick={() => setStatusFilter("compliant")}><CircleCheck className="h-3.5 w-3.5 text-emerald-400" /> Conforme</FilterButton><FilterButton active={statusFilter === "debated"} onClick={() => setStatusFilter("debated")}><TriangleAlert className="h-3.5 w-3.5 text-amber-400" /> Douteux</FilterButton><FilterButton active={statusFilter === "non_compliant"} onClick={() => setStatusFilter("non_compliant")}><CircleX className="h-3.5 w-3.5 text-red-400" /> Non conforme</FilterButton></div></div>
    <div className="mt-6 overflow-hidden rounded-2xl border border-[#2b3731] bg-[#171b18]"><div className="overflow-x-auto"><table className="w-full min-w-[1040px] text-sm"><thead className="border-b border-[#2b3731] text-left text-[11px] uppercase tracking-wider text-[#cfc5b2]"><tr>{["Actif", "Type", "Compte", "Qté", "PRU", "Prix actuel", "Valeur", "+/-", "Statut halal", "Purification", "Action"].map((heading) => <th key={heading} className="px-4 py-4 font-medium">{heading}</th>)}</tr></thead>
      <tbody>{filtered.map((row) => { const value = row.quantity * row.currentPrice; const rowGain = value - row.quantity * row.averagePrice; return <tr key={row.id} className="border-b border-[#2b3731] last:border-0 hover:bg-[#1c211d]">
        <td className="px-4 py-4"><div className="flex items-center gap-3"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-[10px] font-bold ${row.type === "Crypto" || row.type === "Or" ? "bg-[#d9a917] text-[#151813]" : "bg-slate-100 text-slate-900"}`}>{row.ticker.slice(0, 4)}</span><span className="max-w-[150px] font-semibold">{row.name}</span></div></td>
        <td className="px-4 py-4"><Badge className={typeStyles[row.type]}>{row.type}</Badge></td><td className="px-4 py-4"><Badge className={row.account === "PEA" ? "border-purple-500/50 bg-purple-500/10 text-purple-300" : "border-orange-500/50 bg-orange-500/10 text-orange-300"}>{row.account}</Badge></td>
        <td className="px-4 py-4 text-right">{number.format(row.quantity)}{row.type === "Or" ? " g" : ""}</td><td className="px-4 py-4 text-right">{money.format(row.averagePrice)}</td><td className="px-4 py-4 text-right">{money.format(row.currentPrice)}</td><td className="px-4 py-4 text-right">{money.format(value)}</td><td className={`px-4 py-4 text-right font-medium ${rowGain >= 0 ? "text-emerald-400" : "text-red-400"}`}>{rowGain >= 0 ? "+" : ""}{money.format(rowGain)}</td>
        <td className="px-4 py-4 text-center"><StatusIcon status={row.status} /></td><td className={`px-4 py-4 text-right ${row.purification === null ? "text-red-400" : "text-[#d0c5b2]"}`}>{row.purification === null ? "N/A" : money.format(row.purification)}</td><td className="px-4 py-4 text-center"><button type="button" aria-label={`Voir ${row.name}`} className="text-[#d0c5b2] hover:text-[#e6c364]"><Eye className="h-4 w-4" /></button></td>
      </tr>; })}</tbody></table>{!filtered.length && <p className="py-12 text-center text-sm text-[#8f8878]">Aucun actif ne correspond à ces filtres.</p>}</div>
      <div className="flex flex-wrap justify-between gap-3 bg-[#242925] px-4 py-4 text-xs text-[#cfc5b2]"><span>Investi : <strong>{money.format(totals.invested)}</strong>　 Valeur : <strong>{money.format(totals.current)}</strong>　 Zakat est. : <strong className="text-[#d5b34f]">{money.format(totals.current * 0.025)}</strong></span><span>Purification totale : <strong className="text-orange-400">{money.format(totals.purification)}</strong></span></div>
    </div><p className="mt-4 text-right text-xs text-[#8f8878]">{filtered.length} actif{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}</p><AddAssetModal open={modalOpen} onClose={() => setModalOpen(false)} />
  </div>;
}

function Metric({ label, value, note, positive, icon }: { label: string; value: string; note?: string; positive?: boolean; icon?: ReactNode }) { return <div className="min-h-[172px] rounded-2xl border border-[#2b3731] bg-[#171b18] p-6"><div className="flex items-center justify-between text-sm text-[#cfc5b2]"><span>{label}</span>{icon}</div><div className={`mt-3 flex items-center gap-3 ${positive === true ? "text-emerald-400" : positive === false ? "text-red-400" : "text-[#d5b34f]"}`}><strong className="text-2xl">{value}</strong>{note && <span className="text-xs">{note}</span>}</div><div className="mt-10 border-t border-dashed border-[#344038]" /></div>; }
function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) { return <button type="button" onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs transition-colors ${active ? "border-[#8c762e] bg-[#40391e] text-[#e6c364]" : "border-[#344038] text-[#d0c5b2] hover:border-[#8c762e]"}`}>{children}</button>; }
function Badge({ className, children }: { className: string; children: ReactNode }) { return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] ${className}`}>{children}</span>; }
function StatusIcon({ status }: { status: PortfolioRow["status"] }) {
  if (status === "compliant") return <CircleCheck aria-label="Conforme" className="mx-auto h-4 w-4 text-emerald-400" />;
  if (status === "debated") return <TriangleAlert aria-label="Douteux" className="mx-auto h-4 w-4 text-amber-400" />;
  return <CircleX aria-label="Non conforme" className="mx-auto h-4 w-4 text-red-400" />;
}
