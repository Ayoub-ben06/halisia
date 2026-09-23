// Musaffa comparison on the 50-ticker reference set used to track the match rate.
const DIAGNOSTIC_TICKERS = ["AAPL", "AMZN", "NVDA", "GOOGL", "META", "AVGO", "GOOG", "TSLA", "LLY", "V", "WMT", "MA", "XOM", "JNJ", "HD", "PG", "CVX", "CRM", "KO", "MRK", "AMD", "PEP", "ADBE", "TMO", "CSCO", "ABT", "LIN", "DHR", "INTC", "QCOM", "TXN", "NOW", "UNP", "LOW", "SPGI", "UPS", "SYK", "TJX", "MDT", "GILD", "VRTX", "ISRG", "ADI", "ETN", "LRCX", "BSX", "ZTS", "BDX", "SLB", "EOG"];

process.env.MUSAFFA_TICKERS ??= DIAGNOSTIC_TICKERS.join(",");
process.env.SCREENING_OUTPUT_FILE ??= "screening-comparison-improvements.json";

// Loaded after the environment is set because the comparison reads it at import time.
void import("./compare-100-screening");
