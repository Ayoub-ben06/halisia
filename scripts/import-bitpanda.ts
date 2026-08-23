const fs = require("node:fs");
const path = require("node:path");
const Papa = require("papaparse") as typeof import("papaparse");
const { createClient } = require("@supabase/supabase-js");

export {};

require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
require("dotenv").config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

const USER_ID = "68c82e2f-56df-4dac-88ed-32f8a3e2637b";
const CSV_PATH = path.resolve(process.cwd(), "public", "data", "bitpanda-trades.csv");

type CsvRow = Record<string, string>;
type AssetClass = "crypto" | "gold";

type ParsedTransaction = {
  user_id: string;
  transaction_id: string;
  asset_name: string;
  asset_ticker: string;
  asset_class: AssetClass;
  transaction_date: string;
  quantity: number;
  price_eur: number;
  amount_eur: number;
  fee_eur: number;
  broker: "bitpanda";
};

function requiredNumber(value: string, field: string, transactionId: string): number {
  const parsed = Number(value.replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(parsed)) {
    throw new Error(`${transactionId}: valeur invalide pour ${field}: "${value}"`);
  }
  return parsed;
}

function optionalNumber(value: string, field: string, transactionId: string): number {
  return !value || value === "-" ? 0 : requiredNumber(value, field, transactionId);
}

function assetName(ticker: string, assetClass: AssetClass): string {
  if (assetClass === "gold") return "Or (Bitpanda Gold)";
  if (ticker === "BTC") return "Bitcoin";
  return ticker;
}

function parseTransactions(): ParsedTransaction[] {
  const csv = fs.readFileSync(CSV_PATH, "utf8").replace(/^\uFEFF/, "");
  const transactionCsv = csv.split(/\r?\n/).slice(5).join("\n");
  const parsed = Papa.parse<CsvRow>(transactionCsv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    throw new Error(`CSV invalide: ${parsed.errors[0].message}`);
  }

  return parsed.data
    .filter((row) => row["Transaction Type"]?.trim().toLowerCase() === "buy")
    .flatMap((row) => {
      const csvAssetClass = row["Asset class"]?.trim();
      if (csvAssetClass !== "Cryptocurrency" && csvAssetClass !== "Metal") return [];

      const transactionId = row["Transaction ID"]?.trim();
      const ticker = row.Asset?.trim();
      const assetClass: AssetClass = csvAssetClass === "Metal" ? "gold" : "crypto";
      const transactionDate = new Date(row.Timestamp);

      if (!transactionId || !ticker) throw new Error("Transaction sans identifiant ou actif.");
      if (Number.isNaN(transactionDate.getTime())) {
        throw new Error(`${transactionId}: date invalide: "${row.Timestamp}"`);
      }
      if (row.Fiat !== "EUR" || row["Asset market price currency"] !== "EUR") {
        throw new Error(`${transactionId}: seules les transactions en EUR sont supportées.`);
      }

      return [{
        user_id: USER_ID,
        transaction_id: transactionId,
        asset_name: assetName(ticker, assetClass),
        asset_ticker: assetClass === "gold" ? "XAU" : ticker,
        asset_class: assetClass,
        transaction_date: transactionDate.toISOString(),
        quantity: requiredNumber(row["Amount Asset"], "Amount Asset", transactionId),
        price_eur: requiredNumber(row["Asset market price"], "Asset market price", transactionId),
        amount_eur: requiredNumber(row["Amount Fiat"], "Amount Fiat", transactionId),
        fee_eur: optionalNumber(row.Fee, "Fee", transactionId),
        broker: "bitpanda",
      }];
    });
}

function totals(rows: ParsedTransaction[]) {
  const quantity = rows.reduce((sum, row) => sum + row.quantity, 0);
  const invested = rows.reduce((sum, row) => sum + row.amount_eur, 0);
  if (quantity <= 0) throw new Error("La quantité cumulée doit être supérieure à zéro.");
  return { quantity, invested, average: invested / quantity };
}

async function main(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Variables SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquantes.");
  }

  const transactions = parseTransactions();
  if (transactions.length === 0) throw new Error("Aucun achat crypto ou or trouvé dans le CSV.");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const cryptoByTicker = new Map<string, ParsedTransaction[]>();
  for (const transaction of transactions.filter((row) => row.asset_class === "crypto")) {
    const rows = cryptoByTicker.get(transaction.asset_ticker) ?? [];
    rows.push(transaction);
    cryptoByTicker.set(transaction.asset_ticker, rows);
  }

  for (const [ticker, rows] of Array.from(cryptoByTicker.entries())) {
    const summary = totals(rows);
    const { error } = await supabase.from("crypto_assets").upsert({
      user_id: USER_ID,
      name: rows[0].asset_name,
      ticker,
      quantity: summary.quantity,
      average_buy_price: summary.average,
      current_price: summary.average,
      total_invested: summary.invested,
      currency: "EUR",
      broker: "bitpanda",
      halal_status: "debated",
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,ticker,broker" });
    if (error) throw new Error(`Échec de l'upsert crypto ${ticker}: ${error.message}`);

    console.log(
      `✅ CRYPTO: ${ticker} ${summary.quantity.toFixed(8)} unités @ ${summary.average.toFixed(2)}€ moyenne | Investi: ${summary.invested.toFixed(2)}€`,
    );
  }

  const goldRows = transactions.filter((row) => row.asset_class === "gold");
  if (goldRows.length > 0) {
    const summary = totals(goldRows);
    const { error } = await supabase.from("gold_assets").upsert({
      user_id: USER_ID,
      name: "Or (Bitpanda Gold)",
      ticker: "XAU",
      quantity_grams: summary.quantity,
      average_buy_price_per_gram: summary.average,
      current_price_per_gram: summary.average,
      total_invested: summary.invested,
      currency: "EUR",
      broker: "bitpanda",
      halal_status: "compliant",
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,ticker,broker" });
    if (error) throw new Error(`Échec de l'upsert or: ${error.message}`);

    console.log(
      `✅ OR: ${summary.quantity.toFixed(2)} grammes @ ${summary.average.toFixed(2)}€/gramme moyenne | Investi: ${summary.invested.toFixed(2)}€`,
    );
  }

  const { error: transactionError } = await supabase
    .from("transactions")
    .upsert(transactions, { onConflict: "transaction_id" });
  if (transactionError) {
    throw new Error(`Échec de l'import de l'historique: ${transactionError.message}`);
  }
  console.log(`✅ HISTORIQUE: ${transactions.length} transactions importées.`);
}

main().catch((error: unknown) => {
  console.error("Import Bitpanda échoué:", error);
  process.exitCode = 1;
});
