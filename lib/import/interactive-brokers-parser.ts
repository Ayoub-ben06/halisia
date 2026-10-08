export interface IBHolding {
  ticker: string;
  name: string;
  type: "action" | "etf" | "crypto" | "or";
  quantity: number;
  average_buy_price: number;
  current_price: number;
  currency: string;
  asset_category: string;
}

const ALLOWED_CATEGORIES = /^(stocks?|etf|fund|cryptocurrenc(y|ies)|digital\s*currency)/i;
const EXCLUDED_CATEGORIES = /(option|future|warrant|bond|forex|cfd|commodity\s*future)/i;

/** Normalize IB tickers toward Yahoo Finance symbols (BRK B → BRK-B). */
export function normalizeIBTicker(ibTicker: string): string {
  return ibTicker.replace(/\s+/g, "-").replace(/\./g, "-").toUpperCase();
}

function detectSeparator(sample: string): "," | ";" {
  const comma = (sample.match(/,/g) ?? []).length;
  const semi = (sample.match(/;/g) ?? []).length;
  return semi > comma ? ";" : ",";
}

function parseNumber(value: string): number {
  const normalized = value.trim().replace(/\s/g, "");
  if (!normalized) return Number.NaN;
  const normalizedNumber = normalized.includes(".") && normalized.includes(",")
    ? normalized.replace(/,/g, "")
    : normalized.replace(/,/g, ".");
  return Number(normalizedNumber);
}

/** Parse a CSV line handling quoted fields and locale separators. */
export function parseCSVLine(line: string, separator: "," | ";" = ","): string[] | null {
  if (!line?.trim()) return null;

  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function mapAssetType(assetCategory: string, symbol: string): IBHolding["type"] {
  if (/etf|fund/i.test(assetCategory)) return "etf";
  if (/crypto|digital/i.test(assetCategory)) return "crypto";
  if (symbol === "XAUUSD" || /gold/i.test(symbol) || /gold/i.test(assetCategory)) return "or";
  return "action";
}

function isAllowedCategory(assetCategory: string): boolean {
  if (!assetCategory) return false;
  if (EXCLUDED_CATEGORIES.test(assetCategory)) return false;
  return ALLOWED_CATEGORIES.test(assetCategory);
}

function parseIBTrades(lines: string[], separator: "," | ";"): IBHolding[] {
  const tradesBySymbol = new Map<
    string,
    { ticker: string; totalQuantity: number; totalCost: number; currency: string; category: string }
  >();
  let inTrades = false;
  let headers: string[] = [];

  for (const line of lines) {
    const cols = parseCSVLine(line, separator);
    if (!cols || cols.length < 3) continue;

    const section = cols[0]?.trim();
    const rowType = cols[1]?.trim();

    if (section === "Trades" && rowType === "Header") {
      inTrades = true;
      headers = cols.map((h) => h?.trim().toLowerCase());
      continue;
    }

    if (inTrades && section !== "Trades") {
      inTrades = false;
      continue;
    }

    if (inTrades && rowType === "Data" && cols[2]?.trim() === "Order") {
      const getValue = (col: string) => {
        const idx = headers.indexOf(col.toLowerCase());
        return idx >= 0 ? cols[idx]?.trim() ?? "" : "";
      };

      const assetCategory = getValue("asset category");
      if (!isAllowedCategory(assetCategory)) continue;

      const symbol = normalizeIBTicker(getValue("symbol"));
      const quantity = parseNumber(getValue("quantity"));
      const price = parseNumber(getValue("t. price"));
      const currency = getValue("currency") || "USD";

      // Exclude shorts and invalid rows
      if (!symbol || Number.isNaN(quantity) || quantity <= 0 || Number.isNaN(price)) continue;

      const existing = tradesBySymbol.get(symbol);
      if (!existing) {
        tradesBySymbol.set(symbol, {
          ticker: symbol,
          totalQuantity: quantity,
          totalCost: quantity * price,
          currency,
          category: assetCategory,
        });
      } else {
        existing.totalQuantity += quantity;
        existing.totalCost += quantity * price;
      }
    }
  }

  return Array.from(tradesBySymbol.values())
    .filter((t) => t.totalQuantity > 0)
    .map((t) => ({
      ticker: t.ticker,
      name: t.ticker,
      type: mapAssetType(t.category, t.ticker),
      quantity: t.totalQuantity,
      average_buy_price: t.totalCost / t.totalQuantity,
      current_price: 0,
      currency: t.currency || "USD",
      asset_category: t.category || "Stocks",
    }));
}

/**
 * Parse an Interactive Brokers Activity Statement CSV.
 * Prefers Open Positions; falls back to aggregating Trades buys.
 */
export function parseIBStatement(csvContent: string): IBHolding[] {
  const text = csvContent.replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/);
  const sample = lines.slice(0, 40).join("\n");
  const separator = detectSeparator(sample);

  const holdings: IBHolding[] = [];
  let inOpenPositions = false;
  let headers: string[] = [];

  for (const line of lines) {
    const cols = parseCSVLine(line, separator);
    if (!cols || cols.length < 3) continue;

    const section = cols[0]?.trim();
    const rowType = cols[1]?.trim();

    if (section === "Open Positions" && rowType === "Header") {
      inOpenPositions = true;
      headers = cols.map((h) => h?.trim().toLowerCase());
      continue;
    }

    if (inOpenPositions && section !== "Open Positions") {
      inOpenPositions = false;
      continue;
    }

    if (inOpenPositions && rowType === "Data") {
      const discriminator = cols[2]?.trim().toLowerCase();
      if (discriminator === "total" || discriminator === "total in eur" || discriminator === "total in usd") {
        continue;
      }

      const getValue = (col: string) => {
        const idx = headers.indexOf(col.toLowerCase());
        return idx >= 0 ? cols[idx]?.trim() ?? "" : "";
      };

      const assetCategory = getValue("asset category");
      if (!isAllowedCategory(assetCategory)) continue;

      const symbolRaw = getValue("symbol");
      if (!symbolRaw || /^total/i.test(symbolRaw)) continue;

      const symbol = normalizeIBTicker(symbolRaw);
      const quantity = parseNumber(getValue("quantity"));
      const costPrice = parseNumber(getValue("cost price"));
      const closePrice = parseNumber(getValue("close price"));
      const currency = getValue("currency") || "USD";

      // Short positions are excluded
      if (!symbol || Number.isNaN(quantity) || quantity <= 0) continue;

      holdings.push({
        ticker: symbol,
        name: symbol,
        type: mapAssetType(assetCategory, symbol),
        quantity: Math.abs(quantity),
        average_buy_price: Number.isFinite(costPrice) ? costPrice : 0,
        current_price: Number.isFinite(closePrice) ? closePrice : 0,
        currency,
        asset_category: assetCategory || "Stocks",
      });
    }
  }

  if (holdings.length === 0) {
    return parseIBTrades(lines, separator);
  }

  return holdings;
}

export function ibTypeToImportType(type: IBHolding["type"]): "stock" | "etf" | "crypto" | "gold" {
  if (type === "etf") return "etf";
  if (type === "crypto") return "crypto";
  if (type === "or") return "gold";
  return "stock";
}
