import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yahooFinance from 'yahoo-finance2';
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

async function fetchTradingViewCandidates(): Promise<StockItem[]> {
  console.log('📡 Fetching candidate stocks from TradingView...');
  const payload = {
    filter: [
      { left: 'market_cap_basic', operation: 'nempty' },
      { left: 'type', operation: 'equal', right: 'stock' },
      { left: 'subtype', operation: 'in_range', right: ['common'] },
      // ① TradingViewから取得する条件:
      // PBR 1.3以下
      { left: 'price_book_fq', operation: 'less', right: 1.3 },
      // ROE 7.4以上
      { left: 'return_on_equity_fq', operation: 'egreater', right: 7.4 },
      // 配当利回り 3.7以上
      { left: 'dividends_yield', operation: 'egreater', right: 3.7 },
      // EBITDA成長率 -10以上
      { left: 'ebitda_yoy_growth_fy', operation: 'egreater', right: -10 },
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
      const cleanName = normalizeCompanyName(code, rawName);
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

      // 自己資本比率のみ判定: TradingViewクエリで直接指定できないため総資産・負債から算出（47%以上）
      // ※ PBR(<=1.3), ROE(>=7.4), 配当利回り(>=3.7), EBITDA成長率(>=-10) はTradingView取得クエリで絞込済みのため、ここでの2重判定は行わない
      if (equityRatio == null || equityRatio < 47.0) continue;

      const pbrVal = pbr != null ? Number(pbr.toFixed(2)) : null;
      const category: StockItem['category'] =
        pbrVal != null && pbrVal > 1.20
          ? 'sotsugyo'
          : pbrVal != null && pbrVal > 1.00
          ? 'shokaku'
          : 'wariyasu';

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
        category,
        stayDays: 1,
        entryDate: new Date().toISOString().split('T')[0],
      });
    }

    console.log(`✅ Filtered ${candidates.length} candidates from TradingView (PBR<=1.3, ROE>=7.4, 利回り>=3.7, EBITDA>=-10, 自己資本>=47%).`);
    return candidates;
  } catch (err) {
    console.warn('⚠️ TradingView fetch failed:', err);
    return [];
  }
}

interface MinkabuData {
  name?: string | null;
  per: number | null;
  pbr: number | null;
  dividendYield: number | null;
  equityRatio: number | null;
  roe: number | null;
}

/**
 * みんかぶ (minkabu.jp) から最新社名・主要ファンダメンタルズ指標を取得
 * - 銘柄トップ (https://minkabu.jp/stock/{code}): 最新社名(オカムラ、東海理化等), PER(調整後), PBR, 配当利回り
 * - 決算ページ (https://minkabu.jp/stock/{code}/settlement): 自己資本率, ROE
 */
