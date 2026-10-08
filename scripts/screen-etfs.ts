import "dotenv/config";
import { ETF_LIST } from "../lib/etf/etf-list";
import { screenETF } from "../lib/etf/etf-screener";
import { saveETFScreening } from "../lib/etf/etf-persistence";

async function main() {
  console.log(`Starting ETF screening for ${ETF_LIST.length} ETFs...`);
  for (let index = 0; index < ETF_LIST.length; index += 1) {
    const etf = ETF_LIST[index];
    console.log(`\n[${index + 1}/${ETF_LIST.length}] ${etf.ticker} — ${etf.name}`);
    try {
      const { result, holdings } = await screenETF(etf);
      await saveETFScreening(etf, result, holdings);
      console.log(`✅ ${result.verdict} — ${result.verdictReason}`);
      console.log(`   Conforme ${(result.compliantWeight * 100).toFixed(1)} % | Douteux ${(result.doubtfulWeight * 100).toFixed(1)} % | Non conforme ${(result.nonCompliantWeight * 100).toFixed(1)} %`);
    } catch (error) {
      console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

void main();
