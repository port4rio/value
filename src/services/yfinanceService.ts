export interface YFinanceQuote {
  symbol: string;
  name?: string;
  forwardPE: number | null;
  trailingPE: number | null;
  per: number | null;
  dividendYield: number | null;
  price: number | null;
  changePercent: number | null;
  marketCap: number | null;
  updatedAt: string;
}

/**
 * サーバーの /api/yfinance/quotes エンドポイントを呼び出し、複数銘柄の最新 yfinance データを取得
 */
export async function fetchYFinanceQuotes(
  symbols: string[]
): Promise<Record<string, YFinanceQuote>> {
  if (!symbols || symbols.length === 0) {
    return {};
  }

  try {
    const response = await fetch('/api/yfinance/quotes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ symbols }),
    });

    if (!response.ok) {
      console.warn(`yfinance API returned status ${response.status}`);
      return {};
    }

    const data = await response.json();
    return data.quotes || {};
  } catch (err) {
    console.warn('Failed to call yfinance API from client:', err);
    return {};
  }
}
