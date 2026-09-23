// Musaffa comparison on large caps from 14 non-US markets (Yahoo Finance symbols).
const MARKETS: Record<string, string[]> = {
  "France (.PA)": ["AI.PA", "MC.PA", "OR.PA", "SAN.PA", "TTE.PA", "BNP.PA", "SU.PA", "AIR.PA", "RMS.PA", "DG.PA"],
  "Allemagne (.DE)": ["SAP.DE", "SIE.DE", "ALV.DE", "BAS.DE", "BMW.DE", "ADS.DE", "IFX.DE", "DTE.DE", "MBG.DE", "BAYN.DE"],
  "Royaume-Uni (.L)": ["AZN.L", "SHEL.L", "ULVR.L", "HSBA.L", "GSK.L", "BP.L", "RIO.L", "DGE.L", "REL.L", "BATS.L"],
  "Pays-Bas (.AS)": ["ASML.AS", "INGA.AS", "HEIA.AS", "PRX.AS", "AD.AS", "PHIA.AS", "WKL.AS", "ADYEN.AS"],
  "Suisse (.SW)": ["NESN.SW", "NOVN.SW", "RO.SW", "UBSG.SW", "ABBN.SW", "ZURN.SW", "CFR.SW", "LONN.SW"],
  "Espagne (.MC)": ["ITX.MC", "SAN.MC", "IBE.MC", "TEF.MC", "REP.MC", "AMS.MC", "BBVA.MC", "CLNX.MC"],
  "Italie (.MI)": ["ENI.MI", "ISP.MI", "UCG.MI", "RACE.MI", "STLAM.MI", "ENEL.MI", "PRY.MI", "MONC.MI"],
  "Japon (.T)": ["7203.T", "6758.T", "9984.T", "8306.T", "6861.T", "8035.T", "4063.T", "9983.T", "6501.T", "7974.T"],
  "Inde (.NS)": ["RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "HINDUNILVR.NS", "ITC.NS", "SUNPHARMA.NS", "ASIANPAINT.NS", "MARUTI.NS", "WIPRO.NS"],
  "Arabie saoudite (.SR)": ["2222.SR", "1120.SR", "2010.SR", "7010.SR", "1180.SR", "2280.SR", "1211.SR", "2020.SR"],
  "Canada (.TO)": ["SHOP.TO", "RY.TO", "ENB.TO", "CNR.TO", "SU.TO", "TD.TO", "CSU.TO", "ATD.TO", "WCN.TO", "NTR.TO"],
  "Australie (.AX)": ["BHP.AX", "CBA.AX", "CSL.AX", "WES.AX", "RIO.AX", "FMG.AX", "WOW.AX", "TLS.AX", "XRO.AX", "COH.AX"],
  "Hong Kong (.HK)": ["0700.HK", "9988.HK", "1299.HK", "0005.HK", "3690.HK", "1810.HK", "0941.HK", "2318.HK"],
  "Malaisie (.KL)": ["1155.KL", "1295.KL", "5347.KL", "5225.KL", "1023.KL", "6888.KL", "5183.KL", "4863.KL"],
};

process.env.MUSAFFA_TICKERS ??= Object.values(MARKETS).flat().join(",");
process.env.SCREENING_OUTPUT_FILE ??= "screening-comparison-international.json";

// Loaded after the environment is set because the comparison reads it at import time.
void import("./compare-100-screening");
