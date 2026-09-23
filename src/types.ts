export type AlumniCategory = 'all' | 'inokori' | 'tennyu' | 'sotsugyo';

export interface StockItem {
  code: string;
  name: string;
  close: number | null;
  change: number | null;
  market_cap: number | null; // 億円単位
  dividend_yield: number | null; // %
  payout_ratio: number | null; // %
  per: number | null; // 倍
  pbr: number | null; // 倍
  roe: number | null; // %
  ebitda_growth: number | null; // %
  equity_ratio: number | null; // %
  de_ratio: number | null; // 倍
  current_ratio: number | null; // %
  sector?: string;
  updatedAt?: string;

  // バリュー株同窓会 分類
  category: 'inokori' | 'tennyu' | 'sotsugyo';
  stayDays?: number; // 在籍日数 (居残り組: 90日以上, 転入生: 30日以内)
  entryDate?: string; // スクリーニング該当開始日
  lastIncrementDate?: string; // 最後に在籍日数が+1された営業日 (YYYY-MM-DD)
  graduationDate?: string; // 卒業生用: 卒業日 (例: 2024/02/15)
  graduationReason?: string; // 卒業生用: 名誉挽回・卒業理由
  graduationPrice?: number; // 卒業生用: 卒業時の株価
  graduationReturn?: number; // 卒業生用: 卒業後リターン(%)
}

export interface ScreeningCriteria {
  maxPbr: number; // デフォルト: 1.0 (資産割安)
  minRoe: number; // デフォルト: 8 (%) (資本効率)
  minDividendYield: number; // デフォルト: 4 (%) (株主還元)
  minEbitdaGrowth: number; // デフォルト: 1 (%) (収益成長)
  minEquityRatio: number; // デフォルト: 50 (%) (財務健全性)
}

export const DEFAULT_CRITERIA: ScreeningCriteria = {
  maxPbr: 1.0,
  minRoe: 8,
  minDividendYield: 4.0,
  minEbitdaGrowth: 1,
  minEquityRatio: 50,
};

export type SortField = keyof StockItem;
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: SortField;
  direction: SortDirection;
}

export interface ColumnDefinition {
  key: SortField;
  label: string;
  shortLabel?: string;
  unit?: string;
  tooltip: string;
  align: 'left' | 'right' | 'center';
  minWidth: string;
  priority: 'high' | 'medium' | 'low';
  format: (value: number | null | undefined, stock?: StockItem) => string;
}

export interface StockAiDiagnosisData {
  business_summary: string;
  valuation_appeal: string;
  dividend_sustainability: string;
  catalyst: string;
  risks: string;
}

export interface StockAiDiagnosisResponse {
  success?: boolean;
  code: string;
  name: string;
  diagnosis: StockAiDiagnosisData;
  diagnosedDateLabel: string;
  nextDiagnosisLabel: string;
  diagnosedAt: string;
  model: string;
  fromCache?: boolean;
}

export interface ChartPoint {
  date: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockChartData {
  symbol: string;
  name?: string;
  currency?: string;
  points: ChartPoint[];
  highPrice: number;
  lowPrice: number;
  latestPrice: number;
  periodChange: number;
  periodChangePercent: number;
  startDate: string;
  endDate: string;
  fromCache?: boolean;
}
