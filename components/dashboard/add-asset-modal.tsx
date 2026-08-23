"use client";

import {
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronDown,
  CircleCheck,
  CloudUpload,
  Search,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import * as XLSX from "xlsx";
import { halalMock } from "@/lib/halal-mock";

type SearchResult = {
  ticker: string;
  name: string;
  exchange: string;
  type: string;
};

type Tab = "manual" | "csv";
type Broker = "Trade Republic" | "Degiro" | "Fortuneo" | "Bitpanda";
type ImportedAsset = { name: string; quantity: number; averagePrice: number; compliant: boolean };

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const pct = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function typeLabel(type: string): string {
  switch (type.toUpperCase()) {
    case "EQUITY":
      return "Action";
    case "ETF":
      return "ETF";
    case "CRYPTOCURRENCY":
      return "Crypto";
    default:
      return type || "Actif";
  }
}

function halalStatus(ticker: string, name: string): { label: string; compliant: boolean } {
  const mock = halalMock[ticker] ?? halalMock[ticker.split(".")[0]];
  if (mock?.status === "compliant") return { label: "Conforme", compliant: true };
  if (mock?.status === "debated") return { label: "Débat", compliant: false };
  if (/ISLAMIC/i.test(name)) return { label: "Conforme", compliant: true };
  return { label: "Analyse", compliant: false };
}

export function AddAssetModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<Tab>("manual");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [quantity, setQuantity] = useState("");
  const [averagePrice, setAveragePrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [account, setAccount] = useState<"PEA" | "CTO">("PEA");
  const [broker, setBroker] = useState<Broker>("Fortuneo");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importedAssets, setImportedAssets] = useState<ImportedAsset[]>([]);
  const [importError, setImportError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || selected) {
      setResults([]);
      setSearchOpen(false);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search-assets?q=${encodeURIComponent(trimmedQuery)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Recherche indisponible");
        const data = (await response.json()) as SearchResult[];
        setResults(data);
        setSearchOpen(true);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setResults([]);
          setSearchOpen(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query, selected]);

  if (!open) return null;

  const qty = Number(quantity.replace(",", ".")) || 0;
  const avg = Number(averagePrice.replace(",", ".")) || 0;
  const invested = qty * avg;
  const estimatedValue = invested;
  const gain = 0;
  const gainPercent = invested ? 0 : 0;
  const status = selected ? halalStatus(selected.ticker, selected.name) : null;

  const selectAsset = (asset: SearchResult) => {
    setSelected(asset);
    setQuery("");
    setSearchOpen(false);
  };

  const clearSelection = () => {
    setSelected(null);
    setQuery("");
  };

  const readImportFile = async (file: File) => {
    setImportError("");
    try {
      const workbook = XLSX.read(await file.arrayBuffer());
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error("Ce fichier ne contient aucune feuille.");
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
      const headerIndex = rows.findIndex((row) =>
        row.some((cell) => ["Libellé", "Asset", "Nom"].includes(String(cell).trim())),
      );
      if (headerIndex < 0) throw new Error("Le format du fichier n’est pas reconnu.");
      const headers = rows[headerIndex].map((cell) => String(cell).trim());
      const indexOf = (...names: string[]) => names.map((name) => headers.indexOf(name)).find((i) => i >= 0) ?? -1;
      const nameIndex = indexOf("Libellé", "Asset", "Nom");
      const quantityIndex = indexOf("Qté", "Quantité", "Amount Asset");
      const priceIndex = indexOf("PRU", "Prix", "Asset market price");
      const parsed = rows.slice(headerIndex + 1).flatMap((row) => {
        const name = String(row[nameIndex] ?? "").trim();
        const quantity = Number(String(row[quantityIndex] ?? "").replace(/\s/g, "").replace(",", "."));
        const averagePrice = Number(String(row[priceIndex] ?? "").replace(/\s/g, "").replace(",", "."));
        if (!name || !Number.isFinite(quantity) || !Number.isFinite(averagePrice)) return [];
        return [{ name, quantity, averagePrice, compliant: halalStatus("", name).compliant }];
      });
      if (!parsed.length) throw new Error("Aucun actif exploitable n’a été trouvé.");
      setImportFile(file);
      setImportedAssets(parsed);
    } catch (error) {
      setImportFile(null);
      setImportedAssets([]);
      setImportError(error instanceof Error ? error.message : "Impossible de lire ce fichier.");
    }
  };

  const clearImport = () => {
    setImportFile(null);
    setImportedAssets([]);
    setImportError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fermer la modale"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-asset-title"
        className="relative z-10 max-h-[calc(100vh-2rem)] w-full max-w-[616px] overflow-y-auto rounded-2xl border border-[#4d4637]/30 bg-[#111512] p-6 shadow-2xl sm:p-9"
      >
        <h2 id="add-asset-title" className="text-xl font-bold text-[#e2e3df]">
          Ajouter un actif
        </h2>

        <div className="mt-5 grid grid-cols-2 border-b border-[#4d4637]/20">
          <button
            type="button"
            onClick={() => setTab("manual")}
            className={`pb-4 text-sm font-semibold transition-colors ${
              tab === "manual"
                ? "border-b-2 border-[#c9a84c] text-[#e6c364]"
                : "text-[#d0c5b2] hover:text-[#e2e3df]"
            }`}
          >
            Saisie manuelle
          </button>
          <button
            type="button"
            onClick={() => setTab("csv")}
            className={`pb-4 text-sm font-semibold transition-colors ${
              tab === "csv"
                ? "border-b-2 border-[#c9a84c] text-[#e6c364]"
                : "text-[#d0c5b2] hover:text-[#e2e3df]"
            }`}
          >
            Import CSV
          </button>
        </div>

        {tab === "manual" ? (
          <div className="mt-6 space-y-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#706957]" />
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  if (selected) clearSelection();
                  setQuery(event.target.value);
                }}
                onFocus={() => query.trim() && setSearchOpen(true)}
                placeholder="Rechercher un actif (nom, ticker, ISIN...)"
                className="h-[53px] w-full rounded-md border border-[#665936]/60 bg-[#1a1d1a] pl-11 pr-4 text-sm text-[#e2e3df] outline-none placeholder:font-semibold placeholder:text-[#948b79] focus:border-[#c9a84c]"
              />
              {searchOpen && !selected && (
                <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-[#4d4637]/30 bg-[#1e201e] shadow-lg">
                  {loading ? (
                    <p className="px-4 py-3 text-sm text-[#d0c5b2]">Recherche...</p>
                  ) : results.length > 0 ? (
                    <ul className="max-h-56 overflow-y-auto py-1">
                      {results.map((result) => (
                        <li key={`${result.ticker}-${result.exchange}`}>
                          <button
                            type="button"
                            onClick={() => selectAsset(result)}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#282b28]"
                          >
                            <span className="min-w-0 flex-1 truncate text-sm">
                              <strong className="text-[#e2e3df]">{result.ticker}</strong>{" "}
                              <span className="text-[#d0c5b2]">{result.name}</span>
                            </span>
                            <span className="rounded bg-[#282b28] px-2 py-0.5 text-xs text-[#d0c5b2]">
                              {typeLabel(result.type)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-4 py-3 text-sm text-[#d0c5b2]">Aucun actif trouvé.</p>
                  )}
                </div>
              )}
            </div>

            {selected && (
              <div className="flex items-center gap-3 rounded-md border border-[#c9a84c]/70 bg-[#1a1d1a] px-3 py-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#4d4637]/40 bg-[#1e211e] text-[#d0c5b2]">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#e2e3df]">
                    {selected.ticker} — {selected.name}
                  </p>
                  {status && (
                    <span className={`mt-1 flex items-center gap-1 text-xs font-semibold ${status.compliant ? "text-emerald-400" : "text-[#d0c5b2]"}`}>
                      {status.compliant && <CircleCheck className="h-3 w-3" />}{status.label}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={clearSelection}
                  aria-label="Retirer la sélection"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#d0c5b2] hover:bg-[#282b28] hover:text-[#e2e3df]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
              <Field label="Quantité">
                <input
                  type="text"
                  inputMode="decimal"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder="10"
                  className={inputClass}
                />
              </Field>
              <Field label="Prix d'achat moyen (€)">
                <input
                  type="text"
                  inputMode="decimal"
                  value={averagePrice}
                  onChange={(event) => setAveragePrice(event.target.value)}
                  placeholder="112,50"
                  className={inputClass}
                />
              </Field>
              <Field label="Date d'achat">
                <div className="relative">
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(event) => setPurchaseDate(event.target.value)}
                    className={`${inputClass} pr-10 [color-scheme:dark]`}
                  />
                  <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#706957]" />
                </div>
              </Field>
              <Field label="Compte">
                <div className="relative">
                  <select
                    value={account}
                    onChange={(event) => setAccount(event.target.value as "PEA" | "CTO")}
                    className={`${inputClass} appearance-none pr-10`}
                  >
                    <option value="PEA">PEA</option>
                    <option value="CTO">CTO</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#706957]" />
                </div>
              </Field>
            </div>

            {selected && (
              <p className="text-xs font-semibold text-[#d0c5b2]">
                Type d&apos;actif :{" "}
                <span className="ml-1 rounded-sm border border-[#4d4637]/50 bg-[#282b28] px-2 py-0.5 font-semibold text-[#e2e3df]">
                  {typeLabel(selected.type)}
                </span>
              </p>
            )}

            <div className="rounded-lg border border-[#282c28] border-l-4 border-l-[#e7c55f] bg-[#1a1d1a] px-4 py-2.5">
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm font-semibold text-[#d0c5b2]">Valeur estimée</span>
                <span className="text-lg font-bold text-[#e2e3df]">
                  {invested ? eur.format(estimatedValue) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm font-semibold text-[#d0c5b2]">Statut halal</span>
                {status ? (
                  <span
                    className={`flex items-center gap-1 text-sm font-semibold ${
                      status.compliant ? "text-emerald-400" : "text-[#d0c5b2]"
                    }`}
                  >
                    {status.compliant && <CheckCircle2 className="h-4 w-4" />}
                    {status.label}
                  </span>
                ) : (
                  <span className="text-sm text-[#706957]">—</span>
                )}
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm font-semibold text-[#d0c5b2]">+/- depuis achat</span>
                <span className="text-sm font-semibold text-emerald-400">
                  {invested
                    ? `${gain >= 0 ? "+" : ""}${eur.format(gain).replace(/\s/g, " ")} (${gain >= 0 ? "+" : ""}${pct.format(gainPercent)} %)`
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <div>
              <p className="mb-3 text-xs font-semibold text-[#d0c5b2]">Choisir votre courtier</p>
              <div className="flex flex-wrap gap-2">
                {(["Trade Republic", "Degiro", "Fortuneo", "Bitpanda"] as Broker[]).map((item) => (
                  <button key={item} type="button" onClick={() => { setBroker(item); clearImport(); }}
                    className={`rounded-md border px-3.5 py-2 text-xs font-semibold transition-colors ${broker === item ? "border-[#e7c55f] bg-[#e7c55f] text-[#171811]" : "border-[#4d4637]/40 text-[#d0c5b2] hover:border-[#c9a84c]/60"}`}>
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <button type="button" onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files[0]; if (file) void readImportFile(file); }}
              className={`flex min-h-[205px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 text-center transition-colors ${dragging ? "border-[#e7c55f] bg-[#e7c55f]/5" : "border-[#876f2f] bg-[#151916] hover:border-[#e7c55f]"}`}>
              <CloudUpload className="mb-5 h-8 w-8 text-[#e7c55f]" />
              <span className="text-base font-bold text-[#e2e3df]">Glissez votre fichier ici</span>
              <span className="text-xs text-[#d0c5b2]">ou cliquez pour parcourir</span>
              <span className="mt-4 text-[11px] text-[#8f8878]">Formats acceptés : .csv • .xls • .xlsx</span>
            </button>
            <input ref={fileInputRef} type="file" accept=".csv,.xls,.xlsx" className="hidden"
              onChange={(event) => { const file = event.target.files?.[0]; if (file) void readImportFile(file); }} />

            {importError && <p className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-xs text-red-300">{importError}</p>}

            {importFile && (
              <>
                <div className="flex items-center gap-3 rounded-md border border-[#4d4637]/30 bg-[#1b1e1b] px-4 py-3.5">
                  <CircleCheck className="h-5 w-5 shrink-0 text-emerald-400" />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[#e2e3df]">{importFile.name}</p><p className="text-xs text-[#d0c5b2]">{Math.max(1, Math.round(importFile.size / 1024))} KB</p></div>
                  <button type="button" onClick={clearImport} aria-label="Retirer le fichier" className="p-1 text-[#d0c5b2] hover:text-white"><X className="h-5 w-5" /></button>
                </div>

                <div className="overflow-hidden rounded-lg border border-[#282c28]">
                  <div className="grid grid-cols-[1.55fr_.8fr_.85fr_1fr] bg-[#292d29] px-3 py-2 text-[11px] font-bold text-[#d9d0bd]"><span>Actif</span><span>Quantité</span><span>PRU</span><span>Statut</span></div>
                  {importedAssets.slice(0, 4).map((asset, index) => (
                    <div key={`${asset.name}-${index}`} className="grid grid-cols-[1.55fr_.8fr_.85fr_1fr] items-center border-t border-[#292d29] bg-[#1b1e1b] px-3 py-2 text-xs text-[#e2e3df]">
                      <span className="truncate pr-2">{asset.name}</span><span>{asset.quantity}</span><span>{asset.averagePrice.toFixed(2)}€</span>
                      <span className={asset.compliant ? "flex items-center gap-1 text-emerald-400" : "text-amber-300"}>{asset.compliant && <CircleCheck className="h-3 w-3" />}{asset.compliant ? "Conforme" : "À vérifier"}</span>
                    </div>
                  ))}
                  <div className="bg-[#292d29] px-3 py-2 text-[11px] font-semibold text-[#d9d0bd]">{importedAssets.length} actifs détectés • {importedAssets.filter((asset) => asset.compliant).length} conformes • {importedAssets.filter((asset) => !asset.compliant).length} non conformes</div>
                </div>
              </>
            )}

            <button type="button" className="flex w-full items-center justify-between border-y border-[#4d4637]/20 py-4 text-left text-xs font-semibold text-[#d0c5b2]">
              Comment exporter depuis {broker} ? <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="mt-8 flex justify-end gap-3 border-t border-[#4d4637]/25 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-6 py-3 text-sm font-medium text-[#e2e3df] hover:bg-[#282b28]"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={tab === "manual" ? !selected : !importFile}
            className="rounded-xl bg-[#d5b34f] px-6 py-3 text-sm font-bold text-[#111412] transition-opacity hover:bg-[#e6c364] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {tab === "manual" ? "Ajouter à mon portefeuille" : <>Importer {importedAssets.length} actifs <ArrowRight className="ml-2 inline h-4 w-4" /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-md border border-[#665936]/60 bg-[#1a1d1a] px-3 text-sm text-[#e2e3df] outline-none focus:border-[#c9a84c]";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-medium text-[#d0c5b2]">{label}</span>
      {children}
    </label>
  );
}
