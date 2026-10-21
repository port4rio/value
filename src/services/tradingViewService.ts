import { StockItem, ScreeningCriteria, DEFAULT_CRITERIA } from '../types';
import { INITIAL_STOCKS } from '../data/initialStocks';
import { fetchYFinanceQuotes, YFinanceQuote } from './yfinanceService';
import { normalizeCompanyName } from '../data/companyNames';

const CACHE_KEY = 'value_stocks_screener_cache_v2';
const CACHE_TIME_KEY = 'value_stocks_screener_time_v2';

// 過去の古いモックデータキャッシュを確実にクリア
try {
  localStorage.removeItem('value_stocks_screener_cache');
  localStorage.removeItem('value_stocks_screener_time');
} catch {
  // ignore
}

/**
 * 銘柄リストに yfinance の最新データ（予想PER、配当利回り、現在値等）をマージ
 */
function enrichStocksWithYFinance(
  stocks: StockItem[],
  yfinanceMap: Record<string, YFinanceQuote>
): StockItem[] {
  return stocks.map((stock) => {
    const yf = yfinanceMap[stock.code];
    if (!yf) return stock;

    return {
      ...stock,
      // 会社予想PER (forwardPE) を優先、なければ元の値
      per: yf.per ?? stock.per,
      // 直近株価と前日比を反映
      close: yf.price ?? stock.close,
      change: yf.changePercent ?? stock.change,
    };
  });
}

/**
 * スクリーニング条件を適用（5大基準: PBR, 配当利回り, ROE, EBITDA成長率, 自己資本比率）
 * ※ PERは参考指標として保持し、スクリーニング条件からは撤廃
 */
export function applyScreeningCriteria(
  stocks: StockItem[],
  criteria: ScreeningCriteria
): StockItem[] {
  return stocks.filter((s) => {
    // 卒業生・脱落者はスクリーニング条件外として保持（各タブで追跡）
    if (s.category === 'sotsugyo' || s.category === 'datsuraku') return true;

    // yfinance / みんかぶ から取得した最新配当利回りによる絞込
    if (s.dividend_yield != null && s.dividend_yield < criteria.minDividendYield) return false;

    // PBR ≦ criteria.maxPbr (デフォルト1.20以下。1.20ちょうどは合格)
    const pbrVal = s.pbr != null ? Number(s.pbr.toFixed(2)) : null;
    if (pbrVal != null && pbrVal > criteria.maxPbr) return false;
    // ROE (資本効率)
    if (s.roe != null && s.roe < criteria.minRoe) return false;
    // EBITDA成長率（指定がある場合のみ適用、-20以下や-999は不問）
    if (
      criteria.minEbitdaGrowth > -20 &&
      s.ebitda_growth != null &&
      s.ebitda_growth < criteria.minEbitdaGrowth
    ) {
      return false;
    }
    // 自己資本比率
    if (s.equity_ratio != null && s.equity_ratio < criteria.minEquityRatio) return false;

    return true;
  });
}

export interface ScreeningResult {
  stocks: StockItem[];
  allCandidates: StockItem[];
  isLive: boolean;
  error?: string;
  timestamp: string;
}

