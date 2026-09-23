import { StockItem } from '../types';

export type MetricKey =
  | 'dividend_yield'
  | 'per'
  | 'pbr'
  | 'roe'
  | 'ebitda_growth'
  | 'equity_ratio'
  | 'de_ratio'
  | 'current_ratio';

// 各指標の優劣の向き (higher: 高い方が良い / lower: 低い方が良い)
const METRIC_DIRECTION: Record<MetricKey, 'higher' | 'lower'> = {
  dividend_yield: 'higher',
  per: 'lower',
  pbr: 'lower',
  roe: 'higher',
  ebitda_growth: 'higher',
  equity_ratio: 'higher',
  de_ratio: 'lower',
  current_ratio: 'higher',
};

/**
 * 渡された銘柄リストから各指標の順位マップ(code -> rank: 1〜N)を計算
 */
export function calculateMetricRanks(stocks: StockItem[]): Record<MetricKey, Map<string, number>> {
  const result = {} as Record<MetricKey, Map<string, number>>;

  const metricKeys: MetricKey[] = [
    'dividend_yield',
    'per',
    'pbr',
    'roe',
    'ebitda_growth',
    'equity_ratio',
    'de_ratio',
    'current_ratio',
  ];

  for (const key of metricKeys) {
    const map = new Map<string, number>();
    const isHigher = METRIC_DIRECTION[key] === 'higher';

    // null/undefined を除外した有効値リスト
    const validItems = stocks
      .filter((s) => s[key] != null && !isNaN(Number(s[key])))
      .map((s) => ({ code: s.code, val: Number(s[key]) }));

    // ソート
    validItems.sort((a, b) => {
      // lower の場合で PER / PBR が 0 以下の場合は最下位にする
      if (!isHigher && (key === 'per' || key === 'pbr')) {
        if (a.val <= 0 && b.val > 0) return 1;
        if (b.val <= 0 && a.val > 0) return -1;
      }
      return isHigher ? b.val - a.val : a.val - b.val;
    });

    validItems.forEach((item, index) => {
      map.set(item.code, index + 1);
    });

    result[key] = map;
  }

  return result;
}

/**
 * 比率 (0: 最良 〜 1: パッとしない) からグラデーションスタイルを生成
 * 最良(0): 鮮やかな明るい黄緑 rgb(204, 255, 0) (#CCFF00)
 * パッとしない(1): 控えめな白緑 rgb(197, 216, 205) (#c5d8cd)
 */
export function ratioToStyle(ratio: number): { color: string; fontWeight: number } {
  const clamped = Math.min(Math.max(ratio, 0), 1);

  // #CCFF00 (204, 255, 0) から #c5d8cd (197, 216, 205) へのRGB線形補間
  const r = Math.round(204 + (197 - 204) * clamped);
  const g = Math.round(255 + (216 - 255) * clamped);
  const b = Math.round(0 + (205 - 0) * clamped);

  let fontWeight = 400;
  if (clamped <= 0.25) {
    fontWeight = 700;
  } else if (clamped <= 0.6) {
    fontWeight = 600;
  } else if (clamped <= 0.85) {
    fontWeight = 500;
  }

  return {
    color: `rgb(${r}, ${g}, ${b})`,
    fontWeight,
  };
}

/**
 * 1位(最良)から20位(ぱっとしない値)までのグラデーション色スタイルを返す
 */
export function getHeatmapStyle(rank: number | undefined, maxRank: number = 20): {
  color: string;
  fontWeight: number;
} {
  if (rank == null || rank <= 0) {
    return { color: '#c5d8cd', fontWeight: 400 };
  }

  const ratio = Math.min(Math.max((rank - 1) / Math.max(maxRank - 1, 1), 0), 1);
  return ratioToStyle(ratio);
}

/**
 * 指標の絶対値から良い値〜パッとしない値の比率 (0: 最良 〜 1: パッとしない) を計算
 */
export function getMetricAbsoluteRatio(key: MetricKey, val: number | null | undefined): number {
  if (val == null || isNaN(val)) return 1;

  switch (key) {
    case 'dividend_yield': // 5.5%以上が最良(0), 3.8%以下がパッとしない(1)
      return Math.min(Math.max((5.5 - val) / (5.5 - 3.8), 0), 1);
    case 'pbr': // 0.45倍以下が最良(0), 1.0倍以上がパッとしない(1)
      return Math.min(Math.max((val - 0.45) / (1.0 - 0.45), 0), 1);
    case 'per': // 7.0倍以下が最良(0), 15.0倍以上がパッとしない(1)
      return Math.min(Math.max((val - 7.0) / (15.0 - 7.0), 0), 1);
    case 'roe': // 14%以上が最良(0), 7.5%以下がパッとしない(1)
      return Math.min(Math.max((14.0 - val) / (14.0 - 7.5), 0), 1);
    case 'equity_ratio': // 80%以上が最良(0), 48%以下がパッとしない(1)
      return Math.min(Math.max((80.0 - val) / (80.0 - 48.0), 0), 1);
    case 'ebitda_growth': // 15%以上が最良(0), 0%以下がパッとしない(1)
      return Math.min(Math.max((15.0 - val) / (15.0 - 0.0), 0), 1);
    case 'de_ratio': // 0.1倍以下が最良(0), 1.0倍以上がパッとしない(1)
      return Math.min(Math.max((val - 0.1) / (1.0 - 0.1), 0), 1);
    case 'current_ratio': // 250%以上が最良(0), 120%以下がパッとしない(1)
      return Math.min(Math.max((250.0 - val) / (250.0 - 120.0), 0), 1);
    default:
      return 0.5;
  }
}

/**
 * 銘柄の特定指標に対するスタイルを取得（ランク順位優先、なければ絶対値から算出）
 */
export function getStockMetricStyle(
  key: MetricKey,
  stock: StockItem,
  metricRanks?: Record<MetricKey, Map<string, number>>
): { color: string; fontWeight: number } {
  const rank = metricRanks?.[key]?.get(stock.code);
  if (rank != null && rank > 0) {
    return getHeatmapStyle(rank);
  }
  const ratio = getMetricAbsoluteRatio(key, Number(stock[key]));
  return ratioToStyle(ratio);
}
