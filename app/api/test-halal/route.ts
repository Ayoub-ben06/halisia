import { NextResponse } from "next/server";

const query = `{
  basicCompliance {
    report(symbol: "AMBO") {
      name
      symbol
      status
      purificationRatio
      reportDate
    }
  }
}`;

export async function POST() {
  const apiKey = process.env.ZOYA_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "La variable ZOYA_API_KEY n'est pas configurée." },
      { status: 500 },
    );
  }

  try {
    const response = await fetch("https://sandbox-api.zoya.finance/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({ query }),
      cache: "no-store",
    });

    const body = await response.json();
    return NextResponse.json(body, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "Impossible de contacter l'API Zoya." },
      { status: 502 },
    );
  }
}
