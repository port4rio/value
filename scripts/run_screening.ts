import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { StockItem, DEFAULT_CRITERIA, StockChartData, ChartPoint } from '../src/types';
import { normalizeCompanyName } from '../src/data/companyNames';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../public/data');
const STOCKS_FILE = path.join(DATA_DIR, 'stocks.json');
const AI_FILE = path.join(DATA_DIR, 'ai_diagnosis.json');
const CHARTS_FILE = path.join(DATA_DIR, 'charts.json');

// TradingView Japan Scanner endpoint
const TV_SCANNER_URL = 'https://scanner.tradingview.com/japan/scan';

/**
 * TradingView Japan Scanner から全4000銘柄を取得
 * （Colabの tradingview-screener と完全同一定義のカラム・条件）
 */
async function fetchTradingViewAllStocks(): Promise<StockItem[]> {
  console.log('📡 Fetching all stocks directly from TradingView Japan scanner (limit: 4000)...');
  const payload = {
    filter: [
      { left: 'market_cap_basic', operation: 'nempty' },
    ],
    options: { lang: 'ja' },
    symbols: { query: { types: [] }, tickers: [] },
    columns: [
      'name',                     // 0: 銘柄コード
      'description',              // 1: 銘柄名
      'close',                    // 2: 現在値
      'change',                   // 3: 前日比率(%)
      'market_cap_basic',         // 4: 時価総額
      'price_earnings_ttm',       // 5: PER
      'price_book_fq',            // 6: PBR
      'return_on_equity_fq',       // 7: ROE (%)
      'dividends_yield_current',  // 8: 配当利回り (%)
      'dividend_payout_ratio_fy', // 9: 配当性向 (FY)
      'ebitda_yoy_growth_fy',     // 10: EBITDA成長率通期 (%)
      'current_ratio_fq',         // 11: 流動比率 (%)
      'debt_to_equity_fq',        // 12: D/Eレシオ (%)
      'total_assets_fq',          // 13: 総資産 (自己資本比率計算用)
      'total_liabilities_fq',     // 14: 総負債 (自己資本比率計算用)
    ],
    sort: { sortBy: 'market_cap_basic', sortOrder: 'desc' },
    range: [0, 4000],
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

    // 東証(TSE)優先でソートしてから重複排除
    rows.sort((a: any, b: any) => {
      const aIsTse = String(a.s || '').startsWith('TSE:');
      const bIsTse = String(b.s || '').startsWith('TSE:');
      if (aIsTse && !bIsTse) return -1;
      if (!aIsTse && bIsTse) return 1;
      return 0;
    });

    const seenCodes = new Set<string>();
    const stocks: StockItem[] = [];

    for (const r of rows) {
      const ticker = String(r.s || '');
      // 取引所プレフィックスの除去（TSE:641A, NAG:6902, FSE:242A -> 641A, 6902, 242A）
      const code = ticker.replace(/^[A-Z]+:/, '') || String(r.d?.[0] || '');
      // 東証新コード規格（4文字英数字）対応
      if (!/^[0-9][0-9A-Za-z]{3}$/i.test(code)) continue;
      if (seenCodes.has(code)) continue;
      seenCodes.add(code);

      const d = r.d || [];
      const rawName = String(d[1] || d[0] || code);
      const cleanName = normalizeCompanyName(code, rawName);
      const marketCapOku = d[4] != null ? Math.round(Number(d[4]) / 100000000) : null;

      // 配当利回り (dividends_yield_current)
      const dyCurrent = d[8] != null ? Number(Number(d[8]).toFixed(2)) : null;

      // 自己資本比率の計算: ((total_assets_fq - total_liabilities_fq) / total_assets_fq) * 100
      const totalAssets = d[13] != null ? Number(d[13]) : null;
      const totalLiabilities = d[14] != null ? Number(d[14]) : 0;
      let equityRatio: number | null = null;
      if (totalAssets && totalAssets > 0) {
        equityRatio = Number((((totalAssets - totalLiabilities) / totalAssets) * 100).toFixed(2));
      }

      const pbr = d[6] != null ? Number(Number(d[6]).toFixed(2)) : null;
      const roe = d[7] != null ? Number(Number(d[7]).toFixed(2)) : null;
      const ebitdaGrowth = d[10] != null ? Number(Number(d[10]).toFixed(2)) : null;

      const pbrVal = pbr != null ? Number(pbr.toFixed(2)) : null;
      const category: StockItem['category'] =
        pbrVal != null && pbrVal > 1.20
          ? 'sotsugyo'
          : pbrVal != null && pbrVal > 1.00
          ? 'shokaku'
          : 'wariyasu';

      stocks.push({
        code,
        name: cleanName || rawName,
        close: d[2] != null ? Number(d[2]) : null,
        change: d[3] != null ? Number(Number(d[3]).toFixed(2)) : null,
        market_cap: marketCapOku,
        per: d[5] != null ? Number(Number(d[5]).toFixed(2)) : null,
        pbr,
        roe,
        dividend_yield: dyCurrent,
        payout_ratio: d[9] != null ? Number(Number(d[9]).toFixed(2)) : null,
        ebitda_growth: ebitdaGrowth,
        current_ratio: d[11] != null ? Number((Number(d[11]) * 100).toFixed(2)) : null,
        de_ratio: d[12] != null ? Number(Number(d[12]).toFixed(2)) : null,
        equity_ratio: equityRatio,
        category,
        stayDays: 1,
        entryDate: new Date().toISOString().split('T')[0],
      });
    }

    console.log(`✅ Loaded ${stocks.length} valid stocks from TradingView.`);
    return stocks;
  } catch (err) {
    console.error('⚠️ TradingView fetch failed:', err);
    return [];
  }
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

        if (points.length >= 2) {
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
    await new Promise((r) => setTimeout(r, 60));
  }

  fs.writeFileSync(CHARTS_FILE, JSON.stringify(chartsMap, null, 2), 'utf-8');
  console.log(`✅ Successfully saved ${Object.keys(chartsMap).length} charts to ${CHARTS_FILE}`);
}

