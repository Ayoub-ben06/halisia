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
  AAPL: { status: "compliant", reason: "Entreprise analysée comme conforme dans ce mock." },
  TSLA: { status: "debated", reason: "Classification débattue selon certains critères de conformité." },
  NVDA: { status: "non_compliant", reason: "Non conforme selon les critères du mock (activités ou ratios)." },
  "BTC-EUR": { status: "debated", reason: "Les avis des savants divergent concernant les crypto-actifs." },
};