async function fetchMinkabuData(code: string): Promise<MinkabuData> {
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };

  let name: string | null = null;
  let per: number | null = null;
  let pbr: number | null = null;
  let dividendYield: number | null = null;
  let equityRatio: number | null = null;
  let roe: number | null = null;

  // 1. 銘柄トップページ (最新社名, PER(調整後), PBR, 配当利回り)
  try {
    const resTop = await fetch(`https://minkabu.jp/stock/${code}`, { headers });
    if (resTop.ok) {
      const htmlTop = await resTop.text();

      // 最新銘柄名（TradingViewの旧社名「岡村製作所」→「オカムラ」等を解決）
      const titleMatch = htmlTop.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch) {
        const m = titleMatch[1].match(/^(.+?)\s*[(（]\s*[0-9A-Za-z]+\s*[)）]/);
        if (m && m[1].trim()) {
          name = m[1].trim();
        }
      }

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

  return { name, per, pbr, dividendYield, equityRatio, roe };
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
      // 2. みんかぶ (minkabu) から 最新社名、PER(調整後)、PBR、配当利回り、自己資本率、ROE を正確に取得
      const minkabu = await fetchMinkabuData(s.code);
      if (minkabu.name) {
        s.name = minkabu.name;
      }
      s.name = normalizeCompanyName(s.code, s.name);
      if (minkabu.per != null && minkabu.per > 0) s.per = minkabu.per;
      if (minkabu.pbr != null && minkabu.pbr > 0) s.pbr = minkabu.pbr;
      if (minkabu.dividendYield != null && minkabu.dividendYield >= 0) s.dividend_yield = minkabu.dividendYield;
      if (minkabu.equityRatio != null && minkabu.equityRatio > 0) s.equity_ratio = minkabu.equityRatio;
      if (minkabu.roe != null) s.roe = minkabu.roe;
    } catch {
      // 取得失敗時はTradingViewの値をそのまま保持
      s.name = normalizeCompanyName(s.code, s.name);
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

/**
 * 2つの 'YYYY-MM-DD' 日付間のカレンダー日数（差分日数）を計算
 * 例: 2026-10-10 (土) と 2026-10-05 (月) -> 5
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

  // 診断が必要な銘柄を特定
  const targetsToDiagnose: { stock: StockItem; reason: string }[] = [];

  for (const s of stocks) {
    const existing = diagnosisMap[s.code];
    const hasValidDiagnosis = !!(existing && existing.diagnosis?.business_summary);

    if (forceAi) {
      targetsToDiagnose.push({ stock: s, reason: '全銘柄強制再生成 (--force-ai)' });
      continue;
    }

    // ① 新たに追加された銘柄は、その日にAI診断を生成
    if (newlyAddedCodes.has(s.code)) {
      targetsToDiagnose.push({ stock: s, reason: '新規追加銘柄（当日即時生成）' });
      continue;
    }

    // ② まだ一度も診断されていない銘柄
    if (!hasValidDiagnosis) {
      targetsToDiagnose.push({ stock: s, reason: '未診断銘柄' });
      continue;
    }

    // ③ 土曜のAI診断は、既に生成済みでも6日以上経過（月曜生成を含む）していたら再生成
    // ※ 現在アクティブ（割安組・昇格組）な銘柄を対象
    if (isSaturday && (s.category === 'wariyasu' || s.category === 'shokaku')) {
      const prevDate = existing.diagnosisDate;
      if (!prevDate) {
        targetsToDiagnose.push({ stock: s, reason: '土曜定期: 過去診断日不明のため再生成' });
        continue;
      }
      const diffDays = getCalendarDayDiff(todayStr, prevDate);
      const elapsedDays = diffDays + 1; // 初日算入の経過日数 (月曜から土曜なら 6日目)
      if (diffDays >= 5) { // 5日差以上 = 6日目以降（月曜・日曜・前週土曜など）
        targetsToDiagnose.push({
          stock: s,
          reason: `土曜定期: 前回診断(${prevDate})から${elapsedDays}日目(差分${diffDays}日)>=6日のため再生成`,
        });
        continue;
      } else {
        console.log(`⏩ [${s.code}] ${s.name}: 前回診断(${prevDate})から${elapsedDays}日目 (<6日) のため土曜再生成スキップ（キャッシュ維持）`);
        continue;
      }
    }

    // 平日で新規でもなく、既に診断済みの場合はキャッシュ維持
  }

  if (targetsToDiagnose.length === 0) {
    console.log(`✨ 本日AI診断が必要な銘柄はありません（全銘柄最新・キャッシュ有効）。Gemini API呼び出しをスキップします。`);
    return;
  }

  console.log(`🤖 AI診断を実行します: 対象 ${targetsToDiagnose.length} 銘柄 / 全 ${stocks.length} 銘柄 (土曜判定: ${isSaturday})`);
  for (const { stock: s, reason } of targetsToDiagnose) {
    console.log(`▶ [${s.code}] ${s.name}: ${reason}`);
  }

  for (const { stock: s } of targetsToDiagnose) {
    console.log(`Analyzing [${s.code}] ${s.name}...`);
    const prompt = `あなたは辛口で深い洞察力を持つプロの株式アナリストです。
バリュー株スクリーニングした銘柄の定性情報が欲しい。数値を単純に説明しないこと。
指標（PER・PBR・配当利回り等の数値）の機械的な読み上げは一切不要です。画面上の数値を見ればわかる情報ではなく、企業の事業実態、業界構造、市場の懸念や心理、構造変化に踏み込んだ定性的な深い洞察を鋭く提供してください。

【対象銘柄】
・証券コード: ${s.code}
・銘柄名: ${s.name}
・予想配当利回り: ${s.dividend_yield != null ? `${s.dividend_yield}%` : '不明'}
・実績PER: ${s.per != null ? `${s.per}倍` : '不明'}
・実績PBR: ${s.pbr != null ? `${s.pbr}倍` : '不明'}
・配当性向: ${s.payout_ratio != null ? `${s.payout_ratio}%` : '不明'}
・ROE: ${s.roe != null ? `${s.roe}%` : '不明'}
・自己資本比率: ${s.equity_ratio != null ? `${s.equity_ratio}%` : '不明'}
・EBITDA成長率: ${s.ebitda_growth != null ? `${s.ebitda_growth}%` : '不明'}
・D/Eレシオ: ${s.de_ratio != null ? `${s.de_ratio}倍` : '不明'}
・流動比率: ${s.current_ratio != null ? `${s.current_ratio}%` : '不明'}

【出力要件】
以下の5つの項目について、定性的な洞察を具体的かつ辛口で鋭く解説し、必ず指定のキー名を持つJSONオブジェクトとして出力してください。
1. "business_summary": 何をやっている会社か（事業紹介や特色、何で稼いでるか端的な一行で）
2. "undervalued_reason": なぜ今安く放置されているのか（市場の懸念、PBRが低い理由。数値を単純に説明しないこと）
3. "contrarian_appeal": それでも魅力的な理由（逆張りポイント）
4. "revaluation_scenario": 再評価シナリオ（何が起きたら株価が見直されるか）
5. "max_risk": 最大リスク（1つに絞る）

JSON形式例:
{
  "business_summary": "何をやっている会社かを端的な一行で",
  "undervalued_reason": "なぜ今安く放置されているのか（市場の懸念、PBRが低い理由）",
  "contrarian_appeal": "それでも魅力的な理由（逆張りポイント）",
  "revaluation_scenario": "再評価シナリオ（何が起きたら株価が見直されるか）",
  "max_risk": "最大リスク（1つに絞る）"
}`;

    try {
      let success = false;
      const modelsToTry = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
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
                  // 従来キー互換保持
                  valuation_appeal: parsed.undervalued_reason || parsed.valuation_appeal || '',
                  dividend_sustainability: parsed.contrarian_appeal || parsed.dividend_sustainability || '',
                  catalyst: parsed.revaluation_scenario || parsed.catalyst || '',
                  risks: parsed.max_risk || parsed.risks || '',
                },
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
 * 卒業理由の判定（株価上昇によりPBR1.2倍突破した名誉の卒業）
 */
function determineGraduationReason(s: StockItem): string {
  const pbrVal = s.pbr != null ? Number(s.pbr.toFixed(2)) : null;
  if (pbrVal != null && pbrVal > 1.20) {
    return `PBR1.2倍超達成（株価上昇によりPBR ${pbrVal.toFixed(2)}倍）`;
  }
  return 'PBR1.2倍超達成（名誉の卒業）';
}

/**
 * 脱落理由の判定（利回り低下・減配・ROE低下・財務悪化などによる脱落）
 */
function determineDropoutReason(s: StockItem): string {
  const reasons: string[] = [];

  // 1. 配当利回り 3.8%割れ
  if (s.dividend_yield != null && s.dividend_yield < 3.8) {
    reasons.push(`利回り3.8%割れ（予想利回り ${s.dividend_yield.toFixed(2)}%）`);
  }

  // 2. ROE 7.5%割れ
  if (s.roe != null && s.roe < 7.5) {
    reasons.push(`ROE7.5%割れ（実績ROE ${s.roe.toFixed(2)}%）`);
  }

  // 3. 自己資本比率 48%割れ（財務悪化）
  if (s.equity_ratio != null && s.equity_ratio < 48.0) {
    reasons.push(`自己資本比率48%割れ（財務悪化 ${s.equity_ratio.toFixed(1)}%）`);
  }

  // 4. EBITDA成長率 -10%割れ
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
 * ② みんかぶ値取得後の合格判定
 * PBR ≦ 1.20（1.20以下。1.20ちょうどは合格）, ROE ≧ 7.5, 配当利回り ≧ 3.8, 自己資本比率 ≧ 48.0, EBITDA成長率 ≧ -10
 */
function isQualifyingActive(s: StockItem): boolean {
  if (s.equity_ratio == null || s.equity_ratio < 48.0) return false;
  // PBR ≦ 1.20（1.20以下。画面の「PBR≦1.2倍」に合致。1.20ちょうどの銘柄も昇格組に残る）
  const pbrVal = s.pbr != null ? Number(s.pbr.toFixed(2)) : null;
  if (pbrVal != null && pbrVal > 1.20) return false;
  if (s.roe != null && s.roe < 7.5) return false;
  if (s.dividend_yield != null && s.dividend_yield < 3.8) return false;
  if (s.ebitda_growth != null && s.ebitda_growth < -10.0) return false;
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
  const forceIncrement = process.argv.includes('--force-increment');
  const shouldIncrementStayDays = forceIncrement || (isMarketOpenToday && prevLastIncrementDate !== todayStr);
  console.log(`⏳ StayDays Increment Mode: ${shouldIncrementStayDays ? '+1 (営業日の初回実行または強制実行)' : '維持 (休日または同日再実行のため加算なし)'}`);

  // 5. 最終選別 & 組み分け（割安組 / 昇格組 / 卒業生 / 脱落者）
  const activeStocks: StockItem[] = [];
  const graduatedStocks: StockItem[] = [];
  const dropoutStocks: StockItem[] = [];
  const newlyAddedCodes = new Set<string>();

  for (const s of enriched) {
    const prev = existingMap.get(s.code);
    const passes = isQualifyingActive(s);

    if (passes) {
      // 基準クリア銘柄: PBRにより「割安組（PBR ≦ 1.0）」または「昇格組（1.0 < PBR ≦ 1.2）」に配属
      const pbrVal = s.pbr != null ? Number(s.pbr.toFixed(2)) : null;
      const targetCategory: 'wariyasu' | 'shokaku' =
        pbrVal != null && pbrVal <= 1.00 ? 'wariyasu' : 'shokaku';

      if (prev && (prev.category === 'sotsugyo' || prev.category === 'datsuraku')) {
        // ★ 卒業・脱落からの再転入！
        console.log(`🎉 再転入検出: [${s.code}] ${s.name} が再びスクリーニング条件をクリアして${targetCategory === 'wariyasu' ? '割安組' : '昇格組'}に転入しました！`);
        newlyAddedCodes.add(s.code);
        activeStocks.push({
          ...s,
          category: targetCategory,
          stayDays: 1, // 新組での滞在日数は1から
          entryDate: todayStr,
          groupEntryDate: todayStr,
          lastIncrementDate: isMarketOpenToday ? todayStr : undefined,
          graduationDate: undefined,
          graduationReason: undefined,
          graduationPrice: undefined,
          graduationReturn: undefined,
          dropoutDate: undefined,
          dropoutReason: undefined,
          dropoutPrice: undefined,
          dropoutReturn: undefined,
        });
      } else if (prev) {
        // 在籍継続または組の移動（割安組 ⇄ 昇格組）
        const prevNormalizedCategory: 'wariyasu' | 'shokaku' =
          prev.category === 'shokaku'
            ? 'shokaku'
            : prev.category === 'wariyasu'
            ? 'wariyasu'
            : prev.pbr != null && Number(prev.pbr.toFixed(2)) > 1.00
            ? 'shokaku'
            : 'wariyasu';

        const isSameGroup = prevNormalizedCategory === targetCategory;
        const effectiveEntryDate = prev.entryDate || todayStr;
        const prevDays = prev.stayDays != null && prev.stayDays > 0 ? prev.stayDays : 1;

        let stayDays: number;
        let groupEntryDate: string;
        if (isSameGroup) {
          stayDays = shouldIncrementStayDays ? prevDays + 1 : prevDays;
          groupEntryDate = prev.groupEntryDate || prev.entryDate || todayStr;
        } else {
          console.log(`🔄 組の異動検出: [${s.code}] ${s.name} が ${prevNormalizedCategory} から ${targetCategory} へ移動しました！`);
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
          graduationDate: undefined,
          graduationReason: undefined,
          graduationPrice: undefined,
          graduationReturn: undefined,
          dropoutDate: undefined,
          dropoutReason: undefined,
          dropoutPrice: undefined,
          dropoutReturn: undefined,
        });
      } else {
        // 新規転入銘柄
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
    } else {
      // スクリーニング基準未達 (PBR > 1.20 または 指標未達)
      const wasActive = prev && prev.category !== 'sotsugyo' && prev.category !== 'datsuraku';

      if (wasActive) {
        const pbrVal = s.pbr != null ? Number(s.pbr.toFixed(2)) : null;
        if (pbrVal != null && pbrVal > 1.20) {
          // ★ 株価上昇による名誉の卒業！ (1年追跡)
          const reason = determineGraduationReason(s);
          console.log(`🎓 卒業検出: [${s.code}] ${s.name} (理由: ${reason})`);
          const effectiveEntryDate = prev.entryDate || todayStr;
          graduatedStocks.push({
            ...s,
            category: 'sotsugyo',
            stayDays: 1, // 正の数！1からスタート
            entryDate: effectiveEntryDate,
            groupEntryDate: todayStr,
            graduationDate: todayStr,
            graduationReason: reason,
            graduationPrice: s.close || prev.close,
            graduationReturn: 0,
          });
        } else {
          // ★ 指標悪化・基準未達による脱落！ (1年追跡)
          const reason = determineDropoutReason(s);
          console.log(`⚠️ 脱落検出: [${s.code}] ${s.name} (理由: ${reason})`);
          const effectiveEntryDate = prev.entryDate || todayStr;
          dropoutStocks.push({
            ...s,
            category: 'datsuraku',
            stayDays: 1, // 正の数！1からスタート
            entryDate: effectiveEntryDate,
            groupEntryDate: todayStr,
            dropoutDate: todayStr,
            dropoutReason: reason,
            dropoutPrice: s.close || prev.close,
            dropoutReturn: 0,
          });
        }
      } else if (prev && prev.category === 'sotsugyo') {
        // 過去の卒業生の継続追跡（1年追跡）
        const gradDate = prev.graduationDate || todayStr;
        if (isWithinOneYear(gradDate, todayStr)) {
          const gradPrice = prev.graduationPrice || prev.close || s.close;
          let gradReturn: number | undefined = prev.graduationReturn;
          if (gradPrice && s.close) {
            gradReturn = Number((((s.close - gradPrice) / gradPrice) * 100).toFixed(2));
          }
          const prevDays = prev.stayDays ? Math.abs(prev.stayDays) : 1;
          const stayDays = shouldIncrementStayDays ? prevDays + 1 : prevDays; // 正の数！+1ずつ加算
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
        } else {
          console.log(`⌛ 卒業生 1年追跡期間終了: [${prev.code}] ${prev.name}`);
        }
      } else if (prev && prev.category === 'datsuraku') {
        // 過去の脱落者の継続追跡（1年追跡）
        const dropDate = prev.dropoutDate || prev.graduationDate || todayStr;
        if (isWithinOneYear(dropDate, todayStr)) {
          const dropPrice = prev.dropoutPrice || prev.graduationPrice || prev.close || s.close;
          let dropReturn: number | undefined = prev.dropoutReturn ?? prev.graduationReturn;
          if (dropPrice && s.close) {
            dropReturn = Number((((s.close - dropPrice) / dropPrice) * 100).toFixed(2));
          }
          const prevDays = prev.stayDays ? Math.abs(prev.stayDays) : 1;
          const stayDays = shouldIncrementStayDays ? prevDays + 1 : prevDays; // 正の数！+1ずつ加算
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
        } else {
          console.log(`⌛ 脱落者 1年追跡期間終了: [${prev.code}] ${prev.name}`);
        }
      }
    }
  }

  // 6. 銘柄リストの統合（在籍銘柄 + 卒業生 + 脱落者）
  const finalStocks = [...activeStocks, ...graduatedStocks, ...dropoutStocks];
  console.log(`🎯 Active stocks: ${activeStocks.length} (割安: ${activeStocks.filter((s) => s.category === 'wariyasu').length}, 昇格: ${activeStocks.filter((s) => s.category === 'shokaku').length}), Graduated: ${graduatedStocks.length}, Dropped: ${dropoutStocks.length}, Total: ${finalStocks.length}`);

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

  // 8. AI診断
  // ・新規追加銘柄は当日に自動生成
  // ・土曜は6日以上経過銘柄を再生成
  // ・未診断銘柄、または明示的なフラグ指定時（--with-ai, --force-ai）
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
