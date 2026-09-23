import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yahooFinance from 'yahoo-finance2';
import { GoogleGenAI } from '@google/genai';
import { StockItem, DEFAULT_CRITERIA, StockChartData, ChartPoint } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../public/data');
const STOCKS_FILE = path.join(DATA_DIR, 'stocks.json');
const AI_FILE = path.join(DATA_DIR, 'ai_diagnosis.json');
const CHARTS_FILE = path.join(DATA_DIR, 'charts.json');

// TradingView Japan Scanner endpoint
const TV_SCANNER_URL = 'https://scanner.tradingview.com/japan/scan';

async function fetchTradingViewCandidates(): Promise<StockItem[]> {
  console.log('📡 Fetching candidate stocks from TradingView...');
  const payload = {
    filter: [
      { left: 'market_cap_basic', operation: 'nempty' },
      { left: 'type', operation: 'equal', right: 'stock' },
      { left: 'subtype', operation: 'in_range', right: ['common'] },
      // PBR 1.05以下、ROE 7.5%以上で一次絞り込み
      { left: 'price_book_fq', operation: 'less', right: 1.05 },
      { left: 'return_on_equity_fq', operation: 'egreater', right: 7.5 },
    ],
    options: { lang: 'ja' },
    symbols: { query: { types: [] }, tickers: [] },
    columns: [
      'name',                     // 0: コード（例: TSE:7226）
      'description',              // 1: 銘柄名
      'close',                    // 2: 終値
      'change',                   // 3: 前日比%
      'market_cap_basic',         // 4: 時価総額（円）
      'price_earnings_ttm',       // 5: PER
      'price_book_fq',            // 6: PBR
      'return_on_equity_fq',       // 7: ROE
      'dividends_yield',          // 8: 予想配当利回り%（会社発表予想ベース）
      'dividend_payout_ratio_fy', // 9: 配当性向%
      'ebitda_yoy_growth_fy',     // 10: EBITDA成長率%
      'current_ratio_fq',         // 11: 流動比率
      'debt_to_equity_fq',        // 12: D/Eレシオ
      'total_assets_fq',          // 13: 総資産
      'total_liabilities_fq',     // 14: 負債合計
    ],
    sort: { sortBy: 'dividends_yield', sortOrder: 'desc' },
    range: [0, 500],
  };

  try {
    const res = await fetch(TV_SCANNER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`TradingView response status: ${res.status}`);
    const data: any = await res.json();
    const rows = data.data || [];

    const candidates: StockItem[] = [];
    for (const r of rows) {
      const ticker = String(r.s || '');
      const code = ticker.replace(/^TSE:/, '');
      if (!/^\d{4}$/.test(code)) continue;

      const d = r.d || [];
      const rawName = String(d[1] || d[0] || code);
      const cleanName = rawName.replace(/^[A-Z0-9\s]+(?=[一-龥ぁ-んァ-ヶ])/, '').trim();
      const marketCapOku = d[4] ? Math.round(Number(d[4]) / 100000000) : null;

      // 自己資本比率の算出: ((総資産 - 負債合計) / 総資産) * 100
      const totalAssets = d[13] != null ? Number(d[13]) : null;
      const totalLiabilities = d[14] != null ? Number(d[14]) : 0;
      let equityRatio: number | null = null;
      if (totalAssets && totalAssets > 0) {
        equityRatio = Number((((totalAssets - totalLiabilities) / totalAssets) * 100).toFixed(2));
      }

      const pbr = d[6] != null ? Number(Number(d[6]).toFixed(2)) : null;
      const roe = d[7] != null ? Number(Number(d[7]).toFixed(2)) : null;
      const dy = d[8] != null ? Number(Number(d[8]).toFixed(2)) : null;
      const ebitdaGrowth = d[10] != null ? Number(Number(d[10]).toFixed(2)) : null;

      // 厳格足切り（自己資本比率 50%以上、PBR 1.0倍以下、ROE 8%以上、利回り3.8%以上）
      if (equityRatio == null || equityRatio < DEFAULT_CRITERIA.minEquityRatio) continue;
      if (pbr != null && pbr > DEFAULT_CRITERIA.maxPbr) continue;
      if (roe != null && roe < DEFAULT_CRITERIA.minRoe) continue;
      if (dy != null && dy < 3.8) continue; // 後段のYahoo Financeで4%以上判定

      candidates.push({
        code,
        name: cleanName || rawName,
        close: d[2] != null ? Number(d[2]) : null,
        change: d[3] != null ? Number(Number(d[3]).toFixed(2)) : null,
        market_cap: marketCapOku,
        per: d[5] != null ? Number(Number(d[5]).toFixed(2)) : null,
        pbr,
        roe,
        dividend_yield: dy,
        payout_ratio: d[9] != null ? Number(Number(d[9]).toFixed(2)) : null,
        ebitda_growth: ebitdaGrowth,
        current_ratio: d[11] != null ? Number((Number(d[11]) * 100).toFixed(2)) : null,
        de_ratio: d[12] != null ? Number(Number(d[12]).toFixed(2)) : null,
        equity_ratio: equityRatio,
        category: 'tennyu',
        stayDays: 1,
        entryDate: new Date().toISOString().split('T')[0],
      });
    }

    console.log(`✅ Filtered ${candidates.length} strong candidates from TradingView (equity ratio >= 50%).`);
    return candidates;
  } catch (err) {
    console.warn('⚠️ TradingView fetch failed:', err);
    return [];
  }
}