/**
 * 2つの 'YYYY-MM-DD' 日付間のカレンダー日数（差分日数）を計算
 */
function getCalendarDayDiff(todayStr: string, dateStr: string): number {
  const [y1, m1, d1] = todayStr.split('-').map(Number);
  const [y2, m2, d2] = dateStr.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((utc1 - utc2) / MS_PER_DAY);
}

async function generateAiDiagnosis(
  stocks: StockItem[],
  newlyAddedCodes: Set<string> = new Set(),
  todayStr: string = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('ℹ️ GEMINI_API_KEY is not set. Skipping AI diagnosis.');
    return;
  }

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

  const forceAi = process.argv.includes('--force-ai');
  const jstDayOfWeek = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })).getDay();
  const isSaturday = jstDayOfWeek === 6 || process.env.SATURDAY_DIAGNOSIS === 'true' || process.argv.includes('--saturday');

  const targets = stocks.filter((s) => {
    if (forceAi) return true;
    if (newlyAddedCodes.has(s.code)) return true;
    const existing = diagnosisMap[s.code];
    const hasValidDiagnosis = !!(existing && existing.diagnosis?.business_summary);
    if (!hasValidDiagnosis) return true;

    if (isSaturday && existing.diagnosisDate) {
      const daysSince = getCalendarDayDiff(todayStr, existing.diagnosisDate);
      if (daysSince >= 6) return true;
    }
    return false;
  });

  console.log(`🤖 Generating AI diagnoses for ${targets.length} stocks (Saturday refresh: ${isSaturday}, Force: ${forceAi})...`);

  for (const s of targets) {
    console.log(`🧠 Diagnosing [${s.code}] ${s.name}...`);
    const prompt = `あなたは辛口で深い洞察力を持つプロの株式アナリストです。
バリュー株スクリーニングした銘柄の定性情報が欲しい。数値を単純に説明しないこと。

【対象銘柄】
・銘柄コード: ${s.code}
・企業名: ${s.name}
・実績PER: ${s.per != null ? `${s.per}倍` : '不明'}
・実績PBR: ${s.pbr != null ? `${s.pbr}倍` : '不明'}
・予想配当利回り: ${s.dividend_yield != null ? `${s.dividend_yield}%` : '不明'}
・配当性向: ${s.payout_ratio != null ? `${s.payout_ratio}%` : '不明'}
・ROE: ${s.roe != null ? `${s.roe}%` : '不明'}
・自己資本比率: ${s.equity_ratio != null ? `${s.equity_ratio}%` : '不明'}
・EBITDA成長率: ${s.ebitda_growth != null ? `${s.ebitda_growth}%` : '不明'}
・D/Eレシオ: ${s.de_ratio != null ? `${s.de_ratio}倍` : '不明'}
・流動比率: ${s.current_ratio != null ? `${s.current_ratio}%` : '不明'}

【出力要件】
以下の5つの項目について、定性的な洞察を具体的かつ辛口で鋭く解説し、必ず指定のキー名を持つJSONオブジェクトとして出力してください。
1. "business_summary": 事業紹介や特色を端的な一行で（何で稼いでいる会社か）
2. "undervalued_reason": なぜ今安く放置されているのか（市場の懸念、PBRが低い理由。数値を単純に説明しないこと）
3. "contrarian_appeal": それでも魅力的な理由（逆張りポイント）
4. "revaluation_scenario": 再評価シナリオ（何が起きたら株価が見直されるか）
5. "max_risk": 最大リスク（1つに絞る）

JSON形式例:
{
  "business_summary": "...",
  "undervalued_reason": "...",
  "contrarian_appeal": "...",
  "revaluation_scenario": "...",
  "max_risk": "..."
}`;

    try {
      let response: any;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.5-flash-lite',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.3,
          },
        });
      } catch {
        response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.3,
          },
        });
      }

      const text = response.text?.trim() || '';
      if (text) {
        try {
          const parsed = JSON.parse(text);
          if (parsed && (parsed.business_summary || parsed.undervalued_reason || parsed.valuation_appeal)) {
            diagnosisMap[s.code] = {
              code: s.code,
              name: s.name,
              diagnosisDate: todayStr,
              diagnosis: {
                business_summary: parsed.business_summary || '',
                undervalued_reason: parsed.undervalued_reason || parsed.valuation_appeal || '',
                contrarian_appeal: parsed.contrarian_appeal || parsed.dividend_sustainability || '',
                revaluation_scenario: parsed.revaluation_scenario || parsed.catalyst || '',
                max_risk: parsed.max_risk || parsed.risks || '',
                valuation_appeal: parsed.undervalued_reason || parsed.valuation_appeal || '',
                dividend_sustainability: parsed.contrarian_appeal || parsed.dividend_sustainability || '',
                catalyst: parsed.revaluation_scenario || parsed.catalyst || '',
                risks: parsed.max_risk || parsed.risks || '',
              },
            };
            console.log(`✅ AI Diagnosis completed for [${s.code}] ${s.name}`);
          }
        } catch (jsonErr) {
          console.warn(`JSON parse error for ${s.code}:`, jsonErr);
        }
      }
    } catch (err: any) {
      console.warn(`AI diagnosis error for ${s.code}:`, err.message || err);
    }

    await new Promise((r) => setTimeout(r, 600));
  }

  fs.writeFileSync(AI_FILE, JSON.stringify(diagnosisMap, null, 2), 'utf-8');
  console.log(`✅ Saved ${Object.keys(diagnosisMap).length} AI diagnoses to ${AI_FILE}`);
}

