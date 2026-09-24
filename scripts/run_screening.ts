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
      // 一次選別での取りこぼし予防: 条件を緩める（PBR 1.20以下、ROE 7.0%以上、配当3.5%以上）
      { left: 'price_book_fq', operation: 'less', right: 1.2 },
      { left: 'return_on_equity_fq', operation: 'egreater', right: 7.0 },
      { left: 'dividends_yield', operation: 'egreater', right: 3.5 },
    ],
    options: { lang: 'ja' },
    symbols: { query: { types: [] }, tickers: [] },
    columns: [
      'name',                     // 0: コード（例: TSE:7226, TSE:256A）
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
      // 新証券コード対応: 4桁数字（7226）または数字3桁+英数字（256A, 391A 等）
      if (!/^[0-9]{3}[0-9A-Za-z]$/.test(code)) continue;

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

      // 一次選別での取りこぼし予防（緩めの条件で通過させ、みんかぶの正確な値で最終選別）
      // 自己資本比率: 48%以上（計算誤差を考慮）
      if (equityRatio == null || equityRatio < 48.0) continue;
      // PBR: 1.20以下
      if (pbr != null && pbr > 1.20) continue;
      // ROE: 7.5%以上
      if (roe != null && roe < 7.5) continue;
      // 予想配当利回り: 3.8%以上
      if (dy != null && dy < 3.8) continue;

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

interface MinkabuData {
  per: number | null;
  pbr: number | null;
  dividendYield: number | null;
  equityRatio: number | null;
  roe: number | null;
}

/**
 * みんかぶ (minkabu.jp) から主要ファンダメンタルズ指標を取得
 * - 銘柄トップ (https://minkabu.jp/stock/{code}): PER(調整後), PBR, 配当利回り
 * - 決算ページ (https://minkabu.jp/stock/{code}/settlement): 自己資本率, ROE
 */
async function fetchMinkabuData(code: string): Promise<MinkabuData> {
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };

  let per: number | null = null;
  let pbr: number | null = null;
  let dividendYield: number | null = null;
  let equityRatio: number | null = null;
  let roe: number | null = null;

  // 1. 銘柄トップページ (PER(調整後), PBR, 配当利回り)
  try {
    const resTop = await fetch(`https://minkabu.jp/stock/${code}`, { headers });
    if (resTop.ok) {
      const htmlTop = await resTop.text();

      // PER (調整後)
      const perMatch = htmlTop.match(
        /<th[^>]*>\s*PER(?:\s*<[^>]+>)*\s*\(?調整後\)?(?:\s*<[^>]+>)*\s*<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i
      );
      if (perMatch) {
        const val = perMatch[1].replace(/倍|<[^>]+>|[\s,]/g, '');
        if (val && val !== '---' && !isNaN(Number(val))) {
          const num = Number(val);
          if (num > 0) per = num;
        }
      }

      // PBR
      const pbrMatch = htmlTop.match(/<th[^>]*>\s*PBR\s*<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i);
      if (pbrMatch) {
        const val = pbrMatch[1].replace(/倍|<[^>]+>|[\s,]/g, '');
        if (val && val !== '---' && !isNaN(Number(val))) {
          const num = Number(val);
          if (num > 0) pbr = num;
        }
      }

      // 配当利回り
      const dyMatch = htmlTop.match(
        /<th[^>]*>[\s\S]*?配当利回り[\s\S]*?<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i
      );
      if (dyMatch) {
        const val = dyMatch[1].replace(/%|<[^>]+>|[\s,]/g, '');
        if (val && val !== '---' && !isNaN(Number(val))) {
          const num = Number(val);
          if (num >= 0) dividendYield = num;
        }
      }
    }
  } catch {
    // ignore
  }

  // 2. 決算ページ (財務情報テーブルから自己資本率、収益性テーブルからROE)
  try {
    const resSet = await fetch(`https://minkabu.jp/stock/${code}/settlement`, { headers });
    if (resSet.ok) {
      const htmlSet = await resSet.text();

      const extractFromTable = (headerRegex: RegExp, targetRegex: RegExp): number | null => {
        const match = htmlSet.match(headerRegex);
        if (!match || match.index == null) return null;
        const kwIdx = match.index;
        const tableStart = htmlSet.lastIndexOf('<table', kwIdx);
        const tableEnd = htmlSet.indexOf('</table>', kwIdx);
        if (tableStart === -1 || tableEnd === -1) return null;
        const tableHtml = htmlSet.substring(tableStart, tableEnd);

        const theadMatch = tableHtml.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i);
        if (!theadMatch) return null;
        const ths = [...theadMatch[1].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((m) =>
          m[1].replace(/<[^>]+>|\s+/g, '')
        );
        const colIdx = ths.findIndex((h) => targetRegex.test(h));
        if (colIdx === -1) return null;

        const tbodyMatch = tableHtml.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
        if (!tbodyMatch) return null;

        // 決算期の行から最新の有効数値を取得
        const tbodyRows = [...tbodyMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
        for (const rowMatch of tbodyRows) {
          const cells = [
            ...rowMatch[1].matchAll(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi),
          ].map((m) => m[1].replace(/<[^>]+>|\s+/g, ''));
          if (colIdx < cells.length) {
            const v = cells[colIdx].replace(/%|倍|<[^>]+>|[\s,]/g, '');
            if (v && v !== '-' && v !== '---') {
              const n = Number(v);
              if (!isNaN(n)) return n;
            }
          }
        }
        return null;
      };

      // 財務情報テーブル: 自己資本率
      const eq = extractFromTable(/<th[^>]*>\s*自己資本(?:率|比率)?\s*<\/th>/i, /自己資本/);
      if (eq != null && eq > 0) equityRatio = eq;

      // 収益性テーブル: ROE
      const r = extractFromTable(/<th[^>]*>\s*ROE\s*<\/th>/i, /ROE/);
      if (r != null) roe = r;
    }
  } catch {
    // ignore
  }

  return { per, pbr, dividendYield, equityRatio, roe };
}

/**
 * 最新株価（Yahoo Finance）およびファンダメンタルズ指標（みんかぶ）を取得・更新
 */
async function enrichWithMarketForecasts(stocks: StockItem[]): Promise<StockItem[]> {
  console.log(`📊 Updating ${stocks.length} stocks with live quotes, and minkabu metrics (PER(調整後), PBR, 利回り, 自己資本率, ROE)...`);
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
      // 2. みんかぶ (minkabu) から PER(調整後)、PBR、配当利回り、自己資本率、ROE を正確に取得
      const minkabu = await fetchMinkabuData(s.code);
      if (minkabu.per != null && minkabu.per > 0) s.per = minkabu.per;
      if (minkabu.pbr != null && minkabu.pbr > 0) s.pbr = minkabu.pbr;
      if (minkabu.dividendYield != null && minkabu.dividendYield >= 0) s.dividend_yield = minkabu.dividendYield;
      if (minkabu.equityRatio != null && minkabu.equityRatio > 0) s.equity_ratio = minkabu.equityRatio;
      if (minkabu.roe != null) s.roe = minkabu.roe;
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
    // 既存の診断があり、強制更新でなければスキップ
    const forceAi = process.argv.includes('--force-ai');
    if (!forceAi && diagnosisMap[s.code] && diagnosisMap[s.code].diagnosis?.business_summary) {
      console.log(`⏩ [${s.code}] ${s.name} already diagnosed, using cached.`);
      continue;
    }

    console.log(`Analyzing [${s.code}] ${s.name}...`);
    const prompt = `あなたは日本株のバリュー株投資に精通したシニア・クオンツアナリストです。
以下の銘柄のファンダメンタルズ数値および企業の実際の事業内容を詳細に分析し、投資家向けの「週次AIバリュースコープ診断」を作成してください。

【対象銘柄】
証券コード: ${s.code}
銘柄名: ${s.name}
PER: ${s.per != null ? `${s.per}倍` : '－'}
PBR: ${s.pbr != null ? `${s.pbr}倍` : '－'}
配当利回り: ${s.dividend_yield != null ? `${s.dividend_yield}%` : '－'}
配当性向: ${s.payout_ratio != null ? `${s.payout_ratio}%` : '－'}
ROE: ${s.roe != null ? `${s.roe}%` : '－'}
自己資本比率: ${s.equity_ratio != null ? `${s.equity_ratio}%` : '－'}
EBITDA成長率: ${s.ebitda_growth != null ? `${s.ebitda_growth}%` : '－'}
D/Eレシオ: ${s.de_ratio != null ? `${s.de_ratio}倍` : '－'}
流動比率: ${s.current_ratio != null ? `${s.current_ratio}%` : '－'}

【出力指示】
以下の5つの項目について、客観的かつプロの視点で日本語で簡潔・明快に分析してください。
各項目は2〜3文（80〜120文字程度）で具体的に記述してください。

1. business_summary: 【事業特色・主力収益源】（主力事業、業界シェア、強み）
2. valuation_appeal: 【投資妙味と割安要因】（割安放置の背景、低PBR/PERの理由、株価下値の堅さ）
3. dividend_sustainability: 【配当の持続性と株主還元方針】（配当利回りの妙味、減配リスクの低さ、還元意欲）
4. catalyst: 【PBR是正・株価上昇カタリスト】（PBR1倍割れ是正策、資本効率改善、自社株買い、増配期待など）
5. risks: 【注意すべきリスク要因】（景気敏感度、原材料高、顧客依存度などの留意点）

必ず以下のキー名を持つ有効なJSON形式のみを出力してください。マークダウンや余計な文は含めないでください。
{
  "business_summary": "...",
  "valuation_appeal": "...",
  "dividend_sustainability": "...",
  "catalyst": "...",
  "risks": "..."
}`;

    try {
      let success = false;
      const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
      for (const model of modelsToTry) {
        if (success) break;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const res = await ai.models.generateContent({
              model,
              contents: prompt,
              config: { responseMimeType: 'application/json' },
            });
            const parsed = JSON.parse(res.text?.trim() || '{}');
            if (parsed && (parsed.business_summary || parsed.valuation_appeal)) {
              diagnosisMap[s.code] = {
                code: s.code,
                name: s.name,
                diagnosisDate: new Date().toISOString().split('T')[0],
                diagnosis: parsed,
              };
              console.log(`✅ Analyzed [${s.code}] ${s.name} using ${model}`);
              fs.writeFileSync(AI_FILE, JSON.stringify(diagnosisMap, null, 2), 'utf-8');
              success = true;
              break;
            }
          } catch (attemptErr: any) {
            console.warn(`[${model}] Attempt ${attempt + 1} failed for ${s.code}:`, attemptErr.message);
            await new Promise((r) => setTimeout(r, 1200));
          }
        }
      }
      if (!success) {
        console.warn(`Could not analyze ${s.code}`);
      }
      // Gemini 15 RPM レート制限順守のためのウェイト
      await new Promise((r) => setTimeout(r, 4200));
    } catch (e: any) {
      console.warn(`Diagnosis error for ${s.code}:`, e.message);
    }
  }

  fs.writeFileSync(AI_FILE, JSON.stringify(diagnosisMap, null, 2), 'utf-8');
  console.log(`✅ Saved AI diagnosis to ${AI_FILE}`);
}

function getJstDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
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
  // 1. 土曜日(6) or 日曜日(0)
  if (dayOfWeek === 0 || dayOfWeek === 6) return true;

  // 2. 年末年始休業 (12/31, 1/2, 1/3)
  if (month === 12 && day === 31) return true;
  if (month === 1 && (day === 2 || day === 3)) return true;

  // 3. 国民の祝日判定
  const holidays = new Set<string>();
  const addH = (m: number, dNum: number) => holidays.add(`${m}-${dNum}`);

  addH(1, 1); // 元日
  addH(1, getNthMonday(year, 1, 2)); // 成人の日
  addH(2, 11); // 建国記念の日
  addH(2, 23); // 天皇誕生日

  const shunbun = Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  addH(3, shunbun); // 春分の日

  addH(4, 29); // 昭和の日
  addH(5, 3); // 憲法記念日
  addH(5, 4); // みどりの日
  addH(5, 5); // こどもの日
  addH(7, getNthMonday(year, 7, 3)); // 海の日
  addH(8, 11); // 山の日
  addH(9, getNthMonday(year, 9, 3)); // 敬老の日

  const shubun = Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  addH(9, shubun); // 秋分の日

  addH(10, getNthMonday(year, 10, 2)); // スポーツの日
  addH(11, 3); // 文化の日
  addH(11, 23); // 勤労感謝の日

  // 振替休日判定（日曜が祝日の場合、その後の直近平日が休み）
  for (let dNum = 1; dNum <= 31; dNum++) {
    const cur = new Date(Date.UTC(year, month - 1, dNum));
    if (cur.getUTCMonth() !== month - 1) break;
    if (cur.getUTCDay() === 0 && holidays.has(`${month}-${dNum}`)) {
      let sub = dNum + 1;
      while (holidays.has(`${month}-${sub}`)) sub++;
      if (sub === day) return true;
    }
  }

  // 国民の休日判定（祝日と祝日に挟まれた平日）
  if (holidays.has(`${month}-${day - 1}`) && holidays.has(`${month}-${day + 1}`)) {
    return true;
  }

  return holidays.has(`${month}-${day}`);
}

