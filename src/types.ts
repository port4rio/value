export type AlumniCategory = 'wariyasu' | 'shokaku' | 'sotsugyo' | 'taigaku' | 'datsuraku';

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

  // バリュー株同窓会 分類: 割安組(PBR<=1.0), 昇格組(1.0<PBR<=1.2), 卒業生(PBR>1.2), 脱落者(指標悪化等)
  category: 'wariyasu' | 'shokaku' | 'sotsugyo' | 'taigaku' | 'datsuraku' | 'inokori' | 'tennyu' | 'zaiseki';
  stayDays?: number; // 各組の滞在日数 (どの組も正の整数、+1ずつ加算)
  entryDate?: string; // 初回スクリーニング該当開始日
  groupEntryDate?: string; // 現在の組に配属された日付
  lastIncrementDate?: string; // 最後に在籍日数が+1された営業日 (YYYY-MM-DD)
  graduationDate?: string; // 卒業生用: 卒業日 (例: 2026-09-28)
  graduationReason?: string; // 卒業生用: 名誉の卒業・PBR1.2倍突破
  graduationPrice?: number; // 卒業生用: 卒業時の株価
  graduationReturn?: number; // 卒業生用: 卒業後リターン(%)
  dropoutDate?: string; // 脱落者用: 脱落日 (例: 2026-09-28)
  dropoutReason?: string; // 脱落者用: 脱落理由（利回り低下、減配、ROE低下、財務悪化など）
  dropoutPrice?: number; // 脱落者用: 脱落時の株価
  dropoutReturn?: number; // 脱落者用: 脱落後リターン(%)
}

export interface ScreeningCriteria {
  maxPbr: number; // デフォルト: 1.2 (上限)
  minRoe: number; // デフォルト: 7.5 (%) (資本効率)
  minDividendYield: number; // デフォルト: 3.8 (%) (株主還元)
  minEbitdaGrowth: number; // デフォルト: -10 (%) (事業成長性)
  minEquityRatio: number; // デフォルト: 48 (%) (財務健全性)
}

export const DEFAULT_CRITERIA: ScreeningCriteria = {
  maxPbr: 1.2,
  minRoe: 7.5,
  minDividendYield: 3.8,
  minEbitdaGrowth: -10,
  minEquityRatio: 48,
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
