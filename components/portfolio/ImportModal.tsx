"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  CloudUpload,
  FileSpreadsheet,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  ibTypeToImportType,
  parseIBStatement,
} from "@/lib/import/interactive-brokers-parser";
import {
  downloadGenericTemplate,
  GENERIC_COLUMN_GUIDE,
  parseGenericXlsx,
} from "@/lib/import/generic-xlsx";
import { savePendingImport } from "@/lib/import/pending-import";
import type { ImportBrokerId, PendingImportAsset } from "@/lib/import/types";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import type { TranslationKey } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type BrokerDef = {
  id: ImportBrokerId;
  label: string;
  accept: string;
  helpTitle: string;
  help: React.ReactNode;
  note?: string;
};

function getBrokers(t: (key: TranslationKey) => string): BrokerDef[] {
  return [
    {
      id: "trade_republic",
      label: "Trade Republic",
      accept: ".csv,.xls,.xlsx",
      helpTitle: t("importHelpTradeRepublic"),
      help: (
        <ol className="list-decimal space-y-1 pl-5">
          <li>{t("importTrHelp1")}</li>
          <li>{t("importTrHelp2")}</li>
          <li>{t("importTrHelp3")}</li>
        </ol>
      ),
    },
    {
      id: "degiro",
      label: "Degiro",
      accept: ".csv,.xls,.xlsx",
      helpTitle: t("importHelpDegiro"),
      help: (
        <ol className="list-decimal space-y-1 pl-5">
          <li>{t("importDegiroHelp1")}</li>
          <li>{t("importDegiroHelp2")}</li>
          <li>{t("importDegiroHelp3")}</li>
        </ol>
      ),
    },
    {
      id: "fortuneo",
      label: "Fortuneo",
      accept: ".xls,.xlsx",
      helpTitle: t("importHelpFortuneo"),
      help: (
        <ol className="list-decimal space-y-1 pl-5">
          <li>{t("importFortuneoHelp1")}</li>
          <li>{t("importFortuneoHelp2")}</li>
        </ol>
      ),
    },
    {
      id: "bitpanda",
      label: "Bitpanda",
      accept: ".csv",
      helpTitle: t("importHelpBitpanda"),
      help: (
        <ol className="list-decimal space-y-1 pl-5">
          <li>{t("importBitpandaHelp1")}</li>
          <li>{t("importBitpandaHelp2")}</li>
        </ol>
      ),
    },
    {
      id: "interactive_brokers",
      label: "Interactive Brokers",
      accept: ".csv",
      helpTitle: t("exportFromIb"),
      help: (
        <>
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>
              {t("importIbHelpSignIn")}{" "}
              <a
                href="https://clientportal.ibkr.com"
                target="_blank"
                rel="noreferrer"
                className="text-[#e6c364] underline underline-offset-2"
              >
                clientportal.ibkr.com
              </a>
            </li>
            <li>{t("ibReports")}</li>
            <li>{t("activityStatement")}</li>
            <li>{t("importIbHelpSections")}</li>
            <li>{t("importIbHelpPeriod")}</li>
            <li>{t("importIbHelpFormat")}</li>
            <li>{t("importIbHelpDownload")}</li>
          </ol>
          <p className="mt-3 text-amber-300/90">⚠️ {t("ibWarning")}</p>
        </>
      ),
      note: t("ibAccepted"),
    },
    {
      id: "generique",
      label: t("generic"),
      accept: ".xlsx,.xls",
      helpTitle: t("importHelpGeneric"),
      help: (
        <ol className="list-decimal space-y-1 pl-5">
          <li>{t("importGenericHelp1")}</li>
          <li>{t("importGenericHelp2")}</li>
          <li>{t("importGenericHelp3")}</li>
        </ol>
      ),
    },
  ];
}

function numeric(value: unknown) {
  return Number(String(value ?? "").replace(/\s/g, "").replace(/€/g, "").replace(",", "."));
}

function isoDate(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return new Date().toISOString().slice(0, 10);
  const match = raw.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})/);
  if (match) return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10);
}

