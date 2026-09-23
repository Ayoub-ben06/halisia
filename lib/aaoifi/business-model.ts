import { baseTicker } from "./rules";

// Full symbols (e.g. "BA.L") take precedence over the base ticker so that a
// foreign listing never inherits the entry of a US company sharing its root.
function lookup(list: Record<string, string>, ticker: string): string | undefined {
  const symbol = ticker.toUpperCase();
  return list[symbol] ?? list[baseTicker(symbol)];
}

// Editorial list: companies whose financial ratios pass AAOIFI but whose core
// business model is disputed among scholars. Ratio failures still take
// precedence (NON_COMPLIANT).
export const BUSINESS_MODEL_DOUBTFUL: Record<string, string> = {
  GOOGL: "Plus de 75% des revenus proviennent de la publicité (secteur controversé selon certains scholars)",
  GOOG: "Plus de 75% des revenus proviennent de la publicité (secteur controversé selon certains scholars)",
  META: "Plus de 97% des revenus proviennent de la publicité (secteur controversé selon certains scholars)",
  AMZN: "Services financiers intégrés (Amazon Pay, Buy Now Pay Later) + publicité significative",
  WMT: "Services financiers (Walmart Pay, crédits consommateurs) représentent une part croissante",
  SNAP: "Modèle publicitaire dominant",
  PINS: "Modèle publicitaire dominant",
  TTD: "Plateforme publicitaire pure",
  NOW: "Modèle économique SaaS avec revenus différés significatifs — classification en cours de révision par notre équipe d'analyse",
  PEP: "Services financiers intégrés",
  ADI: "Revenus de licences semiconducteurs incluent des composantes financières — classification en cours de révision par notre équipe d'analyse",
  "0700.HK": "Jeux vidéo, musique (Tencent Music) et services financiers (WeChat Pay, crédit) : part de revenus douteux significative",
  "7974.T": "Jeux vidéo : contenus dont la licéité fait débat entre scholars",
  "RELIANCE.NS": "Médias et divertissement (JioStar) au sein du groupe — classification en cours de révision par notre équipe d'analyse",
  "RACE.MI": "Ferrari Financial Services (financement conventionnel de véhicules) — classification en cours de révision par notre équipe d'analyse",
  "WKL.AS": "Services de conformité et de financement destinés aux banques (Financial & Corporate Compliance) — classification en cours de révision par notre équipe d'analyse",
  "NESN.SW": "Certaines gammes de produits peuvent contenir des ingrédients douteux — classification en cours de révision par notre équipe d'analyse",
  "ULVR.L": "Certaines gammes de produits peuvent contenir des ingrédients douteux — classification en cours de révision par notre équipe d'analyse",
  "WES.AX": "Activités de distribution diversifiées — classification en cours de révision par notre équipe d'analyse",
};

// Diversified aerospace groups whose activity code (e.g. "Aircraft",
// "Aerospace & Defense") does not reveal their weapons business; defense
// revenue is well above 5 %.
export const WEAPONS_REVENUE: Record<string, string> = {
  BA: "Boeing Defense, Space & Security : environ un tiers des revenus provient de l'armement",
  RTX: "Raytheon : une part majeure des revenus provient des missiles et systèmes d'armes",
  GD: "Majorité des revenus issue de la défense (sous-marins, blindés, munitions)",
  GE: "GE Aerospace Defense & Propulsion : moteurs d'avions militaires",
  LHX: "Majorité des revenus issue de la défense",
  HII: "Construction navale militaire (porte-avions, sous-marins)",
  BAESY: "BAE Systems : majorité des revenus issue de la défense",
  "BA.L": "BAE Systems : majorité des revenus issue de la défense",
  "AIR.PA": "Airbus Defence and Space : environ un cinquième des revenus provient de la défense",
  "HO.PA": "Thales : environ la moitié des revenus provient de la défense",
  "RHM.DE": "Rheinmetall : majorité des revenus issue des armes et munitions",
  "LDO.MI": "Leonardo : majorité des revenus issue de la défense",
};

