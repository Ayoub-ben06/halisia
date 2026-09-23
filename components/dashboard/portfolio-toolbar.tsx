"use client";

import Link from "next/link";
import { Download, Filter, Plus } from "lucide-react";
import { useState } from "react";
import { AddAssetModal } from "@/components/dashboard/add-asset-modal";

export type ToolbarExportRow = { ticker: string; name: string; status: string; value: number; performance: number };

const buttonClass = "flex h-10 w-10 items-center justify-center rounded-xl bg-[#1a1c1a] text-[rgba(255,255,255,0.6)] hover:text-[#ffffff]";

export function PortfolioToolbar({ rows = [] }: { rows?: ToolbarExportRow[] }) {
  const [modalOpen, setModalOpen] = useState(false);

  function exportCsv() {
    const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [
      "Ticker,Actif,Statut Shariah,Valeur (EUR),Performance (%)",
      ...rows.map((row) => [row.ticker, row.name, row.status, row.value.toFixed(2), row.performance.toFixed(2)].map(escape).join(",")),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "portefeuille-halisia.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="flex gap-2">
        <Link href="/portfolio" aria-label="Filtrer dans le portefeuille" title="Filtrer dans le portefeuille" className={buttonClass}>
          <Filter className="h-4 w-4" />
        </Link>
        <button type="button" aria-label="Ajouter un actif" title="Ajouter un actif" onClick={() => setModalOpen(true)} className={buttonClass}>
          <Plus className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Télécharger le portefeuille (CSV)" title="Télécharger (CSV)" onClick={exportCsv} disabled={!rows.length} className={`${buttonClass} disabled:opacity-40`}>
          <Download className="h-4 w-4" />
        </button>
      </div>
      <AddAssetModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
