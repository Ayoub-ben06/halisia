import { NextResponse } from "next/server";
import { tooManyRequests } from "@/lib/rate-limit";

type OpenFigiInstrument = {
  ticker?: string;
  exchCode?: string;
  marketSector?: string;
};

type OpenFigiResult = {
  data?: OpenFigiInstrument[];
};

export async function POST(request: Request) {
  const limited = tooManyRequests(request, "resolve-isin", 30, 60_000);
  if (limited) return limited;
  const { isin } = (await request.json()) as { isin?: string };
  const normalizedIsin = isin?.trim().toUpperCase();

  if (!normalizedIsin || !/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(normalizedIsin)) {
    return NextResponse.json({ error: "Format ISIN invalide." }, { status: 400 });
  }

  try {
    const response = await fetch("https://api.openfigi.com/v3/mapping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([
        { idType: "ID_ISIN", idValue: normalizedIsin },
      ]),
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Erreur OpenFIGI (${response.status}).` },
        { status: 502 },
      );
    }

    const results = (await response.json()) as OpenFigiResult[];
    const equities = results[0]?.data?.filter(
      ({ marketSector, ticker }) => marketSector === "Equity" && ticker,
    );
    const instrument =
      equities?.find(({ exchCode }) => exchCode === "FP") ??
      equities?.find(({ exchCode }) => exchCode === "US") ??
      equities?.[0];

    if (!instrument?.ticker) {
      return NextResponse.json({ error: "ISIN introuvable." }, { status: 404 });
    }

    const ticker =
      instrument.exchCode === "FP"
        ? `${instrument.ticker}.PAR`
        : instrument.ticker;

    return NextResponse.json({ ticker });
  } catch {
    return NextResponse.json(
      { error: "Impossible de contacter OpenFIGI." },
      { status: 502 },
    );
  }
}