function get(row: Record<string, unknown>, ...keys: string[]) {
  const actual = Object.keys(row).find((key) =>
    keys.some((wanted) => key.trim().toLowerCase() === wanted.toLowerCase()),
  );
  return actual ? row[actual] : "";
}

function assetType(value: string): PendingImportAsset["type"] {
  const type = value.toUpperCase();
  if (type.includes("ETF")) return "etf";
  if (type.includes("CRYPTO")) return "crypto";
  if (type.includes("GOLD") || type.includes("METAL") || type === "XAU" || type.includes("OR")) return "gold";
  if (type.includes("CASH")) return "cash";
  return "stock";
}

function mapBrokerRows(broker: ImportBrokerId, source: Record<string, unknown>[]): PendingImportAsset[] {
  return source.flatMap((row, index): PendingImportAsset[] => {
    if (broker === "bitpanda" && String(get(row, "Transaction Type", "Type")).toLowerCase() !== "buy") {
      return [];
    }
    const name = String(get(row, "Libellé", "Produit", "Asset", "Nom")).trim();
    const isin = String(get(row, "ISIN")).trim() || null;
    const qty = numeric(get(row, "Qté", "Quantité", "Shares", "Amount Asset"));
    const price = numeric(get(row, "PRU", "Cours", "Price", "Asset market price"));
    if (!name || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0) return [];
    const rawType = String(get(row, "Asset class", "Type"));
    const rawTicker = String(get(row, "Ticker", "Asset")).trim() || isin || name;
    const type =
      broker === "bitpanda"
        ? rawType === "Metal"
          ? "gold"
          : rawType === "Cryptocurrency"
            ? "crypto"
            : assetType(rawType || rawTicker || "crypto")
        : assetType(rawType || name);
    const ticker = broker === "bitpanda" && type === "gold" ? "XAU" : String(rawTicker).toUpperCase();
    const purchaseDate = isoDate(get(row, "Date", "Timestamp"));
    const exportedAccount = String(get(row, "account_type", "Compte")).trim();
    const account =
      broker === "bitpanda"
        ? "Compte crypto"
        : exportedAccount === "PEA"
          ? "PEA"
          : exportedAccount === "Autre"
            ? "Autre"
            : "CTO";
    const displayName =
      broker === "bitpanda" && type === "gold"
        ? "Or (Bitpanda Gold)"
        : broker === "bitpanda" && rawTicker === "BTC"
          ? "Bitcoin"
          : name;

    return [
      {
        id: `${broker}-${index}-${ticker}`,
        name: displayName,
        ticker,
        isin,
        type,
        quantity: qty,
        averageBuyPrice: price,
        currency: String(get(row, "Dev", "Currency", "Fiat")).trim().toUpperCase() || "EUR",
        account,
        purchaseDate,
        broker,
      },
    ];
  });
}

async function parseLegacyBrokerFile(broker: ImportBrokerId, file: File): Promise<PendingImportAsset[]> {
  let source: Record<string, unknown>[];
  if (/\.csv$/i.test(file.name)) {
    const text = (await file.text()).replace(/^\uFEFF/, "");
    const lines = text.split(/\r?\n/);
    const skip = broker === "bitpanda" ? 5 : broker === "fortuneo" ? 3 : 0;
    const parsed = Papa.parse<Record<string, unknown>>(lines.slice(skip).join("\n"), {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });
    if (parsed.errors.length && !parsed.data.length) throw new Error(parsed.errors[0].message);
    source = parsed.data;
  } else {
    const workbook = XLSX.read(await file.arrayBuffer(), { cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error("fileNoSheet");
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
    const expected =
      broker === "fortuneo" ? ["Libellé", "ISIN"] : broker === "degiro" ? ["Produit", "ISIN"] : ["Asset"];
    const headerIndex = matrix.findIndex((row) =>
      expected.every((header) => row.some((cell) => String(cell).trim() === header)),
    );
    if (headerIndex < 0) throw new Error(`brokerFormatUnrecognized:${broker}`);
    const headers = matrix[headerIndex].map(String);
    source = matrix
      .slice(headerIndex + 1)
      .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]])));
  }
  const mapped = mapBrokerRows(broker, source);
  if (!mapped.length) throw new Error("noValidAssetsDetected");
  return mapped;
}

