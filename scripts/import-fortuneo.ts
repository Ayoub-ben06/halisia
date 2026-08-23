const path = require("node:path");
const XLSX = require("xlsx");
const { createClient } = require("@supabase/supabase-js");

export {};

require("dotenv").config({
  path: path.resolve(process.cwd(), ".env.local"),
  quiet: true,
});
require("dotenv").config({
  path: path.resolve(process.cwd(), ".env"),
  quiet: true,
});

type AccountType = "PEA" | "CTO";

type FortuneoAsset = {
  user_id: string;
  ticker: null;
  isin: string;
  name: string;
  type: "stock" | "etf";
  quantity: number;
  average_buy_price: number;
  current_price: number;
  currency: string;
  broker: "fortuneo";
  account_type: AccountType;
};

type PortfolioFile = {
  filename: string;
  accountType: AccountType;
};

const USER_ID = "68c82e2f-56df-4dac-88ed-32f8a3e2637b";

const portfolioFiles: PortfolioFile[] = [
  {
    filename: "Export_portefeuille_simple_010093928316.xls",
    accountType: "PEA",
  },
  {
    filename: "Export_portefeuille_simple_010093928301.xls",
    accountType: "CTO",
  },
];

function requiredNumber(
  value: unknown,
  column: string,
  rowNumber: number,
): number {
  const parsed =
    typeof value === "number"
      ? value
      : Number(
          String(value ?? "")
            .replace(/\s/g, "")
            .replace(",", "."),
        );

  if (!Number.isFinite(parsed)) {
    throw new Error(
      `Invalid ${column} value on Excel row ${rowNumber}: ${String(value)}`,
    );
  }

  return parsed;
}

function parsePortfolio(file: PortfolioFile): FortuneoAsset[] {
  const filePath = path.resolve(process.cwd(), "public", "data", file.filename);
  const workbook = XLSX.readFile(filePath);
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error(`${file.filename} does not contain a worksheet.`);
  }

  const rows: unknown[][] = XLSX.utils.sheet_to_json(
    workbook.Sheets[firstSheetName],
    {
      header: 1,
      raw: true,
      defval: null,
    },
  );
  const headerIndex = rows.findIndex((row) =>
    row.some((cell) => cell === "Libellé"),
  );

  if (headerIndex === -1) {
    throw new Error(
      `Could not find the Fortuneo header row in ${file.filename}.`,
    );
  }

  const headers = rows[headerIndex].map((header) =>
    String(header ?? "").trim(),
  );
  const columnIndex = (name: string): number => {
    const index = headers.indexOf(name);
    if (index === -1)
      throw new Error(`Missing column "${name}" in ${file.filename}.`);
    return index;
  };

  const nameColumn = columnIndex("Libellé");
  const isinColumn = columnIndex("ISIN");
  const quantityColumn = columnIndex("Qté");
  const averagePriceColumn = columnIndex("PRU");
  const currentPriceColumn = columnIndex("Cours");
  const currencyColumn = columnIndex("Dev");

  return rows.slice(headerIndex + 1).flatMap((row, index) => {
    const name = String(row[nameColumn] ?? "").trim();
    const isin = String(row[isinColumn] ?? "").trim();

    // Ignore totals and blank/footer rows, which do not have both identifiers.
    if (!name || !isin) return [];

    const excelRowNumber = headerIndex + index + 2;

    return [
      {
        user_id: USER_ID,
        ticker: null,
        isin,
        name,
        type: /ETF|MSCI/i.test(name) ? "etf" : "stock",
        quantity: requiredNumber(row[quantityColumn], "Qté", excelRowNumber),
        average_buy_price: requiredNumber(
          row[averagePriceColumn],
          "PRU",
          excelRowNumber,
        ),
        current_price: requiredNumber(
          row[currentPriceColumn],
          "Cours",
          excelRowNumber,
        ),
        currency: String(row[currencyColumn] ?? "").trim(),
        broker: "fortuneo",
        account_type: file.accountType,
      } satisfies FortuneoAsset,
    ];
  });
}

async function main(): Promise<void> {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const file of portfolioFiles) {
    const assets = parsePortfolio(file);
    console.log(
      `Parsed ${assets.length} ${file.accountType} asset(s) from ${file.filename}.`,
    );

    for (const asset of assets) {
      const { data, error } = await supabase
        .from("assets")
        .insert(asset)
        .select()
        .single();

      if (error) {
        throw new Error(
          `Failed to insert ${asset.name} (${asset.isin}): ${error.message}`,
        );
      }

      console.log("Inserted asset:", data);
    }
  }
}

main().catch((error: unknown) => {
  console.error("Fortuneo import failed:", error);
  process.exitCode = 1;
});