/**
 * 日本時間 (JST) の年・月・日を取得
 */
function getJstDateParts(): { year: number; month: number; day: number; dateStr: string } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const m = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    year: parseInt(m.year, 10),
    month: parseInt(m.month, 10),
    day: parseInt(m.day, 10),
    dateStr: `${m.year}-${m.month}-${m.day}`,
  };
}

function getNthMonday(year: number, month: number, n: number): number {
  const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const offset = (1 - firstDay + 7) % 7;
  return 1 + offset + (n - 1) * 7;
}

/**
 * 日本の株式市場（東証）の休業日判定（土日、祝日、振替休日、国民の休日、年末年始）
 */
function isTokyoMarketHoliday(year: number, month: number, day: number): boolean {
  const d = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = d.getUTCDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return true;
  if (month === 12 && day === 31) return true;
  if (month === 1 && (day === 2 || day === 3)) return true;

  const holidays = new Set<string>();
  const addH = (m: number, dNum: number) => holidays.add(`${m}-${dNum}`);

  addH(1, 1);
  addH(1, getNthMonday(year, 1, 2));
  addH(2, 11);
  addH(2, 23);

  const shunbun = Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  addH(3, shunbun);

  addH(4, 29);
  addH(5, 3);
  addH(5, 4);
  addH(5, 5);
  addH(7, getNthMonday(year, 7, 3));
  addH(8, 11);
  addH(9, getNthMonday(year, 9, 3));

  const shubun = Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  addH(9, shubun);

  addH(10, getNthMonday(year, 10, 2));
  addH(11, 3);
  addH(11, 23);

  for (let dNum = 1; dNum <= 31; dNum++) {
    const cur = new Date(Date.UTC(year, month - 1, dNum));
    if (cur.getUTCMonth() !== month - 1) break;
    if (cur.getUTCDay() === 0 && holidays.has(`${month}-${dNum}`)) {
      let sub = dNum + 1;
      while (holidays.has(`${month}-${sub}`)) sub++;
      if (sub === day) return true;
    }
  }

  if (holidays.has(`${month}-${day - 1}`) && holidays.has(`${month}-${day + 1}`)) {
    return true;
  }

  return holidays.has(`${month}-${day}`);
}

