export type HalalMockResult = {
  status: "compliant" | "non_compliant" | "debated";
  reason: string;
  debtRatio?: string;
  illicitRevenue?: string;
  sector?: string;
};

export const halalMock: Record<string, HalalMockResult> = {
  "AI.PA": {
    status: "compliant",
    reason: "Cette entreprise répond aux critères de conformité du mock. Ses activités principales et ses ratios financiers restent dans les limites définies.",
    debtRatio: "7,9 %",
    illicitRevenue: "≈ 0 %",
    sector: "Industriel",
  },
  "HIES.PA": { status: "compliant", reason: "ETF conçu pour suivre un indice filtré selon des principes islamiques." },
  "HIPS.PA": { status: "compliant", reason: "ETF conçu pour suivre un indice filtré selon des principes islamiques." },
  "HIWS.PA": { status: "compliant", reason: "ETF conçu pour suivre un indice filtré selon des principes islamiques." },
  "BTC-EUR": { status: "debated", reason: "Les avis des savants divergent concernant les crypto-actifs." },
};
