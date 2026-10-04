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
  const baseUrl = (import.meta as any).env?.BASE_URL || '/';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const candidatePaths = [
    `${cleanBase}data/charts.json`,
    './data/charts.json',
    'data/charts.json',
    '/value/data/charts.json',
    '/data/charts.json',
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
 * 静的JSON (public/data/ai_diagnosis.json) から診断データを取得
 */
async function loadStaticDiagnosis(code: string, bustCache = false): Promise<StockAiDiagnosisResponse | null> {
  const baseUrl = (import.meta as any).env?.BASE_URL || '/';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const t = bustCache ? `?_t=${Date.now()}` : '';
  const candidatePaths = [
    `${cleanBase}data/ai_diagnosis.json${t}`,
    `./data/ai_diagnosis.json${t}`,
    `data/ai_diagnosis.json${t}`,
    `/data/ai_diagnosis.json${t}`,
  ];

  for (const path of candidatePaths) {
    try {
      const staticRes = await fetch(path, { cache: 'no-cache' });
      if (staticRes.ok) {
        const map = await staticRes.json();
        if (map && map[code]) {
          const item = map[code];
          const rawDiag = item.diagnosis || {};
          const normalizedDiagnosis: StockAiDiagnosisData = {
            business_summary:
              rawDiag.business_summary || rawDiag.businessSummary || '事業特色分析中',
            undervalued_reason:
              rawDiag.undervalued_reason || rawDiag.valuation_appeal || rawDiag.investmentAttractiveness || '放置要因分析中',
            contrarian_appeal:
              rawDiag.contrarian_appeal || rawDiag.dividend_sustainability || rawDiag.dividendSustainability || '逆張り魅力分析中',
            revaluation_scenario:
              rawDiag.revaluation_scenario || rawDiag.catalyst || '再評価シナリオ分析中',
            max_risk:
              rawDiag.max_risk || rawDiag.risks || rawDiag.risk || '最大リスク分析中',
            // 従来キー互換保持
            valuation_appeal:
              rawDiag.undervalued_reason || rawDiag.valuation_appeal || '',
            dividend_sustainability:
              rawDiag.contrarian_appeal || rawDiag.dividend_sustainability || '',
            catalyst:
              rawDiag.revaluation_scenario || rawDiag.catalyst || '',
            risks:
              rawDiag.max_risk || rawDiag.risks || '',
          };

          return {
            success: true,
            code,
            name: item.name || code,
            diagnosis: normalizedDiagnosis,
            diagnosedDateLabel: item.diagnosisDate || '直近土曜日',
            nextDiagnosisLabel: '次回: 来週土曜日',
            diagnosedAt: item.diagnosisDate || new Date().toISOString(),
            model: 'gemini 3.5 Flash-Lite',
            fromCache: true,
          };
        }
      }
    } catch {
      // try next
    }
  }
  return null;
}

/**
 * 銘柄の毎週土曜 AI診断（gemini 3.5 Flash-Lite）を取得
 */
export async function fetchAiDiagnosis(
  stock: StockItem,
  forceRefresh = false
): Promise<StockAiDiagnosisResponse | null> {
  if (!stock || !stock.code) return null;

  // 1. 通常読み込み時は静的キャッシュを最優先
  if (!forceRefresh) {
    const staticData = await loadStaticDiagnosis(stock.code, false);
    if (staticData) return staticData;
  }

  // 2. サーバーサイドAPI（Node.js動態サーバー環境・GEMINI_API_KEYがある場合）
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch('/api/ai/diagnosis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        code: stock.code,
        name: stock.name,
        per: stock.per,
        pbr: stock.pbr,
        dividendYield: stock.dividend_yield,
        payoutRatio: stock.payout_ratio,
        roe: stock.roe,
        equityRatio: stock.equity_ratio,
        ebitdaGrowth: stock.ebitda_growth,
        deRatio: stock.de_ratio,
        currentRatio: stock.current_ratio,
        forceRefresh,
      }),
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        return {
          ...data,
          model: 'gemini 3.5 Flash-Lite',
        } as StockAiDiagnosisResponse;
      }
    }
  } catch {
    // サーバーサイドAPIが存在しない（GitHub Pages等の静的ホスティング環境）
  }

  // 3. サーバーAPIがない場合でも、既存の最新静的JSONを再取得して返却（未生成エラー化を防ぐ）
  return await loadStaticDiagnosis(stock.code, true);
}

/**
 * ChatGPTでこの銘柄について相談するためのプロンプト付きURLを生成
 */
export function createChatGptConsultUrl(stock: StockItem): string {
  const prompt = `あなたは辛口で深い洞察力を持つプロの株式アナリストです。
バリュー株スクリーニングした銘柄の定性情報が欲しい。数値を単純に説明しないこと。

【対象銘柄】
・銘柄コード: ${stock.code}
・企業名: ${stock.name}
・実績PER: ${stock.per != null ? `${stock.per}倍` : '不明'}
・実績PBR: ${stock.pbr != null ? `${stock.pbr}倍` : '不明'}
・予想配当利回り: ${stock.dividend_yield != null ? `${stock.dividend_yield}%` : '不明'}
・配当性向: ${stock.payout_ratio != null ? `${stock.payout_ratio}%` : '不明'}
・ROE: ${stock.roe != null ? `${stock.roe}%` : '不明'}
・自己資本比率: ${stock.equity_ratio != null ? `${stock.equity_ratio}%` : '不明'}
・EBITDA成長率: ${stock.ebitda_growth != null ? `${stock.ebitda_growth}%` : '不明'}
・D/Eレシオ: ${stock.de_ratio != null ? `${stock.de_ratio}倍` : '不明'}
・流動比率: ${stock.current_ratio != null ? `${stock.current_ratio}%` : '不明'}

【出力要件】
1. 何をやっている会社か（事業紹介や特色、何で稼いでるか端的な一行で）
2. なぜ今安く放置されているのか（市場の懸念、PBRが低い理由）
3. それでも魅力的な理由（逆張りポイント）
4. 再評価シナリオ（何が起きたら株価が見直されるか）
5. 最大リスク（1つに絞る）`;

  return `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
}