/**
 * 最新株価、会社予想PER、会社予想配当利回りを東証市場データおよびYahoo Financeから取得・更新
 */
async function enrichWithMarketForecasts(stocks: StockItem[]): Promise<StockItem[]> {
  console.log(`📊 Updating ${stocks.length} stocks with live quotes, forward PER, and forward dividend yield...`);
  const enriched: StockItem[] = [];

  for (const s of stocks) {
    try {
      // 1. Yahoo Finance から最新株価と変動率を取得
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${s.code}.T?range=1d&interval=1d`;
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      if (res.ok) {
        const json: any = await res.json();
        const meta = json?.chart?.result?.[0]?.meta;
        if (meta) {
          if (meta.regularMarketPrice != null) s.close = meta.regularMarketPrice;
          if (meta.chartPreviousClose != null && meta.regularMarketPrice != null) {
            const diff = meta.regularMarketPrice - meta.chartPreviousClose;
            s.change = Number(((diff / meta.chartPreviousClose) * 100).toFixed(2));
          }
        }
      }
    } catch {
      // ignore
    }

    try {
      // 2. Kabutan から会社発表の今期予想PER、最新PBR、今期予想配当利回りを正確に取得
      const kRes = await fetch(`https://kabutan.jp/stock/?code=${s.code}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      if (kRes.ok) {
        const html = await kRes.text();
        const idx = html.indexOf('help-label" data-help="PER">PER');
        if (idx !== -1) {
          const slice = html.substring(idx, idx + 450);
          const matches = [...slice.matchAll(/<td[^>]*>\s*([\d\.\-]+)\s*<span/g)].map((m) => m[1]);
          const forwardPer = matches[0] && !isNaN(Number(matches[0])) ? Number(matches[0]) : null;
          const pbr = matches[1] && !isNaN(Number(matches[1])) ? Number(matches[1]) : null;
          const forwardYield = matches[2] && !isNaN(Number(matches[2])) ? Number(matches[2]) : null;

          if (forwardPer != null && forwardPer > 0) s.per = forwardPer;
          if (pbr != null && pbr > 0) s.pbr = pbr;
          if (forwardYield != null && forwardYield > 0) s.dividend_yield = forwardYield;
        }
      }
    } catch {
      // 取得失敗時はTradingViewの値をそのまま保持
    }

    enriched.push(s);
    await new Promise((r) => setTimeout(r, 60));
  }

  return enriched;
}

/**
 * 6ヶ月の日足チャートデータを収集して charts.json に保存
 */