/**
 * 卒業理由の判定
 * 株価上昇（名誉の卒業）や利回り低下・業績変化などの理由を具体的に明示
 */
function determineGraduationReason(s: StockItem): string {
  const reasons: string[] = [];

  // 1. PBR 1倍突破（株価上昇による名誉の卒業！）
  if (s.pbr != null && s.pbr > DEFAULT_CRITERIA.maxPbr) {
    reasons.push(`PBR1倍突破（株価上昇によりPBR ${s.pbr.toFixed(2)}倍）`);
  }

  // 2. 配当利回り 4%割れ
  if (s.dividend_yield != null && s.dividend_yield < DEFAULT_CRITERIA.minDividendYield) {
    if (s.pbr != null && s.pbr >= 0.95) {
      reasons.push(`利回り4%割れ（株価上昇に伴い利回り ${s.dividend_yield.toFixed(2)}%）`);
    } else {
      reasons.push(`利回り4%割れ（今期予想利回り ${s.dividend_yield.toFixed(2)}%）`);
    }
  }

  // 3. ROE 8%割れ
  if (s.roe != null && s.roe < DEFAULT_CRITERIA.minRoe) {
    reasons.push(`ROE8%割れ（実績ROE ${s.roe.toFixed(2)}%）`);
  }

  // 4. 自己資本比率 50%割れ
  if (s.equity_ratio != null && s.equity_ratio < DEFAULT_CRITERIA.minEquityRatio) {
    reasons.push(`自己資本比率50%割れ（自己資本比率 ${s.equity_ratio.toFixed(1)}%）`);
  }

  return reasons.length > 0 ? reasons.join('、') : 'スクリーニング基準未達';
}

