export type StockStatus = 'chronic' | 'rare_new' | 'normal_active' | 'graduated';

export type ViewMode = 'standard' | 'compact';

export interface HoldingItem {
  code: string;
  shares: number;
  avgPrice: number;
  addedAt: string;
  notes?: string;
}

export interface StockMetricHistory {
  date: string; // YYYY-MM-DD
  price: number;
  dividendYield: number;
  per: number;
  pbr: number;
  inScreener: boolean;
}

export interface Stock {
  code: string; // e.g. "8058"
  name: string; // e.g. "三菱商事"
  market: 'プライム' | 'スタンダード' | 'グロース';
  marketShort?: string; // '東P' | '東S' | '東G'
  sector: string; // e.g. "卸売業"
  price: number; // 現在値 (円)
  change: number; // 前日比 (円)
  changePercent: number; // 前日比 (%)
  dividendYield: number; // 予想配当利回り (%)
  per: number; // 予想PER (倍)
  pbr: number; // 実績PBR (倍)
  roe: number; // ROE (%)
  salesCagr3y: number; // 3年平均売上成長率 (%)
  operatingGrowth?: number; // 営業利益成長率 (%)
  equityRatio: number; // 自己資本比率 (%)
  marketCap: number; // 時価総額 (億円)
  
  // みんかぶ特有指標
  minkabuTheoreticalPrice: number; // みんかぶ理論株価 (円)
  undervaluedScore: number; // 割安度 (%) = (理論株価 - 現在株価) / 現在株価 * 100
  targetPrice: number; // 目標株価 / アナリスト予想平均 (円)
  minkabuRating: '割安' | '妥当' | '割高';

  // 追跡・分類メタデータ
  firstDetectedDate: string; // 最初にスクリーニングに登場した日 (YYYY-MM-DD)
  lastSeenDate: string; // 最後にスクリーニングにいた日 (YYYY-MM-DD)
  consecutiveDays: number; // スクリーニング連続滞在日数
  totalAppearances: number; // 通算登場日数
  status: StockStatus; // 'chronic' (ずっと割安放置 >=90日), 'rare_new' (新着割安 <=21日/急落), 'normal_active', 'graduated' (割安卒業)
  
  // 卒業時データ (status === 'graduated' の場合)
  graduationDate?: string;
  graduationPrice?: number;
  graduationReason?: string;
  graduationReturnPercent?: number; // スクリーニング初検出時から卒業時（または現在）のリターン
  entryPrice?: number; // 検出時株価

  // 配当・財務健全性
  dividendTrend: 'up' | 'stable' | 'down'; // 増配傾向 / 据え置き / 減配
  consecutiveDividendHikeYears: number; // 連続増配年数
  payoutRatio: number; // 配当性向 (%)
  
  // 過去ログ
  history: StockMetricHistory[];

  // ユーザーメモ & フラグ
  notes?: string;
  tags?: string[];
}

export interface ScreeningSnapshot {
  date: string; // YYYY-MM-DD
  totalCount: number;
  chronicCount: number;
  rareNewCount: number;
  normalCount: number;
  graduatedCount: number;
  avgYield: number;
  avgPer: number;
  avgPbr: number;
  topYieldStock: { code: string; name: string; yield: number };
  stockCodes: string[];
}

export type TabType = 'all' | 'chronic' | 'rare_new' | 'graduated' | 'portfolio' | 'history' | 'setup';

export type SortKey = 
  | 'dividendYield' 
  | 'pbr' 
  | 'per' 
  | 'roe'
  | 'salesCagr3y'
  | 'operatingGrowth'
  | 'price' 
  | 'consecutiveDays' 
  | 'undervaluedScore' 
  | 'marketCap' 
  | 'graduationReturnPercent' 
  | 'changePercent' 
  | 'code' 
  | 'name'
  | 'consecutiveDividendHikeYears'
  | 'equityRatio';

export interface FilterState {
  search: string;
  tab: TabType;
  viewMode: ViewMode;
  sector: string;
  market: string;
  minYield: number;
  maxPer: number;
  maxPbr: number;
  minMarketCap: number;
  minEquityRatio: number;
  sortBy: SortKey;
  sortOrder: 'asc' | 'desc';
  onlyHighFinancialHealth: boolean; // 自己資本比率 50%以上
  onlyDividendHike: boolean; // 連続増配
}
