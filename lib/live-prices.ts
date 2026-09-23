import "server-only";

const TROY_OUNCE_IN_GRAMS = 31.1035;

export type LivePrices = {
  btc_eur: number | null;
  btc_change_percent: number | null;
  gold_eur_per_gram: number | null;
  timestamp: string;
  errors: {
    bitcoin?: string;
    gold?: string;
  };
  sources: {
    bitcoin: string | null;
    gold: string | null;
  };
};

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { next: { revalidate: 300 } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function fetchUsdPerEur(): Promise<number> {
  const response = await fetch(
    "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml",
    { next: { revalidate: 300 } },
  );
  if (!response.ok) throw new Error(`BCE HTTP ${response.status}`);

  const xml = await response.text();
  const rate = Number(xml.match(/currency=['\"]USD['\"]\s+rate=['\"]([0-9.]+)['\"]/)?.[1]);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("Taux USD/EUR BCE invalide");
  return rate;
}

function goldUsdPerOunce(payload: unknown): number | null {
  if (Array.isArray(payload)) {
    const entry = payload.find(
      (item) => Array.isArray(item) && String(item[0]).toLowerCase() === "gold",
    );
    const price = Array.isArray(entry) ? Number(entry[1]) : NaN;
    return Number.isFinite(price) ? price : null;
  }

  if (payload && typeof payload === "object" && "price" in payload) {
    const price = Number((payload as { price: unknown }).price);
    return Number.isFinite(price) ? price : null;
  }

  return null;
}

export async function getLivePrices(): Promise<LivePrices> {
  const result: LivePrices = {
    btc_eur: null,
    btc_change_percent: null,
    gold_eur_per_gram: null,
    timestamp: new Date().toISOString(),
    errors: {},
    sources: { bitcoin: null, gold: null },
  };

  const [bitcoinResult, goldResult, exchangeRateResult] = await Promise.allSettled([
    fetchJson("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur&precision=full&include_24hr_change=true"),
    fetchJson("https://metals.live/api/spot/gold"),
    fetchUsdPerEur(),
  ]);

  if (bitcoinResult.status === "fulfilled") {
    const price = Number(
      (bitcoinResult.value as { bitcoin?: { eur?: unknown } })?.bitcoin?.eur,
    );
    if (Number.isFinite(price)) {
      result.btc_eur = price;
      const change = Number((bitcoinResult.value as { bitcoin?: { eur_24h_change?: unknown } })?.bitcoin?.eur_24h_change);
      result.btc_change_percent = Number.isFinite(change) ? change : null;
      result.sources.bitcoin = "CoinGecko";
    } else {
      result.errors.bitcoin = "Réponse CoinGecko invalide";
    }
  } else {
    result.errors.bitcoin = bitcoinResult.reason instanceof Error
      ? bitcoinResult.reason.message
      : "CoinGecko indisponible";
  }

  let goldUsd = goldResult.status === "fulfilled" ? goldUsdPerOunce(goldResult.value) : null;
  if (goldUsd !== null) {
    result.sources.gold = "metals.live";
  } else {
    // metals.live currently returns 404; retain it as the primary source and use
    // another free, keyless spot endpoint so the dashboard still has a gold price.
    try {
      const fallback = await fetchJson("https://api.gold-api.com/price/XAU");
      goldUsd = goldUsdPerOunce(fallback);
      if (goldUsd === null) throw new Error("Réponse de secours invalide");
      result.sources.gold = "gold-api.com";
    } catch (error) {
      result.errors.gold = error instanceof Error ? error.message : "Prix de l'or indisponible";
    }
  }

  if (goldUsd !== null && exchangeRateResult.status === "fulfilled") {
    // The ECB publishes USD per EUR, so divide USD by this rate to obtain EUR.
    result.gold_eur_per_gram =
      goldUsd / exchangeRateResult.value / TROY_OUNCE_IN_GRAMS;
  } else if (goldUsd !== null) {
    result.errors.gold = exchangeRateResult.status === "rejected" &&
      exchangeRateResult.reason instanceof Error
      ? exchangeRateResult.reason.message
      : "Taux de change BCE indisponible";
  }

  return result;
}
