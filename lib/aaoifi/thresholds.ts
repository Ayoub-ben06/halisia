export const AAOIFI_SCREENING_V1 = {
  id: "AAOIFI_SCREENING_V1" as const,
  impureRevenueRatio: { value: 0.05, operator: "≤" as const },
  interestBearingDebtRatio: { value: 0.3, operator: "<" as const },
  // Dow Jones Islamic / S&P Shariah use 33 %: between both limits the verdict is DOUBTFUL.
  interestBearingDebtToleranceRatio: { value: 0.33, operator: "≤" as const },
  interestBearingCashAndSecuritiesRatio: { value: 0.3, operator: "<" as const },
  liquidityToAssetsRatio: { value: 0.7, operator: "<" as const },
};