async function fetchAndSaveCharts(stocks: StockItem[]) {
  console.log(`📈 Fetching 6-month chart historical data for ${stocks.length} stocks via Yahoo Finance API...`);
  const chartsMap: Record<string, StockChartData> = {};

  // 既存キャッシュがあれば読み込み
  if (fs.existsSync(CHARTS_FILE)) {
    try {
      const existing = JSON.parse(fs.readFileSync(CHARTS_FILE, 'utf-8'));
      Object.assign(chartsMap, existing);
    } catch {
      // ignore
    }
  }

  for (const s of stocks) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${s.code}.T?range=6mo&interval=1d`;
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (res.ok) {
        const json: any = await res.json();
        const result = json?.chart?.result?.[0];
        const timestamps: number[] = result?.timestamp || [];
        const quote = result?.indicators?.quote?.[0];
        const closes: (number | null)[] = quote?.close || [];
        const opens: (number | null)[] = quote?.open || [];
        const highs: (number | null)[] = quote?.high || [];
        const lows: (number | null)[] = quote?.low || [];
        const volumes: (number | null)[] = quote?.volume || [];

        const points: ChartPoint[] = [];
        for (let i = 0; i < timestamps.length; i++) {
          const c = closes[i];
          if (c == null) continue;
          const t = timestamps[i] * 1000;
          const d = new Date(t);
          points.push({
            date: d.toISOString().split('T')[0],
            timestamp: t,
            open: Math.round(opens[i] ?? c),
            high: Math.round(highs[i] ?? c),
            low: Math.round(lows[i] ?? c),
            close: Math.round(c),
            volume: Math.round(volumes[i] ?? 0),
          });
        }

        if (points.length > 5) {
          const validCloses = points.map((p) => p.close);
          const highPrice = Math.max(...validCloses);
          const lowPrice = Math.min(...validCloses);
          const latestPrice = points[points.length - 1].close;
          const initialPrice = points[0].close;
          const periodChange = latestPrice - initialPrice;
          const periodChangePercent = Number(((periodChange / initialPrice) * 100).toFixed(2));

          chartsMap[s.code] = {
            symbol: `${s.code}.T`,
            name: s.name,
            currency: 'JPY',
            points,
            highPrice,
            lowPrice,
            latestPrice,
            periodChange,
            periodChangePercent,
            startDate: points[0].date,
            endDate: points[points.length - 1].date,
            fromCache: true,
          };
        }
      }
    } catch {
      // ignore
    }
    // API負荷軽減
    await new Promise((r) => setTimeout(r, 100));
  }

  fs.writeFileSync(CHARTS_FILE, JSON.stringify(chartsMap, null, 2), 'utf-8');
  console.log(`✅ Successfully saved ${Object.keys(chartsMap).length} charts to ${CHARTS_FILE}`);
}

async function generateAiDiagnosis(stocks: StockItem[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('ℹ️ GEMINI_API_KEY is not set. Skipping AI diagnosis.');
    return;
  }

  console.log(`🤖 Running AI Diagnosis for ${stocks.length} stocks via Gemini...`);
  const ai: any = new GoogleGenAI();
  const diagnosisMap: Record<string, any> = {};

  if (fs.existsSync(AI_FILE)) {
    try {
      const existing = JSON.parse(fs.readFileSync(AI_FILE, 'utf-8'));
      Object.assign(diagnosisMap, existing);
    } catch {
      // ignore
    }
  }

  for (const s of stocks) {
    console.log(`Analyzing [${s.code}] ${s.name}...`);
    const prompt = `あなたは日本株のバリュー株投資に精通したシニア・クオンツアナリストです。
以下の銘柄のファンダメンタルズ数値および企業の実際の事業内容を詳細に分析し、投資家向けの「週次AIバリュースコープ診断」を作成してください。

【対象銘柄】
証券コード: ${s.code}
銘柄名: ${s.name}
直近株価: ${s.close}円
PER: ${s.per}倍
PBR: ${s.pbr}倍
配当利回り: ${s.dividend_yield}%
ROE: ${s.roe}%
自己資本比率: ${s.equity_ratio}%
スクリーニング区分: ${s.category}

【出力指示】
以下の5つの項目について、客観的かつプロの視点で日本語で簡潔・明快に分析してください。
各項目は2〜3文（80〜120文字程度）で具体的に記述してください。

1. businessSummary: 【企業の特色・稼ぎ頭】（主力事業・強みなど）
2. investmentAttractiveness: 【投資妙味・バリュー度】（割安放置の背景、還元の旨みなど）
3. dividendSustainability: 【配当の持続性・還元姿勢】（配当利回り、減配リスクの低さなど）
4. catalyst: 【見直し・再評価の契機（カタリスト）】（PBR1倍是正、自社株買いなど）
5. risk: 【留意点・ダウンサイドリスク】（業績変動要因、注意すべき点）

必ず以下のJSON形式のみを出力してください。マークダウン不要。
{
  "businessSummary": "...",
  "investmentAttractiveness": "...",
  "dividendSustainability": "...",
  "catalyst": "...",
  "risk": "..."
}`;

    try {
      const res = await ai.models.generateContent({
        model: 'models/gemini-3.8-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
      const parsed = JSON.parse(res.text?.trim() || '{}');
      diagnosisMap[s.code] = {
        code: s.code,
        name: s.name,
        diagnosisDate: new Date().toISOString().split('T')[0],
        diagnosis: parsed,
      };
      await new Promise((r) => setTimeout(r, 1200));
    } catch (e: any) {
      console.warn(`Diagnosis error for ${s.code}:`, e.message);
    }
  }

  fs.writeFileSync(AI_FILE, JSON.stringify(diagnosisMap, null, 2), 'utf-8');
  console.log(`✅ Saved AI diagnosis to ${AI_FILE}`);
}

async function main() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // 1. 既存銘柄データの読み込み（在籍日数の引き継ぎ用）
  let existingStocks: StockItem[] = [];
  if (fs.existsSync(STOCKS_FILE)) {
    try {
      const raw = JSON.parse(fs.readFileSync(STOCKS_FILE, 'utf-8'));
      existingStocks = raw.stocks || [];
    } catch {
      // ignore
    }
  }
  const existingMap = new Map<string, StockItem>(existingStocks.map((s) => [s.code, s]));

  // 2. TradingView から自己資本比率50%以上・PBR1.0以下などの候補銘柄を取得
  const candidates = await fetchTradingViewCandidates();
  if (candidates.length === 0 && existingStocks.length === 0) {
    console.log('No candidates fetched and no existing stocks.');
    return;
  }

  const baseList = candidates.length > 0 ? candidates : existingStocks;

  // 3. 最新株価・会社予想PER・会社予想配当利回りを更新
  const enriched = await enrichWithMarketForecasts(baseList);

  // 4. 5大基準で最終絞り込み（配当利回り 4%以上、PBR 1.0倍以下、ROE 8%以上、自己資本比率 50%以上）
  const screened = enriched.filter((s) => {
    if (s.category === 'sotsugyo') return true;
    if (s.equity_ratio == null || s.equity_ratio < DEFAULT_CRITERIA.minEquityRatio) return false;
    if (s.pbr != null && s.pbr > DEFAULT_CRITERIA.maxPbr) return false;
    if (s.roe != null && s.roe < DEFAULT_CRITERIA.minRoe) return false;
    if (s.dividend_yield != null && s.dividend_yield < DEFAULT_CRITERIA.minDividendYield) return false;
    return true;
  });

  console.log(`🎯 Strictly screened stocks: ${screened.length} stocks qualify.`);

  // 5. 滞在日数 (stayDays) と 居残り (>=90日) / 転入 (<90日) を計算
  const todayStr = new Date().toISOString().split('T')[0];
  const finalStocks = screened.map((s) => {
    const prev = existingMap.get(s.code);
    if (prev) {
      const stayDays = (prev.stayDays || 0) + 1;
      const category: StockItem['category'] =
        prev.category === 'sotsugyo' ? 'sotsugyo' : stayDays >= 90 ? 'inokori' : 'tennyu';
      return {
        ...s,
        stayDays,
        category,
        entryDate: prev.entryDate || todayStr,
      };
    } else {
      return {
        ...s,
        stayDays: 1,
        category: 'tennyu' as StockItem['category'],
        entryDate: todayStr,
      };
    }
  });

  // 6. JSON に保存
  const now = new Date().toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const outputData = {
    updatedAt: now,
    count: finalStocks.length,
    stocks: finalStocks,
  };

  fs.writeFileSync(STOCKS_FILE, JSON.stringify(outputData, null, 2), 'utf-8');
  console.log(`✅ Successfully saved ${finalStocks.length} screened stocks to ${STOCKS_FILE}`);

  // 7. チャートデータを収集・保存
  await fetchAndSaveCharts(finalStocks);

  // 8. 土曜診断オプション（--with-ai または SATURDAY_DIAGNOSIS=true）
  const withAi = process.argv.includes('--with-ai') || process.env.SATURDAY_DIAGNOSIS === 'true';
  if (withAi) {
    await generateAiDiagnosis(finalStocks);
  }
}

main().catch((err) => {
  console.error('Fatal error during screening:', err);
  process.exit(1);
});
