import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yahooFinance from 'yahoo-finance2';
import { GoogleGenAI } from '@google/genai';
import { StockItem, DEFAULT_CRITERIA, AlumniCategory } from '../src/types';

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
      { left: 'price_book_ratio', operation: 'less', right: 1.1 },
      { left: 'return_on_equity', operation: 'greater', right: 7.0 },
    ],
    options: { lang: 'ja' },
    symbols: { query: { types: [] }, tickers: [] },
    columns: [
      'name',
      'description',
      'close',
      'change',
      'market_cap_basic',
      'price_book_ratio',
      'return_on_equity',
      'total_debt_to_equity',
      'current_ratio',
      'ebitda_growth_yoy',
    ],
    sort: { sortBy: 'market_cap_basic', sortOrder: 'desc' },
    range: [0, 150],
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

      candidates.push({
        code,
        name: cleanName || rawName,
        close: d[2] != null ? Number(d[2]) : null,
        change: d[3] != null ? Number(Number(d[3]).toFixed(2)) : null,
        market_cap: marketCapOku,
        pbr: d[5] != null ? Number(Number(d[5]).toFixed(2)) : null,
        roe: d[6] != null ? Number(Number(d[6]).toFixed(2)) : null,
        de_ratio: d[7] != null ? Number(Number(d[7]).toFixed(2)) : null,
        current_ratio: d[8] != null ? Number(Number(d[8]).toFixed(1)) : null,
        ebitda_growth: d[9] != null ? Number(Number(d[9]).toFixed(2)) : 3.5,
        equity_ratio: 65,
        dividend_yield: 4.2,
        payout_ratio: 35.0,
        per: 10.5,
        category: 'tennyu',
        stayDays: 1,
        entryDate: new Date().toISOString().split('T')[0],
      });
    }

    console.log(`✅ Fetched ${candidates.length} candidates from TradingView.`);
    return candidates;
  } catch (err) {
    console.warn('⚠️ TradingView fetch failed:', err);
    return [];
  }
}

async function enrichWithYahooFinance(stocks: StockItem[]): Promise<StockItem[]> {
  console.log(`📊 Enriching ${stocks.length} stocks with Yahoo Finance...`);
  const enriched: StockItem[] = [];

  for (const s of stocks) {
    try {
      const q: any = await yahooFinance.quote(`${s.code}.T`);
      if (q) {
        if (q.regularMarketPrice != null) s.close = q.regularMarketPrice;
        if (q.regularMarketChangePercent != null) s.change = Number(q.regularMarketChangePercent.toFixed(2));
        if (q.marketCap != null) s.market_cap = Math.round(q.marketCap / 100000000);
        if (q.trailingAnnualDividendYield != null) {
          s.dividend_yield = Number((q.trailingAnnualDividendYield * 100).toFixed(2));
        }
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
      // ignore single ticker error
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

  // 既存データがあれば引き継ぎ
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
      // APIレートリミット対策で少し待機
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

  // 3. Yahoo Finance で株価・予想PER等を更新
  const enriched = await enrichWithYahooFinance(baseList);

  // 4. スクリーニング基準を適用（5大基準）
  const screened = enriched.filter((s) => {
    if (s.category === 'sotsugyo') return true;
    if (s.dividend_yield != null && s.dividend_yield < DEFAULT_CRITERIA.minDividendYield) return false;
    if (s.pbr != null && s.pbr > DEFAULT_CRITERIA.maxPbr) return false;
    if (s.roe != null && s.roe < DEFAULT_CRITERIA.minRoe) return false;
    if (s.ebitda_growth != null && s.ebitda_growth < DEFAULT_CRITERIA.minEbitdaGrowth) return false;
    if (s.equity_ratio != null && s.equity_ratio < DEFAULT_CRITERIA.minEquityRatio) return false;
    return true;
  });

  // 5. 滞在日数 (stayDays) と 居残り (>=90日) / 転入 (<90日) を計算
  const todayStr = new Date().toISOString().split('T')[0];
  const finalStocks = screened.map((s) => {
    const prev = existingMap.get(s.code);
    if (prev) {
      const stayDays = (prev.stayDays || 0) + 1;
      const category: StockItem['category'] = prev.category === 'sotsugyo' ? 'sotsugyo' : stayDays >= 90 ? 'inokori' : 'tennyu';
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

  // 7. 土曜診断オプション（--with-ai または SATURDAY_DIAGNOSIS=true）
  const withAi = process.argv.includes('--with-ai') || process.env.SATURDAY_DIAGNOSIS === 'true';
  if (withAi) {
    await generateAiDiagnosis(finalStocks);
  }
}

main().catch((err) => {
  console.error('Fatal error during screening:', err);
  process.exit(1);
});
