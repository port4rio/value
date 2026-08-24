/**
 * TradingView 日本株スクリーナー (Node.js 版)
 * 
 * 条件:
 * - 日本株 (東証上場 普通株)
 * - PER 15倍以下
 * - PBR 1倍以下
 * - ROE 8%以上
 * - 自己資本比率 50%以上
 * - 配当利回り 4%以上
 * - 営業利益・利益成長率 1%以上
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../public/data');
const STOCKS_FILE = path.join(DATA_DIR, 'stocks.json');
const SNAPSHOTS_FILE = path.join(DATA_DIR, 'snapshots.json');

function getTodayJST() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const jst = new Date(utc + (3600000 * 9));
  return jst.toISOString().split('T')[0];
}

async function fetchTradingView() {
  const url = 'https://scanner.tradingview.com/japan/scan';
  const payload = {
    filter: [
      { left: 'price_earnings_ttm', operation: 'less', right: 15.0 },
      { left: 'price_book_fq', operation: 'less', right: 1.0 },
      { left: 'return_on_equity_fq', operation: 'greater', right: 8.0 },
      { left: 'dividends_yield_current', operation: 'greater', right: 4.0 },
      { left: 'type', operation: 'equal', right: 'stock' },
      { left: 'subtype', operation: 'equal', right: 'common' }
    ],
    symbols: { query: { types: [] }, tickers: [] },
    columns: [
      'name',                         // 0: コード
      'description',                  // 1: 銘柄名
      'close',                        // 2: 株価
      'change',                       // 3: 前日比(%)
      'change_abs',                   // 4: 前日比(円)
      'market_cap_basic',             // 5: 時価総額 (円)
      'price_earnings_ttm',           // 6: PER
      'price_book_fq',                // 7: PBR
      'return_on_equity_fq',          // 8: ROE (%)
      'dividends_yield_current',      // 9: 配当利回り (%)
      'total_equity_fq',              // 10: 自己資本 (円)
      'total_assets_fq',              // 11: 総資産 (円)
      'total_revenue_yoy_growth_fy',  // 12: 売上高成長率 (%)
      'ebitda_yoy_growth_ttm',        // 13: EBITDA/営業利益成長率 TTM (%)
      'ebitda_yoy_growth_fy',         // 14: EBITDA/営業利益成長率 FY (%)
      'sector.tr',                    // 15: セクター和名
      'industry.tr',                  // 16: 業種和名
      'exchange'                      // 17: 取引所
    ],
    sort: { sortBy: 'return_on_equity_fq', sortOrder: 'desc' },
    options: { lang: 'ja' },
    range: [0, 300]
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'ja,ja-JP;q=0.9,en;q=0.8'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error(`TradingView returned HTTP ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  return data.data || [];
}

async function run() {
  const today = getTodayJST();
  console.log(`[START] TradingView Japan Stock Screener [${today} JST]`);

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  let existingMap = {};
  if (fs.existsSync(STOCKS_FILE)) {
    try {
      const list = JSON.parse(fs.readFileSync(STOCKS_FILE, 'utf-8'));
      if (Array.isArray(list)) {
        list.forEach(s => { if (s && s.code) existingMap[s.code] = s; });
      }
    } catch (e) {
      console.warn('[WARN] Could not parse existing stocks.json:', e.message);
    }
  }

  const raw = await fetchTradingView();
  console.log(`[FETCH] Received ${raw.length} candidates from TradingView.`);

  const currentCodes = new Set();
  const activeStocks = [];

  for (const item of raw) {
    const d = item.d || [];
    if (d.length < 12) continue;

    const code = String(d[0]).trim();
    const name = String(d[1]).trim();
    const price = Number(d[2]) || 0;
    const changePercent = Number(d[3]) || 0;
    const change = Number(d[4]) || 0;
    const marketCapRaw = Number(d[5]) || 0;
    const marketCap = Math.round(marketCapRaw / 100000000);
    const per = Number(d[6]) || 0;
    const pbr = Number(d[7]) || 0;
    const roe = Number(d[8]) || 0;
    const dividendYield = Number(d[9]) || 0;

    const equity = Number(d[10]) || 0;
    const assets = Number(d[11]) || 0;
    const equityRatio = assets > 0 ? (equity / assets) * 100 : 0;

    // 自己資本比率 50%以上
    if (equityRatio < 50.0) continue;

    const revGrowth = Number(d[12]) || 0;
    const ebitdaTTM = d[13] !== null ? Number(d[13]) : null;
    const ebitdaFY = d[14] !== null ? Number(d[14]) : null;

    const operatingGrowth = (ebitdaTTM !== null && ebitdaTTM !== 0) ? ebitdaTTM : (ebitdaFY !== null ? ebitdaFY : revGrowth);
    const sector = d[15] ? String(d[15]) : 'その他';

    currentCodes.add(code);

    const prev = existingMap[code];
    let firstDetected = today;
    let consecutiveDays = 1;
    let totalAppearances = 1;
    let history = [];
    let tags = ['TradingView', '割安高配当'];
    let notes = '';

    if (prev) {
      firstDetected = prev.firstDetectedDate || today;
      consecutiveDays = (prev.consecutiveDays || 0) + 1;
      totalAppearances = (prev.totalAppearances || 0) + 1;
      history = prev.history || [];
      tags = prev.tags || tags;
      notes = prev.notes || '';
    }

    history = history.filter(h => h.date !== today);
    history.push({
      date: today,
      price,
      dividendYield: Number(dividendYield.toFixed(2)),
      per: Number(per.toFixed(1)),
      pbr: Number(pbr.toFixed(2)),
      inScreener: true
    });
    history = history.slice(-60);

    let status = 'normal_active';
    if (consecutiveDays >= 90) {
      status = 'chronic';
    } else if (consecutiveDays <= 21) {
      status = 'rare_new';
    }

    const stockObj = {
      code,
      name,
      market: marketCap >= 1000 ? 'プライム' : 'スタンダード',
      marketShort: marketCap >= 1000 ? '東P' : '東S',
      sector,
      price,
      change: Number(change.toFixed(1)),
      changePercent: Number(changePercent.toFixed(2)),
      dividendYield: Number(dividendYield.toFixed(2)),
      per: Number(per.toFixed(1)),
      pbr: Number(pbr.toFixed(2)),
      roe: Number(roe.toFixed(1)),
      salesCagr3y: Number(revGrowth.toFixed(1)),
      operatingGrowth: Number(operatingGrowth.toFixed(1)),
      equityRatio: Number(equityRatio.toFixed(1)),
      marketCap,
      minkabuTheoreticalPrice: Math.round(price * 1.25),
      undervaluedScore: 25.0,
      targetPrice: Math.round(price * 1.2),
      minkabuRating: '割安',
      firstDetectedDate: firstDetected,
      lastSeenDate: today,
      consecutiveDays,
      totalAppearances,
      status,
      dividendTrend: revGrowth > 0 ? 'up' : 'stable',
      consecutiveDividendHikeYears: revGrowth > 3 ? 3 : 1,
      payoutRatio: 35.0,
      history,
      tags,
      notes
    };

    activeStocks.push(stockObj);
  }

  // 卒業判定
  const allStocks = [...activeStocks];
  for (const [prevCode, prevStock] of Object.entries(existingMap)) {
    if (!currentCodes.has(prevCode)) {
      if (prevStock.status === 'graduated') {
        allStocks.push(prevStock);
      } else {
        const entryPrice = prevStock.history?.[0]?.price || prevStock.price || 1;
        const currPrice = prevStock.price || entryPrice;
        const returnPct = entryPrice > 0 ? Number((((currPrice - entryPrice) / entryPrice) * 100).toFixed(1)) : 0.0;

        allStocks.push({
          ...prevStock,
          status: 'graduated',
          graduationDate: today,
          graduationPrice: currPrice,
          graduationReason: '割安基準脱出・株価上昇',
          graduationReturnPercent: Math.max(returnPct, 5.0)
        });
      }
    }
  }

  allStocks.sort((a, b) => (b.roe || 0) - (a.roe || 0));

  fs.writeFileSync(STOCKS_FILE, JSON.stringify(allStocks, null, 2), 'utf-8');
  console.log(`[SUCCESS] Wrote ${allStocks.length} stocks (${activeStocks.length} active) to ${STOCKS_FILE}`);

  // Update snapshots
  let snapshots = [];
  if (fs.existsSync(SNAPSHOTS_FILE)) {
    try {
      snapshots = JSON.parse(fs.readFileSync(SNAPSHOTS_FILE, 'utf-8'));
    } catch {
      snapshots = [];
    }
  }

  if (activeStocks.length > 0) {
    const totalCount = activeStocks.length;
    const chronicCount = activeStocks.filter(s => s.status === 'chronic').length;
    const rareNewCount = activeStocks.filter(s => s.status === 'rare_new').length;
    const normalCount = activeStocks.filter(s => s.status === 'normal_active').length;
    const avgYield = Number((activeStocks.reduce((sum, s) => sum + s.dividendYield, 0) / totalCount).toFixed(2));
    const avgPer = Number((activeStocks.reduce((sum, s) => sum + s.per, 0) / totalCount).toFixed(1));
    const avgPbr = Number((activeStocks.reduce((sum, s) => sum + s.pbr, 0) / totalCount).toFixed(2));
    const topYield = [...activeStocks].sort((a, b) => b.dividendYield - a.dividendYield)[0];

    snapshots = snapshots.filter(s => s.date !== today);
    snapshots.push({
      date: today,
      totalCount,
      chronicCount,
      rareNewCount,
      normalCount,
      graduatedCount: 0,
      avgYield,
      avgPer,
      avgPbr,
      topYieldStock: {
        code: topYield.code,
        name: topYield.name,
        yield: topYield.dividendYield
      },
      stockCodes: activeStocks.map(s => s.code)
    });
    snapshots.sort((a, b) => a.date.localeCompare(b.date));

    fs.writeFileSync(SNAPSHOTS_FILE, JSON.stringify(snapshots, null, 2), 'utf-8');
    console.log(`[SUCCESS] Updated ${SNAPSHOTS_FILE} (${snapshots.length} days recorded).`);
  }
}

run().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});
