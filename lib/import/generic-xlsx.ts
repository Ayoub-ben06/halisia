import * as XLSX from "xlsx";
import type { ImportAccount, ImportAssetType, PendingImportAsset } from "@/lib/import/types";

const REQUIRED_COLUMNS = [
  "ticker",
  "nom",
  "type",
  "quantite",
  "prix_achat",
  "date_achat",
  "compte",
] as const;

export const GENERIC_COLUMN_GUIDE = [
  { key: "ticker", required: true, example: "AAPL", description: "Symbole du titre boursier ou crypto." },
  { key: "nom", required: true, example: "Apple Inc.", description: "Dénomination complète de l'actif." },
  { key: "type", required: true, example: "action", description: "action, etf, crypto, or, cash." },
  { key: "quantite", required: true, example: "5", description: "Unités ou fractions détenues." },
  { key: "prix_achat", required: true, example: "165.00", description: "Prix moyen unitaire payé en EUR." },
  { key: "date_achat", required: false, example: "2024-01-15", description: "Date d'acquisition (AAAA-MM-JJ)." },
  { key: "compte", required: false, example: "CTO", description: "PEA, CTO, Compte crypto, Autre." },
  { key: "isin", required: false, example: "US0378331005", description: "Code ISIN si disponible." },
  { key: "devise", required: false, example: "EUR", description: "Devise du prix d'achat (défaut EUR)." },
] as const;

const SAMPLE_ROWS = [
  ["AAPL", "Apple Inc.", "action", 5, 165, "2024-01-15", "CTO", "US0378331005", "EUR"],
  ["XAU", "Or physique", "or", 10, 58.5, "2023-06-01", "Autre", "", "EUR"],
  ["BTC", "Bitcoin", "crypto", 0.05, 42000, "2024-03-20", "Compte crypto", "", "EUR"],
  ["IWQU", "HSBC Islamic Global Equity Index ETF", "etf", 20, 42.1, "2022-11-10", "PEA", "IE00BYVJRR92", "EUR"],
];

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

function numeric(value: unknown) {
  return Number(String(value ?? "").replace(/\s/g, "").replace(/€/g, "").replace(",", "."));
}

function mapType(raw: string): ImportAssetType {
  const value = raw.trim().toLowerCase();
  if (value === "etf") return "etf";
  if (value === "crypto" || value === "cryptocurrency") return "crypto";
  if (value === "or" || value === "gold") return "gold";
  if (value === "cash" || value === "liquide") return "cash";
  return "stock";
}

function mapAccount(raw: string, type: ImportAssetType): ImportAccount {
  const value = raw.trim().toLowerCase();
  if (value === "pea") return "PEA";
  if (value === "compte crypto" || value === "crypto") return "Compte crypto";
  if (value === "autre") return "Autre";
  if (type === "crypto") return "Compte crypto";
  return "CTO";
}

function isoDate(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const match = raw.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10);
}

export function buildGenericTemplateWorkbook(): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    [...REQUIRED_COLUMNS, "isin", "devise"],
    ...SAMPLE_ROWS,
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, "Actifs");
  return XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
}

export function downloadGenericTemplate() {
  const buffer = buildGenericTemplateWorkbook();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "TEMPLATE_HALISIA.xlsx";
  link.click();
  URL.revokeObjectURL(url);
}

export function parseGenericXlsx(buffer: ArrayBuffer): PendingImportAsset[] {
  const workbook = XLSX.read(buffer, { cellDates: true, type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("Le fichier ne contient aucune feuille.");

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  const headerIndex = matrix.findIndex((row) => {
    const normalized = row.map(normalizeHeader);
    return REQUIRED_COLUMNS.slice(0, 5).every((col) => normalized.includes(col));
  });
  if (headerIndex < 0) {
    throw new Error("Colonnes requises introuvables. Utilisez le modèle TEMPLATE_HALISIA.xlsx.");
  }

  const headers = matrix[headerIndex].map(normalizeHeader);
  const assets: PendingImportAsset[] = [];

  for (let i = headerIndex + 1; i < matrix.length; i++) {
    const row = matrix[i];
    if (!row || row.every((cell) => String(cell ?? "").trim() === "")) continue;

    const get = (...keys: string[]) => {
      const idx = headers.findIndex((header) => keys.includes(header));
      return idx >= 0 ? row[idx] : "";
    };

    const ticker = String(get("ticker", "symbole", "symbol")).trim().toUpperCase();
    const name = String(get("nom", "name", "libelle")).trim();
    const type = mapType(String(get("type")));
    const quantity = numeric(get("quantite", "quantity", "qte"));
    const averageBuyPrice = numeric(get("prix_achat", "pru", "price"));
    const purchaseDate = isoDate(get("date_achat", "date"));
    const account = mapAccount(String(get("compte", "account")), type);
    const isin = String(get("isin")).trim() || null;
    const currency = String(get("devise", "currency")).trim().toUpperCase() || "EUR";

    let formatError: string | null = null;
    if (!ticker) formatError = "Ticker manquant";
    else if (!name) formatError = "Nom manquant";
    else if (!Number.isFinite(quantity) || quantity <= 0) formatError = "Quantité invalide";
    else if (!Number.isFinite(averageBuyPrice) || averageBuyPrice <= 0) formatError = "Prix d'achat invalide";
    else if (purchaseDate > new Date().toISOString().slice(0, 10)) formatError = "Date dans le futur";

    assets.push({
      id: `generic-${i}-${ticker || "row"}`,
      ticker: ticker || `LIGNE_${i + 1}`,
      name: name || ticker || `Ligne ${i + 1}`,
      type,
      quantity: Number.isFinite(quantity) ? quantity : 0,
      averageBuyPrice: Number.isFinite(averageBuyPrice) ? averageBuyPrice : 0,
      currency,
      account,
      purchaseDate,
      isin,
      broker: "generique",
      formatError,
    });
  }

  if (!assets.length) throw new Error("Aucun actif détecté dans le fichier.");
  return assets;
}
