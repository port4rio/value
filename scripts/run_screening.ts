import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yahooFinance from 'yahoo-finance2';
import { GoogleGenAI } from '@google/genai';
import { StockItem, DEFAULT_CRITERIA } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../public/data');
const STOCKS_FILE = path.join(DATA_DIR, 'stocks.json');
const AI_FILE = path.join(DATA_DIR, 'ai_diagnosis.json');

// TradingView Japan Scanner endpoint
const TV_SCANNER_URL = 'https://scanner.tradingview.com/japan/scan';

async function fetchTradingViewCandidates(): Promise<StockItem[]> {
  console.log('📡 Fetching candidate stocks from TradingView...');
  const payload = {
    filter: [
      { left: 'market_cap_basic', operation: 'nempty' },
      { left: 'type', operation: 'equal', right: 'stock' },
      { left: 'subtype', operation: 'in_range', right: ['common'] },
      { left: 'price_book_fq', operation: 'less', right: Math.max(DEFAULT_CRITERIA.maxPbr, 1.05) },
      { left: 'return_on_equity_fq', operation: 'egreater', right: Math.min(DEFAULT_CRITERIA.minRoe, 7.0) },
      { left: 'ebitda_yoy_growth_fy', operation: 'egreater', right: DEFAULT_CRITERIA.minEbitdaGrowth },
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
      'dividends_yield_current',  // 8: 配当利回り%
      'dividend_payout_ratio_fy', // 9: 配当性向%
      'ebitda_yoy_growth_fy',     // 10: EBITDA成長率%
      'current_ratio_fq',         // 11: 流動比率
      'debt_to_equity_fq',        // 12: D/Eレシオ
      'total_assets_fq',          // 13: 総資産
      'total_liabilities_fq',     // 14: 負債合計
    ],
    sort: { sortBy: 'dividends_yield_current', sortOrder: 'desc' },
    range: [0, 400],
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

      // 自己資本比率の計算: ((総資産 - 負債合計) / 総資産) * 100
      const totalAssets = d[13] != null ? Number(d[13]) : null;
      const totalLiabilities = d[14] != null ? Number(d[14]) : 0;
      let equityRatio: number | null = null;
      if (totalAssets && totalAssets > 0) {
        equityRatio = Number((((totalAssets - totalLiabilities) / totalAssets) * 100).toFixed(2));
      }

      candidates.push({
        code,
        name: cleanName || rawName,
        close: d[2] != null ? Number(d[2]) : null,
        change: d[3] != null ? Number(Number(d[3]).toFixed(2)) : null,
        market_cap: marketCapOku,
        per: d[5] != null ? Number(Number(d[5]).toFixed(2)) : null,
        pbr: d[6] != null ? Number(Number(d[6]).toFixed(2)) : null,
        roe: d[7] != null ? Number(Number(d[7]).toFixed(2)) : null,
        dividend_yield: d[8] != null ? Number(Number(d[8]).toFixed(2)) : null,
        payout_ratio: d[9] != null ? Number(Number(d[9]).toFixed(2)) : null,
        ebitda_growth: d[10] != null ? Number(Number(d[10]).toFixed(2)) : null,
        current_ratio: d[11] != null ? Number((Number(d[11]) * 100).toFixed(2)) : null,
        de_ratio: d[12] != null ? Number(Number(d[12]).toFixed(2)) : null,
        equity_ratio: equityRatio,
        category: 'tennyu',
        stayDays: 1,
        entryDate: new Date().toISOString().split('T')[0],
      });
    }

    console.log(`✅ Fetched ${candidates.length} raw candidates from TradingView.`);
    return candidates;
  } catch (err) {
    console.warn('⚠️ TradingView fetch failed:', err);
    return [];
  }
}

async function enrichWithYahooFinance(stocks: StockItem[]): Promise<StockItem[]> {
  console.log(`📊 Enriching ${stocks.length} stocks with Yahoo Finance quotes...`);
  const enriched: StockItem[] = [];

  for (const s of stocks) {
    try {
      const q: any = await yahooFinance.quote(`${s.code}.T`);
      if (q) {
        if (q.regularMarketPrice != null) s.close = q.regularMarketPrice;
        if (q.regularMarketChangePercent != null) s.change = Number(q.regularMarketChangePercent.toFixed(2));
        if (q.marketCap != null) s.market_cap = Math.round(q.marketCap / 100000000);
        
        // Yahoo Finance の配当利回り（最新実績または予想）
        if (q.dividendYield != null && q.dividendYield > 0) {
          s.dividend_yield = Number(q.dividendYield.toFixed(2));
        } else if (q.trailingAnnualDividendYield != null && q.trailingAnnualDividendYield > 0) {
          s.dividend_yield = Number((q.trailingAnnualDividendYield * 100).toFixed(2));
        }

        // Yahoo Finance の会社予想PER（forwardPE優先）
        if (q.forwardPE != null && q.forwardPE > 0) {
          s.per = Number(q.forwardPE.toFixed(2));
        } else if (q.trailingPE != null && q.trailingPE > 0) {
          s.per = Number(q.trailingPE.toFixed(2));
        }

        if (q.priceToBook != null && q.priceToBook > 0) {
          s.pbr = Number(q.priceToBook.toFixed(2));
        }
        if (q.payoutRatio != null) {
          s.payout_ratio = Number((q.payoutRatio * 100).toFixed(1));
        }
      }
    } catch {
      // 個別エラーはスキップ
    }
    enriched.push(s);
  }

  return enriched;
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

  // 2. TradingView から候補銘柄取得
  const candidates = await fetchTradingViewCandidates();
  if (candidates.length === 0 && existingStocks.length === 0) {
    console.log('No candidates fetched and no existing stocks.');
    return;
  }

  const baseList = candidates.length > 0 ? candidates : existingStocks;

  // 3. 5大基準で初期足切り（特に自己資本比率 50% 以上、PBR 1.0倍以下、ROE 8%以上）
  const initialFiltered = baseList.filter((s) => {
    if (s.category === 'sotsugyo') return true;
    // 自己資本比率: 50%以上厳格判定（null または 50% 未満は除外）
    if (s.equity_ratio == null || s.equity_ratio < DEFAULT_CRITERIA.minEquityRatio) {
      return false;
    }
    // PBR: 1.0倍以下
    if (s.pbr != null && s.pbr > DEFAULT_CRITERIA.maxPbr) {
      return false;
    }
    // ROE: 8%以上
    if (s.roe != null && s.roe < DEFAULT_CRITERIA.minRoe) {
      return false;
    }
    // EBITDA成長率: 1%以上
    if (s.ebitda_growth != null && s.ebitda_growth < DEFAULT_CRITERIA.minEbitdaGrowth) {
      return false;
    }
    return true;
  });

  console.log(`🔍 After fundamental filtering: ${initialFiltered.length} stocks remain.`);

  // 4. Yahoo Finance で株価・最新配当利回り・予想PER等を更新
  const enriched = await enrichWithYahooFinance(initialFiltered);

  // 5. 配当利回り（4%以上）等の最終判定
  const screened = enriched.filter((s) => {
    if (s.category === 'sotsugyo') return true;
    if (s.dividend_yield != null && s.dividend_yield < DEFAULT_CRITERIA.minDividendYield) {
      return false;
    }
    if (s.pbr != null && s.pbr > DEFAULT_CRITERIA.maxPbr) {
      return false;
    }
    return true;
  });

  console.log(`🎯 Final strictly screened stocks count: ${screened.length}`);

  // 6. 滞在日数 (stayDays) と 居残り (>=90日) / 転入 (<90日) を計算
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

  // 7. JSON に保存
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
