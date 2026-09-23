import {
  StockItem,
  StockAiDiagnosisResponse,
  StockAiDiagnosisData,
  StockChartData,
  ChartPoint,
} from '../types';

/**
 * 銘柄の6ヶ月チャートデータを取得
 * 1. public/data/charts.json (GitHub Actionsで収集した静的データ) を最優先
 * 2. なければ CORS プロキシ経由で Yahoo Finance / Stooq から取得
 * 3. 開発環境なら /api/yfinance/chart/:code
 */
export async function fetchStockChart(
  symbol: string
): Promise<StockChartData | null> {
  if (!symbol) return null;
  const clean = symbol.replace(/\.T$/i, '');

  // 1. 静的 charts.json からの取得（GitHub Pages用・最優先・CORS不要）
  const baseUrl = (import.meta as any).env?.BASE_URL || './';
  const candidatePaths = [
    `${baseUrl}data/charts.json`.replace(/\/+/g, '/'),
    './data/charts.json',
    'data/charts.json',
  ];

  for (const path of candidatePaths) {
    try {
      const res = await fetch(path, { cache: 'no-cache' });
      if (res.ok) {
        const chartsMap = await res.json();
        if (chartsMap && chartsMap[clean]) {
          return chartsMap[clean] as StockChartData;
        }
      }
    } catch {
      // try next
    }
  }

  // 2. 開発環境（Node.jsプロキシが動いている場合）
  try {
    const res = await fetch(`/api/yfinance/chart/${clean}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        return data as StockChartData;
      }
    }
  } catch {
    // ignore
  }

  // 3. クライアント側フォールバック (Stooq / 公開CORSプロキシ)
  try {
    const stooqUrl = `https://stooq.com/q/d/l/?s=${clean}.jp&i=d`;
    // Stooqから直近6ヶ月の日足をCSVパース
    const res = await fetch(stooqUrl);
    if (res.ok) {
      const csv = await res.text();
      const lines = csv.trim().split('\n');
      if (lines.length > 5) {
        // ヘッダー: Date,Open,High,Low,Close,Volume
        const dataLines = lines.slice(1).reverse().slice(-130); // 直近約6ヶ月分
        const points: ChartPoint[] = [];

        for (const line of dataLines) {
          const parts = line.split(',');
          if (parts.length >= 5) {
            const date = parts[0].trim();
            const open = parseFloat(parts[1]);
            const high = parseFloat(parts[2]);
            const low = parseFloat(parts[3]);
            const close = parseFloat(parts[4]);
            const volume = parseInt(parts[5] || '0', 10);
            if (!isNaN(close)) {
              points.push({
                date,
                timestamp: new Date(date).getTime(),
                open: Math.round(open),
                high: Math.round(high),
                low: Math.round(low),
                close: Math.round(close),
                volume,
              });
            }
          }
        }

        if (points.length > 0) {
          const closes = points.map((p) => p.close);
          const highPrice = Math.max(...closes);
          const lowPrice = Math.min(...closes);
          const latestPrice = points[points.length - 1].close;
          const initialPrice = points[0].close;
          const periodChange = latestPrice - initialPrice;
          const periodChangePercent = Number(((periodChange / initialPrice) * 100).toFixed(2));

          return {
            symbol: `${clean}.T`,
            points,
            highPrice,
            lowPrice,
            latestPrice,
            periodChange,
            periodChangePercent,
            startDate: points[0].date,
            endDate: points[points.length - 1].date,
            fromCache: false,
          };
        }
      }
    }
  } catch (err) {
    console.warn('Fallback chart fetch failed:', err);
  }

  return null;
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
    const baseUrl = (import.meta as any).env?.BASE_URL || './';
    const candidatePaths = [
      `${baseUrl}data/ai_diagnosis.json`.replace(/\/+/g, '/'),
      './data/ai_diagnosis.json',
      'data/ai_diagnosis.json',
    ];

    for (const path of candidatePaths) {
      try {
        const staticRes = await fetch(path, { cache: 'no-cache' });
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
        // try next
      }
    }
  }

  // 2. サーバーサイドAPI（Node.js動態サーバー環境の場合）
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
      return null;
    }

    const data = await res.json();
    if (data && data.success) {
      return data as StockAiDiagnosisResponse;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * ChatGPTでこの銘柄について相談するためのプロンプト付きURLを生成
 */
export function createChatGptConsultUrl(stock: StockItem): string {
  const prompt = `日本株の投資分析をお願いします。

【銘柄情報】
・銘柄コード: ${stock.code}
・企業名: ${stock.name}
・現在株価: ${stock.close != null ? `${stock.close}円` : '不明'}
・予想PER: ${stock.per != null ? `${stock.per}倍` : '不明'}
・実績PBR: ${stock.pbr != null ? `${stock.pbr}倍` : '不明'}
・配当利回り: ${stock.dividend_yield != null ? `${stock.dividend_yield}%` : '不明'}
・ROE: ${stock.roe != null ? `${stock.roe}%` : '不明'}
・自己資本比率: ${stock.equity_ratio != null ? `${stock.equity_ratio}%` : '不明'}

【質問事項】
1. この企業の主力の収益源（ビジネスモデル）と競合優位性は何ですか？
2. PBR1倍割れ・低PERで推移している背景や理由は何が考えられますか？
3. 配当の維持・増配余力（財務健全性やキャッシュ創出力）はどう評価できますか？
4. 今後、株価が見直されるカタリスト（株主還元方針、東証要請対応など）と投資上の留意点・リスクを教えてください。`;

  return `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
}