export async function fetchScreeningStocks(
  criteria: ScreeningCriteria = DEFAULT_CRITERIA
): Promise<ScreeningResult> {
  // 1. 静的ホスティング（GitHub Pages等）向け: public/data/stocks.json があれば優先読み込み
  const baseUrl = (import.meta as any).env?.BASE_URL || './';
  const candidatePaths = [
    `${baseUrl}data/stocks.json`.replace(/\/+/g, '/'),
    './data/stocks.json',
    'data/stocks.json',
  ];

  for (const path of candidatePaths) {
    try {
      const staticRes = await fetch(path, { cache: 'no-cache' });
      if (staticRes.ok) {
        const staticData = await staticRes.json();
        if (staticData && Array.isArray(staticData.stocks) && staticData.stocks.length > 0) {
          const normalizedStocks = staticData.stocks.map((s: StockItem) => ({
            ...s,
            name: normalizeCompanyName(s.code, s.name),
          }));
          const screened = applyScreeningCriteria(normalizedStocks, criteria);
          return {
            stocks: screened,
            allCandidates: normalizedStocks,
            isLive: true,
            timestamp: staticData.updatedAt || 'バッチ更新データ',
          };
        }
      }
    } catch {
      // try next path
    }
  }

  try {
    // TradingView からファンダメンタルズ（PBR, ROE, EBITDA成長率など）の候補を取得
    // ※ PER と 配当利回りは最新情報と乖離があるため、TradingView 側で足切りせず
    // yfinance から取得した最新値を使って後段で厳格に絞り込む
    const payload = {
      filter: [
        { left: 'market_cap_basic', operation: 'nempty' },
        { left: 'type', operation: 'equal', right: 'stock' },
        { left: 'subtype', operation: 'in_range', right: ['common'] },
        { left: 'price_book_fq', operation: 'less', right: 1.3 },
        { left: 'return_on_equity_fq', operation: 'egreater', right: 7.4 },
        { left: 'ebitda_yoy_growth_fy', operation: 'egreater', right: -10 },
      ],
      options: { lang: 'ja' },
      symbols: { query: { types: [] } },
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

    let rawTradingViewStocks: StockItem[] = [];

    try {
      const response = await fetch('https://scanner.tradingview.com/japan/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.data)) {
          const initialMap = new Map<string, StockItem>(INITIAL_STOCKS.map((s) => [s.code, s]));

          // 東証(TSE)優先でソート
          const sortedRows = [...data.data].sort((a: any, b: any) => {
            const aIsTse = String(a.s || '').startsWith('TSE:');
            const bIsTse = String(b.s || '').startsWith('TSE:');
            if (aIsTse && !bIsTse) return -1;
            if (!aIsTse && bIsTse) return 1;
            return 0;
          });

          const seen = new Set<string>();
          rawTradingViewStocks = sortedRows
            .map((item: { s?: string; d: any[] }) => {
              const d = item.d;
              const ticker = String(item.s || d[0] || '');
              const code = ticker.replace(/^[A-Z]+:/, '') || String(d[0] || '');

              // 東証新証券コード規格対応: 4文字（7226, 641A, 256A, 1A00等）
              if (!/^[0-9][0-9A-Za-z]{3}$/i.test(code)) return null;
              if (seen.has(code)) return null;
              seen.add(code);

              const totalAssets = d[13];
              const totalLiabilities = d[14];
              const equityRatio =
                totalAssets && totalAssets > 0
                  ? ((totalAssets - (totalLiabilities || 0)) / totalAssets) * 100
                  : null;

              const existing = initialMap.get(code);
              const stayDays = existing?.stayDays ?? 1;
              const pbr = d[6] != null ? Number(Number(d[6]).toFixed(2)) : null;
              const category: StockItem['category'] =
                pbr != null && Number(pbr.toFixed(2)) > 1.20
                  ? 'sotsugyo'
                  : pbr != null && Number(pbr.toFixed(2)) > 1.00
                  ? 'shokaku'
                  : 'wariyasu';

              const dy = d[8] != null ? Number(Number(d[8]).toFixed(2)) : null;

              return {
                code,
                name: normalizeCompanyName(code, String(d[1] || d[0] || '不明')),
                close: d[2] != null ? Number(d[2]) : null,
                change: d[3] != null ? Number(Number(d[3]).toFixed(2)) : null,
                market_cap: d[4] != null ? Math.round(Number(d[4]) / 100000000) : null,
                per: d[5] != null ? Number(Number(d[5]).toFixed(2)) : null,
                pbr,
                roe: d[7] != null ? Number(Number(d[7]).toFixed(2)) : null,
                dividend_yield: dy,
                payout_ratio: d[9] != null ? Number(Number(d[9]).toFixed(2)) : null,
                ebitda_growth: d[10] != null ? Number(Number(d[10]).toFixed(2)) : null,
                current_ratio: d[11] != null ? Number((Number(d[11]) * 100).toFixed(2)) : null,
                de_ratio: d[12] != null ? Number(Number(d[12]).toFixed(2)) : null,
                equity_ratio: equityRatio != null ? Number(equityRatio.toFixed(2)) : null,
                category,
                stayDays,
                entryDate: existing?.entryDate,
              } as StockItem;
            })
            .filter((s): s is StockItem => s !== null);
        }
      }
    } catch (tvErr) {
      console.warn('TradingView scanner fetch failed, falling back to base stock list:', tvErr);
    }

    // TradingView の結果がない場合は INITIAL_STOCKS をベースにする
    const baseStocks = rawTradingViewStocks.length > 0 ? rawTradingViewStocks : INITIAL_STOCKS;

    // 卒業生（2年追跡）を結合
    const graduates = INITIAL_STOCKS.filter((s) => s.category === 'sotsugyo');
    const existingCodes = new Set(baseStocks.map((s) => s.code));
    const combinedCandidates = [
      ...baseStocks,
      ...graduates.filter((g) => !existingCodes.has(g.code)),
      // INITIAL_STOCKS の主要監視銘柄も含めておく
      ...INITIAL_STOCKS.filter((s) => !existingCodes.has(s.code)),
    ];

    // 候補銘柄のコード一覧を yfinance に問い合わせ
    const candidateCodes = Array.from(new Set(combinedCandidates.map((s) => s.code)));
    const yfQuotes = await fetchYFinanceQuotes(candidateCodes);

    // yfinance の最新データ（予想PER、配当利回り、現在値等）で銘柄データを更新
    const enrichedStocks = enrichStocksWithYFinance(combinedCandidates, yfQuotes);

    // ★ 5大基準を使って厳密にスクリーニング絞込（PERは参考表示として保持）
    const screenedStocks = applyScreeningCriteria(enrichedStocks, criteria);

    // 重複コードの排除
    const seen = new Set<string>();
    const finalStocks = screenedStocks.filter((s) => {
      if (seen.has(s.code)) return false;
      seen.add(s.code);
      return true;
    });

    const timestamp = new Date().toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    // 成功した結果をキャッシュ（全候補銘柄も合わせて保持）
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(enrichedStocks));
      localStorage.setItem(CACHE_TIME_KEY, timestamp);
    } catch {
      // localStorage error ignore
    }

    return {
      stocks: finalStocks,
      allCandidates: enrichedStocks,
      isLive: true,
      timestamp,
    };
  } catch (err: any) {
    console.warn('Screening process encountered an error, falling back:', err);

    // キャッシュをフォールバックとして試行
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as StockItem[];
        const filtered = applyScreeningCriteria(parsed, criteria);
        return {
          stocks: filtered,
          allCandidates: parsed,
          isLive: false,
          error: 'データ更新に失敗したため前回の保存データを表示しています',
          timestamp: cachedTime || 'キャッシュデータ',
        };
      }
    } catch {
      // ignore
    }

    // INITIAL_STOCKS をフォールバック
    const filtered = applyScreeningCriteria(INITIAL_STOCKS, criteria);
    return {
      stocks: filtered,
      allCandidates: INITIAL_STOCKS,
      isLive: false,
      error: '最新通信中またはオフラインのためスナップショットを表示しています',
      timestamp: 'スナップショット',
    };
  }
}