const euro = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

export function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { t } = useI18n();
  const typeLabel = (type: PendingImportAsset["type"]) => {
    switch (type) {
      case "stock":
        return t("stock");
      case "etf":
        return t("etf");
      case "crypto":
        return t("crypto");
      case "gold":
        return t("gold");
      default:
        return t("cash");
    }
  };
  const fileRef = useRef<HTMLInputElement>(null);
  const [brokerId, setBrokerId] = useState<ImportBrokerId>("generique");
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<PendingImportAsset[]>([]);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [helpOpen, setHelpOpen] = useState(true);
  const [parsing, setParsing] = useState(false);

  const brokers = useMemo(() => getBrokers(t), [t]);
  const broker = useMemo(() => brokers.find((item) => item.id === brokerId) ?? brokers[0], [brokers, brokerId]);
  const isGeneric = brokerId === "generique";
  const isIB = brokerId === "interactive_brokers";

  function resetFile() {
    setFile(null);
    setRows([]);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function selectBroker(id: ImportBrokerId) {
    setBrokerId(id);
    resetFile();
    setHelpOpen(true);
  }

  async function handleFile(next: File) {
    setParsing(true);
    setError("");
    setFile(next);
    setRows([]);
    try {
      if (next.size > 15 * 1024 * 1024) {
        throw new Error(t("tooLarge"));
      }
      if (isIB) {
        if (!/\.csv$/i.test(next.name)) {
          throw new Error("ibCsvRequired");
        }
        const content = await next.text();
        const parsed = parseIBStatement(content);
        if (!parsed.length) {
          throw new Error(
            t("noPositions"),
          );
        }
        setRows(
          parsed.map((holding, index) => ({
            id: `ib-${index}-${holding.ticker}`,
            ticker: holding.ticker,
            name: holding.name,
            type: ibTypeToImportType(holding.type),
            quantity: holding.quantity,
            averageBuyPrice: holding.average_buy_price,
            currentPrice: holding.current_price || undefined,
            currency: holding.currency || "USD",
            account: holding.type === "crypto" ? "Compte crypto" : "CTO",
            purchaseDate: new Date().toISOString().slice(0, 10),
            broker: "interactive_brokers",
            assetCategory: holding.asset_category,
          })),
        );
      } else if (isGeneric) {
        const parsed = parseGenericXlsx(await next.arrayBuffer());
        setRows(parsed);
      } else {
        setRows(await parseLegacyBrokerFile(brokerId, next));
      }
    } catch (err) {
      setFile(null);
      if (err instanceof Error) {
        if (err.message.startsWith("brokerFormatUnrecognized:")) {
          setError(t("brokerFormatUnrecognized").replace("{broker}", err.message.split(":")[1] ?? ""));
        } else if (err.message in { fileNoSheet: 1, noValidAssetsDetected: 1, ibCsvRequired: 1 }) {
          setError(t(err.message as import("@/lib/i18n").TranslationKey));
        } else {
          setError(err.message);
        }
      } else {
        setError(t("fileReadFailed"));
      }
    } finally {
      setParsing(false);
    }
  }

  function goToConfirm() {
    if (!rows.length) return;
    savePendingImport(brokerId, rows, file?.name);
    onClose();
    router.push("/import/confirm");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !parsing) onClose();
      }}
    >
      <DialogContent className="max-h-[92vh] w-[min(960px,96vw)] overflow-y-auto border-white/[0.06] bg-[#111412] p-0 text-white sm:rounded-2xl">
        <DialogHeader className="border-b border-white/[0.06] px-5 pb-4 pt-5 sm:px-7 sm:pt-6">
          <DialogTitle className="text-xl">{t("importAssets")}</DialogTitle>
          <DialogDescription className="text-[rgba(255,255,255,0.55)]">
            {t("connectBroker")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-5 py-5 sm:px-7">
          <div className="flex flex-wrap gap-2">
            {brokers.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectBroker(item.id)}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                  brokerId === item.id
                    ? "border-[#c9a84c] bg-[#c9a84c]/10 text-[#e6c364]"
                    : "border-white/10 bg-[#1a1c1a] text-[rgba(255,255,255,0.65)] hover:border-white/20"
                }`}
              >
                {item.id === "interactive_brokers" ? t("interactiveBrokers") : item.id === "generique" ? t("generic") : item.label}
              </button>
            ))}
          </div>

          {isGeneric && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-[rgba(255,255,255,0.55)]">
              {[
                ["1", t("downloadTemplate"), true],
                ["2", t("fillAndImport"), Boolean(file)],
                ["3", t("confirmStep"), false],
              ].map(([step, label, active], index, arr) => (
                <div key={String(step)} className="flex items-center gap-2">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                      active ? "bg-[#c9a84c] text-[#111412]" : "bg-white/10 text-white/60"
                    }`}
                  >
                    {step}
                  </span>
                  <span className={active ? "text-[#e6c364]" : ""}>{label}</span>
                  {index < arr.length - 1 && <span className="mx-1 text-white/20">—</span>}
                </div>
              ))}
            </div>
          )}

          {isGeneric && (
            <div className="space-y-4 rounded-xl border border-white/[0.06] bg-[#1a1c1a] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{t("downloadOurTemplate")}</p>
                  <span className="mt-1 inline-block rounded border border-[#c9a84c]/40 bg-[#c9a84c]/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#e6c364]">
                    TEMPLATE_HALISIA.XLSX
                  </span>
                </div>
                <Button
                  type="button"
                  onClick={downloadGenericTemplate}
                  className="bg-[#c9a84c] text-[#111412] hover:bg-[#e6c364]"
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  {t("downloadExcelTemplate")}
                </Button>
              </div>
              <pre className="overflow-x-auto rounded-lg bg-black/40 p-3 text-[11px] leading-5 text-[#d7d1c5]">
                {`Feuille 1: Actifs (ticker, nom, type, quantite, prix_achat, date_achat, compte)
AAPL, Apple Inc., action, 5, 165.00, 2024-01-15, CTO
XAU, Or physique, or, 10, 58.50, 2023-06-01, Autre
BTC, Bitcoin, crypto, 0.05, 42000, 2024-03-20, Compte crypto
IWQU, HSBC Islamic Global ETF, etf, 20, 42.10, 2022-11-10, PEA`}
              </pre>
              <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead className="bg-[#282d29] text-[10px] uppercase tracking-wide text-white/50">
                    <tr>
                      <th className="p-2.5">{t("columnHeader")}</th>
                      <th className="p-2.5">{t("statusColumn")}</th>
                      <th className="p-2.5">{t("exampleColumn")}</th>
                      <th className="p-2.5">{t("columnDescription")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {GENERIC_COLUMN_GUIDE.map((col) => (
                      <tr key={col.key} className="border-t border-white/[0.05]">
                        <td className="p-2.5 font-mono text-[#e6c364]">{col.key}</td>
                        <td className="p-2.5">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              col.required
                                ? "bg-emerald-500/15 text-emerald-300"
                                : "bg-white/10 text-white/50"
                            }`}
                          >
                            {col.required ? t("requiredLabel") : t("optional")}
                          </span>
                        </td>
                        <td className="p-2.5 text-white/70">{col.example}</td>
                        <td className="p-2.5 text-white/55">{col.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {isIB && (
            <div className="rounded-xl border border-[#c9a84c]/25 bg-[#c9a84c]/[0.07] p-4 text-sm text-[rgba(255,255,255,0.75)]">
              <p className="mb-2 font-semibold text-[#e6c364]">{t("exportFromIb")}</p>
              {broker.help}
            </div>
          )}

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const next = event.dataTransfer.files[0];
              if (next) void handleFile(next);
            }}
            className={`flex min-h-40 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors ${
              dragging
                ? "border-[#e6c364] bg-[#c9a84c]/10"
                : "border-[#8c762e] bg-[#111412] hover:border-[#c9a84c]"
            }`}
          >
            {parsing ? (
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#e6c364]" />
            ) : (
              <CloudUpload className="mb-3 h-8 w-8 text-[#e6c364]" />
            )}
            <strong className="text-center">
              {isGeneric
                ? t("genericBrowseFile")
                : t("browseFile")}
            </strong>
            <span className="mt-2 text-xs text-[rgba(255,255,255,0.5)]">
              {isIB ? t("csvOnly") : isGeneric ? t("importGenericFileTypes") : broker.accept}
            </span>
            {broker.note && <span className="mt-2 text-xs text-[#e6c364]/80">{isIB ? t("ibAccepted") : broker.note}</span>}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={broker.accept}
            className="hidden"
            onChange={(event) => {
              const next = event.target.files?.[0];
              if (next) void handleFile(next);
            }}
          />

          {file && (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{file.name}</p>
                <p className="text-xs text-white/50">{(file.size / 1024).toFixed(1)} Ko</p>
              </div>
              <button type="button" onClick={resetFile} aria-label={t("removeFile")}>
                <Trash2 className="h-4 w-4 text-white/60 hover:text-red-300" />
              </button>
            </div>
          )}

          {error && (
            <p className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          {!!rows.length && (
            <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
              <table className="w-full min-w-[560px] text-xs">
                <thead className="bg-[#282d29] text-left text-white/60">
                  <tr>
                    {(isIB
                      ? [t("symbolColumn"), t("typeColumn"), t("quantity"), t("averagePriceColumn"), t("currencyColumn")]
                      : [t("portfolioAsset"), t("typeColumn"), t("quantity"), t("portfolioAveragePrice"), t("account")]
                    ).map((title) => (
                      <th key={title} className="p-3 font-medium">
                        {title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 8).map((row) => (
                    <tr key={row.id} className="border-t border-white/[0.05]">
                      <td className="p-3 font-semibold">
                        {isIB ? row.ticker : row.name}
                        {row.formatError && (
                          <span className="ml-2 text-[10px] text-red-300">{row.formatError}</span>
                        )}
                      </td>
                      <td className="p-3">{typeLabel(row.type)}</td>
                      <td className="p-3">{row.quantity}</td>
                      <td className="p-3">
                        {isIB && row.currency !== "EUR"
                          ? `${row.averageBuyPrice.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} ${row.currency}`
                          : euro.format(row.averageBuyPrice)}
                      </td>
                      <td className="p-3">{isIB ? row.currency : row.account}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="bg-[#1a1c1a] p-3 text-xs text-white/55">
                {rows.length} {rows.length > 1 ? t("detectedPlural") : t("detected")}
                {isIB ? ` — ${t("pricesConverted")}` : ""}
              </p>
            </div>
          )}

          {!isIB && (
            <Collapsible open={helpOpen} onOpenChange={setHelpOpen}>
              <CollapsibleTrigger className="flex w-full items-center justify-between border-y border-white/[0.06] py-3 text-left text-sm font-semibold">
                {broker.helpTitle}
                <ChevronDown className={`h-4 w-4 transition-transform ${helpOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pb-3 text-sm text-[rgba(255,255,255,0.6)]">
                {broker.help}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        <DialogFooter className="border-t border-white/[0.06] px-5 py-4 sm:px-7">
          <Button variant="ghost" onClick={onClose} disabled={parsing}>
            {t("cancel")}
          </Button>
          <Button
            onClick={goToConfirm}
            disabled={!rows.length || parsing}
            className="bg-[#c9a84c] text-[#111412] hover:bg-[#e6c364]"
          >
            {t("analyzeConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
