export type ImportAssetType = "stock" | "etf" | "crypto" | "gold" | "cash";
export type ImportAccount = "PEA" | "CTO" | "Compte crypto" | "Autre";
export type ImportHalalStatus = "compliant" | "non_compliant" | "debated" | "unknown";
export type ImportBrokerId =
  | "trade_republic"
  | "degiro"
  | "fortuneo"
  | "bitpanda"
  | "interactive_brokers"
  | "generique";

/** Asset staged in sessionStorage before the confirmation screen. */
export type PendingImportAsset = {
  id: string;
  ticker: string;
  name: string;
  type: ImportAssetType;
  quantity: number;
  averageBuyPrice: number;
  currentPrice?: number;
  currency: string;
  account: ImportAccount;
  purchaseDate: string;
  isin?: string | null;
  broker: ImportBrokerId;
  assetCategory?: string;
  formatError?: string | null;
};

export type PendingImportPayload = {
  broker: ImportBrokerId;
  fileName?: string;
  assets: PendingImportAsset[];
  createdAt: string;
};

export const PENDING_IMPORT_KEY = "pendingImport";