/**
 * 最終スクリーニング合格判定（5大条件すべてをクリア）
 */
function isQualifying(s: StockItem): boolean {
  if (s.equity_ratio == null || s.equity_ratio < DEFAULT_CRITERIA.minEquityRatio) return false;
  if (s.pbr != null && s.pbr > DEFAULT_CRITERIA.maxPbr) return false;
  if (s.roe != null && s.roe < DEFAULT_CRITERIA.minRoe) return false;
  if (s.dividend_yield != null && s.dividend_yield < DEFAULT_CRITERIA.minDividendYield) return false;
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

  // 1. 既存銘柄データの読み込み（前日在籍銘柄の引き継ぎ・卒業検出用）
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

  // 2. TradingView から一次選別（取りこぼし予防のため緩めの基準）で候補銘柄を取得
  const tvCandidates = await fetchTradingViewCandidates();

  // 前日存在していた銘柄で、今回のTradingView候補に含まれなかった銘柄も調査対象に統合
  // （前日銘柄の卒業理由を最新データで正確に特定するため）
  const candidateCodeSet = new Set(tvCandidates.map((c) => c.code));
  const missingPreviousStocks = existingStocks.filter((s) => !candidateCodeSet.has(s.code));
  const baseList: StockItem[] = [...tvCandidates, ...missingPreviousStocks];

  if (baseList.length === 0) {
    console.log('No candidates fetched and no existing stocks.');
    return;
  }

  // 3. みんかぶ (minkabu) から PER(調整後)、PBR、配当利回り、自己資本率、ROE を正確に取得して上書き
  const enriched = await enrichWithMarketForecasts(baseList);

  // 4. 滞在日数 (stayDays) の計算フラグ
  const todayStr = jstNow.dateStr;
  const shouldIncrementStayDays = isMarketOpenToday && prevLastIncrementDate !== todayStr;
  console.log(`⏳ StayDays Increment Mode: ${shouldIncrementStayDays ? '+1 (営業日の初回実行)' : '維持 (休日または同日再実行のため加算なし)'}`);

  // 滞在日数の補正（entryDate に基づく正規化: 2026-09-25なら1、2026-09-24なら2、それ以外は3）
  function normalizeStayDays(entryDate: string | undefined, defaultDays: number): number {
    if (entryDate === '2026-09-25') return 1;
    if (entryDate === '2026-09-24') return 2;
    if (entryDate) return 3;
    return defaultDays;
  }

  // 5. 最終選別 & 卒業検出 & 卒業後の再転入判定
  const activeStocks: StockItem[] = [];
  const graduatedStocks: StockItem[] = [];

  for (const s of enriched) {
    const prev = existingMap.get(s.code);
    const passes = isQualifying(s);

    if (passes) {
      // スクリーニング条件をクリアしている銘柄
      if (prev && prev.category === 'sotsugyo') {
        // ★ 卒業後の再転入！
        console.log(`🎉 再転入検出: [${s.code}] ${s.name} が再びスクリーニング条件をクリアして再転入しました！`);
        activeStocks.push({
          ...s,
          category: 'tennyu',
          stayDays: 1,
          entryDate: todayStr,
          lastIncrementDate: isMarketOpenToday ? todayStr : undefined,
          graduationDate: undefined,
          graduationReason: undefined,
          graduationPrice: undefined,
          graduationReturn: undefined,
        });
      } else if (prev) {
        // 在籍継続（entryDate補正適用）
        const effectiveEntryDate = prev.entryDate || todayStr;
        const stayDays = normalizeStayDays(
          effectiveEntryDate,
          shouldIncrementStayDays ? (prev.stayDays || 0) + 1 : (prev.stayDays || 1)
        );
        const lastIncrementDate = shouldIncrementStayDays ? todayStr : (prev.lastIncrementDate || prevLastIncrementDate);
        const category: StockItem['category'] = stayDays >= 90 ? 'inokori' : 'tennyu';
        activeStocks.push({
          ...s,
          stayDays,
          category,
          entryDate: effectiveEntryDate,
          lastIncrementDate,
          graduationDate: undefined,
          graduationReason: undefined,
        });
      } else {
        // 新規転入生
        activeStocks.push({
          ...s,
          stayDays: 1,
          category: 'tennyu',
          entryDate: todayStr,
          lastIncrementDate: isMarketOpenToday ? todayStr : undefined,
        });
      }
    } else {
      // スクリーニング条件を満たさなくなった、または満たしていない銘柄
      if (prev && prev.category !== 'sotsugyo') {
        // ★ 前日在籍していたが、今日は条件落ち → 新規卒業！
        const reason = determineGraduationReason(s);
        console.log(`🎓 卒業検出: [${s.code}] ${s.name} (理由: ${reason})`);
        const effectiveEntryDate = prev.entryDate || todayStr;
        const stayDays = normalizeStayDays(effectiveEntryDate, prev.stayDays || 1);
        graduatedStocks.push({
          ...s,
          category: 'sotsugyo',
          stayDays,
          entryDate: effectiveEntryDate,
          graduationDate: todayStr,
          graduationReason: reason,
          graduationPrice: s.close || prev.close,
          graduationReturn: 0,
        });
      } else if (prev && prev.category === 'sotsugyo') {
        // 過去に卒業した卒業生の継続追跡（最新株価・リターンを更新）
        const gradPrice = prev.graduationPrice || prev.close || s.close;
        let gradReturn: number | undefined = prev.graduationReturn;
        if (gradPrice && s.close) {
          gradReturn = Number((((s.close - gradPrice) / gradPrice) * 100).toFixed(2));
        }
        const stayDays = normalizeStayDays(prev.entryDate, prev.stayDays || 3);
        graduatedStocks.push({
          ...s,
          category: 'sotsugyo',
          stayDays,
          entryDate: prev.entryDate,
          graduationDate: prev.graduationDate || todayStr,
          graduationReason: prev.graduationReason || determineGraduationReason(s),
          graduationPrice: gradPrice,
          graduationReturn: gradReturn,
        });
      }
      // 前日に存在せず、条件も満たさない場合はリストに含めない
    }
  }

  // 6. 銘柄リストの統合（在籍銘柄 + 卒業生）
  const finalStocks = [...activeStocks, ...graduatedStocks];
  console.log(`🎯 Active stocks: ${activeStocks.length}, Graduated stocks: ${graduatedStocks.length}, Total: ${finalStocks.length}`);

  // 7. JSON に保存
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

  // 8. AI診断（土曜定期更新、明示的な--with-ai指定、または未診断データがある場合に自動生成）
  const withAi = process.argv.includes('--with-ai') || process.env.SATURDAY_DIAGNOSIS === 'true';
  const hasEmptyAiFile = !fs.existsSync(AI_FILE) || fs.readFileSync(AI_FILE, 'utf-8').trim() === '{}' || fs.readFileSync(AI_FILE, 'utf-8').trim() === '';
  if ((withAi || hasEmptyAiFile) && process.env.GEMINI_API_KEY) {
    console.log(`🤖 Triggering AI Diagnosis (withAi=${withAi}, hasEmptyAiFile=${hasEmptyAiFile})...`);
    await generateAiDiagnosis(finalStocks);
  } else if (!process.env.GEMINI_API_KEY) {
    console.log('ℹ️ GEMINI_API_KEY is not set. Skipping AI diagnosis.');
  }
}

main().catch((err) => {
  console.error('Fatal error during screening:', err);
  process.exit(1);
});
