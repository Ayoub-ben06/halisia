import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchYahooPrices } from "@/lib/yahoo-prices";
import { getLivePrices } from "@/lib/live-prices";
import { DashboardToast } from "@/components/dashboard/dashboard-toast";

const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 4,
});

const percentFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function CategorySummary({ invested, current }: { invested: number; current: number }) {
  const gain = current - invested;
  const gainPercent = invested === 0 ? 0 : (gain / invested) * 100;
  const color = gain >= 0 ? "text-green-600" : "text-red-600";

  return (
    <div className="mb-4 grid gap-3 text-sm sm:grid-cols-3">
      <p>
        <span className="text-muted-foreground">Investi :</span>{" "}
        <span className="font-medium">{currencyFormatter.format(invested)}</span>
      </p>
      <p>
        <span className="text-muted-foreground">Valeur actuelle :</span>{" "}
        <span className="font-medium">{currencyFormatter.format(current)}</span>
      </p>
      <p className={color}>
        <span>Gain/perte :</span>{" "}
        <span className="font-medium">
          {gain >= 0 ? "+" : ""}{currencyFormatter.format(gain)} ({gainPercent >= 0 ? "+" : ""}
          {percentFormatter.format(gainPercent)} %)
        </span>
      </p>
    </div>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams?: { error?: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [assetsResult, cryptoResult, goldResult, livePrices] = await Promise.all([
    supabase.from("assets").select("*").eq("user_id", user.id),
    supabase.from("crypto_assets").select("*").eq("user_id", user.id),
    supabase.from("gold_assets").select("*").eq("user_id", user.id),
    getLivePrices(),
  ]);

  const loadError = assetsResult.error ?? cryptoResult.error ?? goldResult.error;
  if (loadError) {
    throw new Error(`Impossible de charger le portefeuille : ${loadError.message}`);
  }

  const portfolioAssets = assetsResult.data ?? [];
  const cryptoAssets = cryptoResult.data ?? [];
  const goldAssets = goldResult.data ?? [];
  const yahooPrices = await fetchYahooPrices(
    portfolioAssets
      .filter((asset) => asset.isin)
      .map((asset) => ({
        isin: asset.isin!,
        ticker: asset.ticker,
        name: asset.name,
        currency: asset.currency,
      })),
  );
  const updatedAt = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Europe/Paris",
  }).format(new Date());
  const fortuneoPortfolioValue = portfolioAssets.reduce(
    (total, asset) => {
      const fortuneoPrice = Number(asset.current_price ?? 0);
      const yahooPrice = asset.isin ? yahooPrices[asset.isin] : null;
      return total + Number(asset.quantity) * (yahooPrice ?? fortuneoPrice);
    },
    0,
  );
  const cryptoPortfolioValue = cryptoAssets.reduce(
    (total, asset) =>
      total +
      Number(asset.quantity) *
        (asset.ticker === "BTC" && livePrices.btc_eur !== null
          ? livePrices.btc_eur
          : Number(asset.current_price)),
    0,
  );
  const goldPortfolioValue = goldAssets.reduce(
    (total, asset) =>
      total +
      Number(asset.quantity_grams) *
        (livePrices.gold_eur_per_gram ?? Number(asset.current_price_per_gram)),
    0,
  );
  const totalPortfolioValue =
    fortuneoPortfolioValue + cryptoPortfolioValue + goldPortfolioValue;
  const fortuneoInvested = portfolioAssets.reduce(
    (total, asset) =>
      total + Number(asset.quantity) * Number(asset.average_buy_price),
    0,
  );
  const cryptoInvested = cryptoAssets.reduce(
    (total, asset) => total + Number(asset.total_invested),
    0,
  );
  const goldInvested = goldAssets.reduce(
    (total, asset) => total + Number(asset.total_invested),
    0,
  );
  const totalInvested = fortuneoInvested + cryptoInvested + goldInvested;
  const totalGain = totalPortfolioValue - totalInvested;
  const totalGainPercent = totalInvested === 0 ? 0 : (totalGain / totalInvested) * 100;
  const totalGainColor = totalGain >= 0 ? "text-green-600" : "text-red-600";

  return (
    <div>
      <DashboardToast message={searchParams?.error === "asset-not-found" ? "Actif non trouvé" : undefined} />
      <h1 className="text-3xl font-semibold">Dashboard</h1>

      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        <div>
          <p className="text-sm text-muted-foreground">Argent investi</p>
          <p className="mt-1 text-3xl font-semibold">
            {currencyFormatter.format(totalInvested)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Valeur actuelle</p>
          <p className="mt-1 text-3xl font-semibold">
            {currencyFormatter.format(totalPortfolioValue)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Évolution globale</p>
          <p className={`mt-1 text-3xl font-semibold ${totalGainColor}`}>
            {totalGain >= 0 ? "+" : ""}{currencyFormatter.format(totalGain)}
          </p>
          <p className={`mt-1 text-sm font-medium ${totalGainColor}`}>
            {totalGainPercent >= 0 ? "+" : ""}{percentFormatter.format(totalGainPercent)} %
          </p>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto">
        <h2 className="mb-3 text-xl font-semibold">Fortuneo</h2>
        <CategorySummary invested={fortuneoInvested} current={fortuneoPortfolioValue} />
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="px-3 py-3 font-medium">Nom</th>
              <th className="px-3 py-3 font-medium">ISIN</th>
              <th className="px-3 py-3 font-medium">Type</th>
              <th className="px-3 py-3 font-medium">Compte</th>
              <th className="px-3 py-3 text-right font-medium">Quantité</th>
              <th className="px-3 py-3 text-right font-medium">PRU</th>
              <th className="px-3 py-3 text-right font-medium">Prix Fortuneo</th>
              <th className="px-3 py-3 text-right font-medium">Prix Yahoo</th>
              <th className="px-3 py-3 text-right font-medium">Écart</th>
              <th className="px-3 py-3 text-right font-medium">Valeur totale</th>
              <th className="px-3 py-3 text-right font-medium">+/- €</th>
              <th className="px-3 py-3 text-right font-medium">+/- %</th>
            </tr>
          </thead>
          <tbody>
            {portfolioAssets.map((asset) => {
              const quantity = Number(asset.quantity);
              const averageBuyPrice = Number(asset.average_buy_price);
              const fortuneoPrice = Number(asset.current_price ?? 0);
              const yahooPrice = asset.isin ? yahooPrices[asset.isin] : null;
              const priceForCalculations = yahooPrice ?? fortuneoPrice;
              const priceDifference = yahooPrice === null ? null : yahooPrice - fortuneoPrice;
              const totalValue = quantity * priceForCalculations;
              const gain = totalValue - quantity * averageBuyPrice;
              const gainPercent =
                averageBuyPrice === 0
                  ? 0
                  : ((priceForCalculations - averageBuyPrice) / averageBuyPrice) * 100;
              const gainColor = gain >= 0 ? "text-green-600" : "text-red-600";
              const differenceColor =
                priceDifference !== null && priceDifference >= 0
                  ? "text-green-600"
                  : "text-red-600";
              const priceBadge =
                yahooPrice === null ? null : yahooPrice >= fortuneoPrice ? "🟢" : "🔴";

              return (
                <tr key={asset.id} className="border-b last:border-0">
                  <td className="max-w-xs px-3 py-3 font-medium">{asset.name}</td>
                  <td className="whitespace-nowrap px-3 py-3">{asset.isin ?? "—"}</td>
                  <td className="px-3 py-3 uppercase">{asset.type}</td>
                  <td className="px-3 py-3">{asset.account_type ?? "—"}</td>
                  <td className="px-3 py-3 text-right">{numberFormatter.format(quantity)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    {currencyFormatter.format(averageBuyPrice)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    {currencyFormatter.format(fortuneoPrice)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    {yahooPrice === null ? (
                      <span className="text-muted-foreground">Prix non disponible</span>
                    ) : (
                      <span>
                        {currencyFormatter.format(yahooPrice)} <span aria-label="Tendance">{priceBadge}</span>
                      </span>
                    )}
                  </td>
                  <td className={`whitespace-nowrap px-3 py-3 text-right ${priceDifference === null ? "text-muted-foreground" : differenceColor}`}>
                    {priceDifference === null ? "—" : currencyFormatter.format(priceDifference)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    {currencyFormatter.format(totalValue)}
                  </td>
                  <td className={`whitespace-nowrap px-3 py-3 text-right ${gainColor}`}>
                    {currencyFormatter.format(gain)}
                  </td>
                  <td className={`whitespace-nowrap px-3 py-3 text-right ${gainColor}`}>
                    {percentFormatter.format(gainPercent)} %
                  </td>
                </tr>
              );
            })}

            {portfolioAssets.length === 0 && (
              <tr>
                <td colSpan={12} className="px-3 py-8 text-center text-muted-foreground">
                  Aucun actif dans le portefeuille.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-10 overflow-x-auto">
        <h2 className="mb-3 text-xl font-semibold">Crypto — Bitpanda</h2>
        <CategorySummary invested={cryptoInvested} current={cryptoPortfolioValue} />
        <table className="w-full min-w-[800px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="px-3 py-3 font-medium">Nom</th>
              <th className="px-3 py-3 text-right font-medium">Quantité</th>
              <th className="px-3 py-3 text-right font-medium">Prix moyen achat</th>
              <th className="px-3 py-3 text-right font-medium">Prix actuel</th>
              <th className="px-3 py-3 text-right font-medium">Valeur</th>
              <th className="px-3 py-3 text-right font-medium">+/- €</th>
              <th className="px-3 py-3 text-right font-medium">+/- %</th>
              <th className="px-3 py-3 font-medium">Statut halal</th>
            </tr>
          </thead>
          <tbody>
            {cryptoAssets.map((asset) => {
              const quantity = Number(asset.quantity);
              const currentPrice =
                asset.ticker === "BTC" ? livePrices.btc_eur : null;
              const currentValue =
                currentPrice === null ? null : quantity * currentPrice;
              const invested = Number(asset.total_invested);
              const gain = currentValue === null ? null : currentValue - invested;
              const gainPercent = gain === null || invested === 0 ? null : (gain / invested) * 100;
              const gainColor = gain !== null && gain >= 0 ? "text-green-600" : "text-red-600";
              return (
                <tr key={asset.id} className="border-b last:border-0">
                  <td className="px-3 py-3 font-medium">{asset.name}</td>
                  <td className="px-3 py-3 text-right">
                    {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 8 }).format(quantity)} BTC
                  </td>
                  <td className="px-3 py-3 text-right">
                    {currencyFormatter.format(Number(asset.average_buy_price))}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {currentPrice === null ? "Prix non disponible" : currencyFormatter.format(currentPrice)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {currentValue === null ? "—" : currencyFormatter.format(currentValue)}
                  </td>
                  <td className={`px-3 py-3 text-right ${gain === null ? "text-muted-foreground" : gainColor}`}>
                    {gain === null ? "—" : currencyFormatter.format(gain)}
                  </td>
                  <td className={`px-3 py-3 text-right ${gainPercent === null ? "text-muted-foreground" : gainColor}`}>
                    {gainPercent === null ? "—" : `${percentFormatter.format(gainPercent)} %`}
                  </td>
                  <td className="px-3 py-3">⚠️ Débat scholars</td>
                </tr>
              );
            })}
            {cryptoAssets.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                  Aucun actif crypto.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted-foreground">
          Mis à jour à {new Date(livePrices.timestamp).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris" })}
          {livePrices.errors.bitcoin ? ` — Bitcoin indisponible : ${livePrices.errors.bitcoin}` : ""}
        </p>
      </div>

      <div className="mt-10 overflow-x-auto">
        <h2 className="mb-3 text-xl font-semibold">Or — Bitpanda</h2>
        <CategorySummary invested={goldInvested} current={goldPortfolioValue} />
        <table className="w-full min-w-[800px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="px-3 py-3 font-medium">Nom</th>
              <th className="px-3 py-3 text-right font-medium">Quantité (g)</th>
              <th className="px-3 py-3 text-right font-medium">Prix moyen/g</th>
              <th className="px-3 py-3 text-right font-medium">Prix actuel/g</th>
              <th className="px-3 py-3 text-right font-medium">Valeur</th>
              <th className="px-3 py-3 text-right font-medium">+/- €</th>
              <th className="px-3 py-3 text-right font-medium">+/- %</th>
              <th className="px-3 py-3 font-medium">Statut halal</th>
            </tr>
          </thead>
          <tbody>
            {goldAssets.map((asset) => {
              const quantity = Number(asset.quantity_grams);
              const currentPrice = livePrices.gold_eur_per_gram;
              const currentValue = currentPrice === null ? null : quantity * currentPrice;
              const invested = Number(asset.total_invested);
              const gain = currentValue === null ? null : currentValue - invested;
              const gainPercent = gain === null || invested === 0 ? null : (gain / invested) * 100;
              const gainColor = gain !== null && gain >= 0 ? "text-green-600" : "text-red-600";
              return (
                <tr key={asset.id} className="border-b last:border-0">
                  <td className="px-3 py-3 font-medium">{asset.name}</td>
                  <td className="px-3 py-3 text-right">{numberFormatter.format(quantity)} g</td>
                  <td className="px-3 py-3 text-right">
                    {currencyFormatter.format(Number(asset.average_buy_price_per_gram))}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {currentPrice === null ? "Prix non disponible" : currencyFormatter.format(currentPrice)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {currentValue === null ? "—" : currencyFormatter.format(currentValue)}
                  </td>
                  <td className={`px-3 py-3 text-right ${gain === null ? "text-muted-foreground" : gainColor}`}>
                    {gain === null ? "—" : currencyFormatter.format(gain)}
                  </td>
                  <td className={`px-3 py-3 text-right ${gainPercent === null ? "text-muted-foreground" : gainColor}`}>
                    {gainPercent === null ? "—" : `${percentFormatter.format(gainPercent)} %`}
                  </td>
                  <td className="px-3 py-3">✅ Conforme</td>
                </tr>
              );
            })}
            {goldAssets.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                  Aucun actif or.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted-foreground">
          Mis à jour à {new Date(livePrices.timestamp).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris" })}
          {livePrices.errors.gold ? ` — Or indisponible : ${livePrices.errors.gold}` : ""}
        </p>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Dernière mise à jour : {updatedAt}</p>
    </div>
  );
}
