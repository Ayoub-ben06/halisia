import { NextResponse } from "next/server";

type AlphaResponse = {
  Note?: string;
  Information?: string;
  "Error Message"?: string;
};

type Overview = AlphaResponse & {
  Name?: string;
  Sector?: string;
  MarketCapitalization?: string;
};

type IncomeStatement = AlphaResponse & {
  annualReports?: Array<{
    totalRevenue?: string;
    interestIncome?: string;
  }>;
};

type BalanceSheet = AlphaResponse & {
  annualReports?: Array<{
    shortLongTermDebtTotal?: string;
    shortTermDebt?: string;
    longTermDebt?: string;
  }>;
};

const forbiddenSectors = [
  "Banks",
  "Insurance",
  "Alcohol",
  "Tobacco",
  "Defense",
  "Weapons",
  "Cannabis",
  "Adult Entertainment",
  "Gambling",
];

function number(value?: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function alphaError(response: AlphaResponse) {
  return response["Error Message"] ?? response.Note ?? response.Information;
}

export async function POST(request: Request) {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  const { ticker } = (await request.json()) as { ticker?: string };

  if (!apiKey) {
    return NextResponse.json(
      { error: "La variable ALPHA_VANTAGE_API_KEY n'est pas configurée." },
      { status: 500 },
    );
  }

  if (!ticker) {
    return NextResponse.json({ error: "Ticker manquant." }, { status: 400 });
  }

  const endpoint = "https://www.alphavantage.co/query";
  const query = (fn: string) =>
    `${endpoint}?function=${fn}&symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`;
  const getAlphaData = async <T extends AlphaResponse>(fn: string) => {
    const response = await fetch(query(fn), { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Alpha Vantage a refusé ${fn}.`);
    }
    return response.json() as Promise<T>;
  };
  const respectRateLimit = () =>
    new Promise((resolve) => setTimeout(resolve, 1100));

  try {
    const overview = await getAlphaData<Overview>("OVERVIEW");
    await respectRateLimit();
    const income = await getAlphaData<IncomeStatement>("INCOME_STATEMENT");
    await respectRateLimit();
    const balance = await getAlphaData<BalanceSheet>("BALANCE_SHEET");
    const error = alphaError(overview) ?? alphaError(income) ?? alphaError(balance);

    if (error) {
      return NextResponse.json({ error }, { status: 502 });
    }

    const report = income.annualReports?.[0];
    const balanceReport = balance.annualReports?.[0];
    const marketCap = number(overview.MarketCapitalization);
    const revenue = number(report?.totalRevenue);
    const totalDebt =
      number(balanceReport?.shortLongTermDebtTotal) ||
      number(balanceReport?.shortTermDebt) + number(balanceReport?.longTermDebt);

    if (!overview.Name) {
      return NextResponse.json(
        {
          error:
            "Alpha Vantage reconnaît ce ticker, mais ne fournit pas ses données fondamentales avec cette offre. Le screening est impossible.",
        },
        { status: 422 },
      );
    }

    if (marketCap <= 0 || revenue <= 0 || !balanceReport) {
      return NextResponse.json(
        {
          error:
            "Les états financiers Alpha Vantage sont incomplets pour cette action. Le screening est impossible.",
        },
        { status: 422 },
      );
    }

    const sector = overview.Sector || "Secteur inconnu";
    const debtRatio = totalDebt / marketCap;
    const interestRatio = Math.max(0, number(report?.interestIncome)) / revenue;
    const sectorForbidden = forbiddenSectors.some((forbidden) =>
      sector.toLowerCase().includes(forbidden.toLowerCase()),
    );

    return NextResponse.json({
      companyName: overview.Name,
      sector,
      debtRatio,
      interestRatio,
      sectorForbidden,
      debtPassed: debtRatio < 0.33,
      interestPassed: interestRatio < 0.05,
    });
  } catch {
    return NextResponse.json(
      { error: "Impossible de contacter Alpha Vantage." },
      { status: 502 },
    );
  }
}