/**
 * 卒業理由の判定
 */
function determineGraduationReason(s: StockItem): string {
  const pbrVal = s.pbr != null ? Number(s.pbr.toFixed(2)) : null;
  if (pbrVal != null && pbrVal > 1.20) {
    return `PBR1.2倍超達成（株価上昇によりPBR ${pbrVal.toFixed(2)}倍）`;
  }
  return 'PBR1.2倍超達成（名誉の卒業）';
}

/**
 * 脱落理由の判定
 */
function determineDropoutReason(s: StockItem): string {
  const reasons: string[] = [];
  if (s.dividend_yield != null && s.dividend_yield < 3.8) {
    reasons.push(`利回り3.8%割れ（${s.dividend_yield.toFixed(2)}%）`);
  }
  if (s.roe != null && s.roe < 7.5) {
    reasons.push(`ROE7.5%割れ（${s.roe.toFixed(2)}%）`);
  }
  if (s.equity_ratio != null && s.equity_ratio < 48.0) {
    reasons.push(`自己資本比率48%割れ（${s.equity_ratio.toFixed(1)}%）`);
  }
  if (s.ebitda_growth != null && s.ebitda_growth < -10.0) {
    reasons.push(`EBITDA成長率-10%割れ（${s.ebitda_growth.toFixed(1)}%）`);
  }
  return reasons.length > 0 ? reasons.join('、') : 'スクリーニング基準未達';
}

/**
 * 1年（365日）追跡期間の判定
 */
function isWithinOneYear(dateStr?: string, todayStr?: string): boolean {
  if (!dateStr) return true;
  try {
    const d1 = new Date(dateStr).getTime();
    const d2 = todayStr ? new Date(todayStr).getTime() : Date.now();
    const diffDays = (d2 - d1) / (1000 * 60 * 60 * 24);
    return diffDays <= 365;
  } catch {
    return true;
  }
}

