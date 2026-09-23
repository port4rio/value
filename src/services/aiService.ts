import {
  StockItem,
  StockAiDiagnosisResponse,
  StockAiDiagnosisData,
  StockChartData,
} from '../types';

/**
 * 銘柄の6ヶ月チャートデータを取得
 */
export async function fetchStockChart(
  symbol: string
): Promise<StockChartData | null> {
  if (!symbol) return null;
  try {
    const clean = symbol.replace(/\.T$/i, '');
    const res = await fetch(`/api/yfinance/chart/${clean}`);
    if (!res.ok) {
      console.warn(`Chart fetch failed: HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    if (data && data.success) {
      return data as StockChartData;
    }
    return null;
  } catch (err) {
    console.warn('Error fetching chart data:', err);
    return null;
  }
}

/**
 * 銘柄の毎週土曜 AI診断（gemini）を取得
 */
export async function fetchAiDiagnosis(
  stock: StockItem,
  forceRefresh = false
): Promise<StockAiDiagnosisResponse | null> {
  if (!stock || !stock.code) return null;

  // 1. 静的ホスティング（GitHub Pages等）向け: public/data/ai_diagnosis.json があれば利用
  if (!forceRefresh) {
    try {
      const staticRes = await fetch('./data/ai_diagnosis.json', { cache: 'no-cache' });
      if (staticRes.ok) {
        const map = await staticRes.json();
        if (map && map[stock.code]) {
          const item = map[stock.code];
          return {
            success: true,
            code: stock.code,
            name: stock.name,
            diagnosis: item.diagnosis,
            diagnosedDateLabel: item.diagnosisDate || '直近土曜日',
            nextDiagnosisLabel: '次回: 来週土曜日',
            diagnosedAt: item.diagnosisDate || new Date().toISOString(),
            model: 'gemini-3.8-flash',
            fromCache: true,
          };
        }
      }
    } catch {
      // ignore
    }
  }

  try {
    const res = await fetch('/api/ai/diagnosis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: stock.code,
        name: stock.name,
        price: stock.close,
        per: stock.per,
        pbr: stock.pbr,
        dividendYield: stock.dividend_yield,
        roe: stock.roe,
        equityRatio: stock.equity_ratio,
        category: stock.category,
        forceRefresh,
      }),
    });

    if (!res.ok) {
      console.warn(`AI diagnosis fetch failed: HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (data && data.success) {
      return data as StockAiDiagnosisResponse;
    }
    return null;
  } catch (err) {
    console.warn('Error calling AI diagnosis API:', err);
    return null;
  }
}

/**
 * カード内容をURLエンコードして「ChatGPTに相談」するためのリンクURLを生成
 * （AI診断サマリーは省き、財務データと投資判断相談に特化したシンプルな依頼文に調整）
 */
export function createChatGptConsultUrl(stock: StockItem): string {
  const categoryLabel =
    stock.category === 'inokori'
      ? `居残り組（在籍${stock.stayDays ?? 90}日）`
      : stock.category === 'tennyu'
      ? `転入生`
      : `卒業生`;

  let prompt = `【日本株バリュー投資相談】\n`;
  prompt += `以下の銘柄について、中長期のバリュー投資としての魅力度やエントリー判断（買い時の目安・リスク）を相談させてください。\n\n`;
  prompt += `■ 銘柄情報\n`;
  prompt += `・銘柄名: ${stock.name}（コード: ${stock.code}）\n`;
  prompt += `・分類: ${categoryLabel}\n`;
  prompt += `・株価: ${stock.close != null ? `${stock.close.toLocaleString()}円` : '-'}\n`;
  prompt += `・予想配当利回り: ${stock.dividend_yield != null ? `${stock.dividend_yield}%` : '-'}\n`;
  prompt += `・予想PER: ${stock.per != null ? `${stock.per}倍` : '-'}\n`;
  prompt += `・PBR: ${stock.pbr != null ? `${stock.pbr}倍` : '-'}\n`;
  prompt += `・ROE: ${stock.roe != null ? `${stock.roe}%` : '-'}\n`;
  prompt += `・自己資本比率: ${stock.equity_ratio != null ? `${stock.equity_ratio}%` : '-'}\n`;
  prompt += `・EBITDA成長率: ${stock.ebitda_growth != null ? `${stock.ebitda_growth}%` : '-'}\n\n`;
  prompt += `上記の財務数値を踏まえ、投資妙味と注意すべき点について客観的なアドバイスをお願いします。`;

  return `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
}