// Companies with a known impermissible business segment above 5 % of revenue
// that neither the SEC nor the Yahoo activity label reveals.
export const NON_PERMISSIBLE_REVENUE: Record<string, string> = {
  "MC.PA": "Moët Hennessy (vins et spiritueux) représente plus de 5 % du chiffre d'affaires",
  "6758.T": "Sony Music et Sony Pictures représentent plus de 5 % du chiffre d'affaires",
  "ATD.TO": "Ventes de tabac et d'alcool dans les magasins Circle K supérieures à 5 % du chiffre d'affaires",
  IBM: "IBM Financing (financement conventionnel des clients et partenaires)",
};

// IT services and software vendors whose revenue comes largely from
// conventional banks and insurers. Under the strict reading applied by
// several screeners, that revenue counts as impermissible; some scholars
// accept it because the service itself (IT) is permissible.
const FINANCIAL_CLIENTS_REASON = "une part significative du chiffre d'affaires provient de banques et d'assureurs conventionnels (lecture stricte ; certains scholars l'acceptent car le service informatique est permis en soi)";
const BANKING_SOFTWARE_REASON = "logiciels destinés quasi exclusivement aux banques et assureurs conventionnels";
export const FINANCIAL_SECTOR_CLIENTS: Record<string, string> = {
  "TCS.NS": FINANCIAL_CLIENTS_REASON,
  "INFY.NS": FINANCIAL_CLIENTS_REASON,
  INFY: FINANCIAL_CLIENTS_REASON,
  "WIPRO.NS": FINANCIAL_CLIENTS_REASON,
  WIT: FINANCIAL_CLIENTS_REASON,
  "HCLTECH.NS": FINANCIAL_CLIENTS_REASON,
  "TECHM.NS": FINANCIAL_CLIENTS_REASON,
  "LTIM.NS": FINANCIAL_CLIENTS_REASON,
  "PERSISTENT.NS": FINANCIAL_CLIENTS_REASON,
  "COFORGE.NS": FINANCIAL_CLIENTS_REASON,
  "MPHASIS.NS": FINANCIAL_CLIENTS_REASON,
  CTSH: FINANCIAL_CLIENTS_REASON,
  ACN: FINANCIAL_CLIENTS_REASON,
  GLOB: FINANCIAL_CLIENTS_REASON,
  JKHY: BANKING_SOFTWARE_REASON,
  NCNO: BANKING_SOFTWARE_REASON,
  QTWO: BANKING_SOFTWARE_REASON,
  "TEMN.SW": BANKING_SOFTWARE_REASON,
  GWRE: BANKING_SOFTWARE_REASON,
  VRSK: BANKING_SOFTWARE_REASON,
  FDS: BANKING_SOFTWARE_REASON,
};

export function getFinancialSectorClients(ticker: string): string | undefined {
  return lookup(FINANCIAL_SECTOR_CLIENTS, ticker);
}

// Banks and insurers operating under Shariah governance: the conventional
// finance exclusion does not apply, the financial ratios still do.
export const ISLAMIC_FINANCIALS: Record<string, string> = {
  "1120.SR": "Al Rajhi Bank — banque islamique",
  "1150.SR": "Alinma Bank — banque islamique",
  "1140.SR": "Bank Albilad — banque islamique",
  "1020.SR": "Bank AlJazira — banque islamique",
  "DIB.AE": "Dubai Islamic Bank — banque islamique",
  "ADIB.AE": "Abu Dhabi Islamic Bank — banque islamique",
  "KFH.KW": "Kuwait Finance House — banque islamique",
  "1183.KL": "Bank Islam Malaysia — banque islamique",
};

export function getWeaponsExposure(ticker: string): string | undefined {
  return lookup(WEAPONS_REVENUE, ticker);
}

export function getNonPermissibleRevenue(ticker: string): string | undefined {
  return lookup(NON_PERMISSIBLE_REVENUE, ticker);
}

export function getIslamicFinancial(ticker: string): string | undefined {
  return ISLAMIC_FINANCIALS[ticker.toUpperCase()];
}

export const BUSINESS_MODEL_DOUBTFUL_NOTE = "Les ratios financiers sont conformes mais le modèle économique fait l'objet de divergences entre scholars";

export function getBusinessModelDoubt(ticker: string): string | undefined {
  return lookup(BUSINESS_MODEL_DOUBTFUL, ticker);
}