/**
 * Google Colab と完全一致する合否判定:
 * (price_book_fq <= 1.2) & (return_on_equity_fq >= 7.5) & (dividends_yield_current >= 3.8) &
 * (ebitda_yoy_growth_fy >= -10) & (equity_ratio_calculated >= 48)
 */
function isQualifyingActive(s: StockItem): boolean {
  if (s.equity_ratio == null || s.equity_ratio < 48.0) return false;
  const pbrVal = s.pbr != null ? Number(s.pbr.toFixed(2)) : null;
  if (pbrVal == null || pbrVal > 1.20) return false;
  if (s.roe == null || s.roe < 7.5) return false;
  if (s.dividend_yield == null || s.dividend_yield < 3.8) return false;
  if (s.ebitda_growth == null || s.ebitda_growth < -10.0) return false;
  return true;
}

async function main() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // JST現在日時の取得
  const jstNow = getJstDateParts();
  const isMarketOpenToday = !isTokyoMarketHoliday(jstNow.year, jstNow.month, jstNow.day);
  console.log(`📅 JST Date: ${jstNow.dateStr}, Market Open Day: ${isMarketOpenToday ? 'YES (平日・営業日)' : 'NO (休業日/祝日)'}`);

  // 1. 既存銘柄データの読み込み
  let existingStocks: StockItem[] = [];
  let prevLastIncrementDate: string | undefined;
  if (fs.existsSync(STOCKS_FILE)) {
    try {
      const raw = JSON.parse(fs.readFileSync(STOCKS_FILE, 'utf-8'));
      existingStocks = raw.stocks || [];
      prevLastIncrementDate = raw.lastIncrementDate;
    } catch {
      // ignore
    }
  }
  const existingMap = new Map<string, StockItem>(existingStocks.map((s) => [s.code, s]));

  // 2. TradingView から全4000銘柄を直接取得（他サイト非依存・Colab完全準拠）
  const allTvStocks = await fetchTradingViewAllStocks();

  if (allTvStocks.length === 0) {
    console.error('No stocks fetched from TradingView.');
    return;
  }

  // 3. 滞在日数 (stayDays) の計算フラグ
  const todayStr = jstNow.dateStr;
  const forceIncrement = process.argv.includes('--force-increment');
  const shouldIncrementStayDays = forceIncrement || (isMarketOpenToday && prevLastIncrementDate !== todayStr);
  console.log(`⏳ StayDays Increment Mode: ${shouldIncrementStayDays ? '+1 (営業日の初回実行または強制実行)' : '維持 (休日または同日再実行のため加算なし)'}`);

  // 4. 組み分け（割安組 / 昇格組 / 卒業生 / 脱落者）
  const activeStocks: StockItem[] = [];
  const graduatedStocks: StockItem[] = [];
  const dropoutStocks: StockItem[] = [];
  const newlyAddedCodes = new Set<string>();

  const tvMap = new Map<string, StockItem>(allTvStocks.map((s) => [s.code, s]));

  for (const s of allTvStocks) {
    const prev = existingMap.get(s.code);
    const passes = isQualifyingActive(s);

    if (passes) {
      const pbrVal = s.pbr != null ? Number(s.pbr.toFixed(2)) : 1.0;
      const targetCategory: 'wariyasu' | 'shokaku' = pbrVal <= 1.00 ? 'wariyasu' : 'shokaku';

      if (prev && (prev.category === 'sotsugyo' || prev.category === 'datsuraku')) {
        console.log(`🎉 再転入: [${s.code}] ${s.name} が再びスクリーニング条件をクリアして${targetCategory === 'wariyasu' ? '割安組' : '昇格組'}に転入！`);
        newlyAddedCodes.add(s.code);
        activeStocks.push({
          ...s,
          category: targetCategory,
          stayDays: 1,
          entryDate: todayStr,
          groupEntryDate: todayStr,
          lastIncrementDate: isMarketOpenToday ? todayStr : undefined,
        });
      } else if (prev) {
        const prevCategory = prev.category === 'shokaku' ? 'shokaku' : 'wariyasu';
        const isSameGroup = prevCategory === targetCategory;
        const effectiveEntryDate = prev.entryDate || todayStr;
        const prevDays = prev.stayDays != null && prev.stayDays > 0 ? prev.stayDays : 1;

        let stayDays: number;
        let groupEntryDate: string;
        if (isSameGroup) {
          stayDays = shouldIncrementStayDays ? prevDays + 1 : prevDays;
          groupEntryDate = prev.groupEntryDate || prev.entryDate || todayStr;
        } else {
          console.log(`🔄 組の異動: [${s.code}] ${s.name} (${prevCategory} → ${targetCategory})`);
          stayDays = 1;
          groupEntryDate = todayStr;
        }

        const lastIncrementDate = shouldIncrementStayDays ? todayStr : (prev.lastIncrementDate || prevLastIncrementDate);

        activeStocks.push({
          ...s,
          category: targetCategory,
          stayDays,
          entryDate: effectiveEntryDate,
          groupEntryDate,
          lastIncrementDate,
        });
      } else {
        // 新規転入銘柄
        console.log(`✨ 新規転入: [${s.code}] ${s.name} (${targetCategory === 'wariyasu' ? '割安組' : '昇格組'})`);
        newlyAddedCodes.add(s.code);
        activeStocks.push({
          ...s,
          category: targetCategory,
          stayDays: 1,
          entryDate: todayStr,
          groupEntryDate: todayStr,
          lastIncrementDate: isMarketOpenToday ? todayStr : undefined,
        });
      }
    }
  }

  // 既存の在籍・追跡銘柄で、今回スクリーニングから外れたものを卒業生/脱落者として処理
  for (const prev of existingStocks) {
    const currentTv = tvMap.get(prev.code);
    const passes = currentTv ? isQualifyingActive(currentTv) : false;

    if (!passes) {
      const s = currentTv || prev;
      const wasActive = prev.category !== 'sotsugyo' && prev.category !== 'datsuraku';

      if (wasActive) {
        const pbrVal = s.pbr != null ? Number(s.pbr.toFixed(2)) : (prev.pbr || 1.0);
        if (pbrVal > 1.20) {
          const reason = determineGraduationReason(s);
          console.log(`🎓 卒業検出: [${s.code}] ${s.name} (${reason})`);
          graduatedStocks.push({
            ...s,
            category: 'sotsugyo',
            stayDays: 1,
            entryDate: prev.entryDate || todayStr,
            groupEntryDate: todayStr,
            graduationDate: todayStr,
            graduationReason: reason,
            graduationPrice: s.close || prev.close,
            graduationReturn: 0,
          });
        } else {
          const reason = determineDropoutReason(s);
          console.log(`⚠️ 脱落検出: [${s.code}] ${s.name} (${reason})`);
          dropoutStocks.push({
            ...s,
            category: 'datsuraku',
            stayDays: 1,
            entryDate: prev.entryDate || todayStr,
            groupEntryDate: todayStr,
            dropoutDate: todayStr,
            dropoutReason: reason,
            dropoutPrice: s.close || prev.close,
            dropoutReturn: 0,
          });
        }
      } else if (prev.category === 'sotsugyo') {
        const gradDate = prev.graduationDate || todayStr;
        if (isWithinOneYear(gradDate, todayStr)) {
          const gradPrice = prev.graduationPrice || prev.close || s.close;
          let gradReturn: number | undefined = prev.graduationReturn;
          if (gradPrice && s.close) {
            gradReturn = Number((((s.close - gradPrice) / gradPrice) * 100).toFixed(2));
          }
          const prevDays = prev.stayDays ? Math.abs(prev.stayDays) : 1;
          const stayDays = shouldIncrementStayDays ? prevDays + 1 : prevDays;
          graduatedStocks.push({
            ...s,
            category: 'sotsugyo',
            stayDays,
            entryDate: prev.entryDate,
            groupEntryDate: prev.groupEntryDate || prev.graduationDate,
            graduationDate: gradDate,
            graduationReason: prev.graduationReason || determineGraduationReason(s),
            graduationPrice: gradPrice,
            graduationReturn: gradReturn,
          });
        }
      } else if (prev.category === 'datsuraku') {
        const dropDate = prev.dropoutDate || prev.graduationDate || todayStr;
        if (isWithinOneYear(dropDate, todayStr)) {
          const dropPrice = prev.dropoutPrice || prev.graduationPrice || prev.close || s.close;
          let dropReturn: number | undefined = prev.dropoutReturn ?? prev.graduationReturn;
          if (dropPrice && s.close) {
            dropReturn = Number((((s.close - dropPrice) / dropPrice) * 100).toFixed(2));
          }
          const prevDays = prev.stayDays ? Math.abs(prev.stayDays) : 1;
          const stayDays = shouldIncrementStayDays ? prevDays + 1 : prevDays;
          dropoutStocks.push({
            ...s,
            category: 'datsuraku',
            stayDays,
            entryDate: prev.entryDate,
            groupEntryDate: prev.groupEntryDate || prev.dropoutDate,
            dropoutDate: dropDate,
            dropoutReason: prev.dropoutReason || prev.graduationReason || determineDropoutReason(s),
            dropoutPrice: dropPrice,
            dropoutReturn: dropReturn,
          });
        }
      }
    }
  }

  // 5. 銘柄リストの統合
  const finalStocks = [...activeStocks, ...graduatedStocks, ...dropoutStocks];
  console.log(`🎯 Active stocks: ${activeStocks.length} (割安: ${activeStocks.filter((s) => s.category === 'wariyasu').length}, 昇格: ${activeStocks.filter((s) => s.category === 'shokaku').length}), Graduated: ${graduatedStocks.length}, Dropped: ${dropoutStocks.length}, Total: ${finalStocks.length}`);

  // 6. JSON に保存
  const now = new Date().toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const outputData = {
    updatedAt: now,
    lastIncrementDate: shouldIncrementStayDays ? todayStr : prevLastIncrementDate,
    count: activeStocks.length,
    stocks: finalStocks,
  };

  fs.writeFileSync(STOCKS_FILE, JSON.stringify(outputData, null, 2), 'utf-8');
  console.log(`✅ Successfully saved ${finalStocks.length} screened stocks to ${STOCKS_FILE}`);

  // 7. チャートデータを収集・保存
  await fetchAndSaveCharts(finalStocks);

  // 8. AI診断
  const withAi = process.argv.includes('--with-ai') || process.argv.includes('--force-ai') || process.env.SATURDAY_DIAGNOSIS === 'true';
  const hasEmptyAiFile = !fs.existsSync(AI_FILE) || fs.readFileSync(AI_FILE, 'utf-8').trim() === '{}' || fs.readFileSync(AI_FILE, 'utf-8').trim() === '';
  const jstDayOfWeek = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })).getDay();
  const isSaturday = jstDayOfWeek === 6 || process.env.SATURDAY_DIAGNOSIS === 'true' || process.argv.includes('--saturday');

  const shouldRunAi = !!process.env.GEMINI_API_KEY && (
    withAi ||
    hasEmptyAiFile ||
    isSaturday ||
    newlyAddedCodes.size > 0
  );

  if (shouldRunAi) {
    console.log(`🤖 Triggering AI Diagnosis (withAi=${withAi}, isSaturday=${isSaturday}, newStocks=${newlyAddedCodes.size}, hasEmptyFile=${hasEmptyAiFile})...`);
    await generateAiDiagnosis(finalStocks, newlyAddedCodes, todayStr);
  } else if (!process.env.GEMINI_API_KEY) {
    console.log('ℹ️ GEMINI_API_KEY is not set. Skipping AI diagnosis.');
  } else {
    console.log('ℹ️ AI diagnosis not triggered (no new stocks and not Saturday).');
  }
}

main().catch((err) => {
  console.error('Fatal error during screening:', err);
  process.exit(1);
});
