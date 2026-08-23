import React from 'react';
import { 
  Search, 
  SlidersHorizontal, 
  ArrowUpDown, 
  X, 
  ShieldCheck, 
  TrendingUp,
  Table,
  LayoutGrid
} from 'lucide-react';
import { FilterState, ViewMode } from '../types/stock';

interface FilterBarProps {
  filter: FilterState;
  onFilterChange: (newFilter: Partial<FilterState>) => void;
  onResetFilter: () => void;
  availableSectors: string[];
  totalFilteredCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filter,
  onFilterChange,
  onResetFilter,
  availableSectors,
  totalFilteredCount
}) => {
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const isFiltered = filter.search || 
    filter.sector !== 'all' || 
    filter.minYield > 3.0 || 
    filter.maxPbr < 1.5 || 
    filter.onlyHighFinancialHealth || 
    filter.onlyDividendHike;

  const currentViewMode: ViewMode = filter.viewMode || 'standard';

  return (
    <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-4 mb-6 shadow-xl">
      
      {/* Primary Bar: Search, Sector, View Mode Toggle, Quick Sort, Advanced Toggle */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            id="filter-search-input"
            type="text"
            placeholder="銘柄名・銘柄コード（例: 8058, 三菱商事, 5401, トヨタ）で検索..."
            value={filter.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="w-full pl-9 pr-8 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-sans"
          />
          {filter.search && (
            <button
              onClick={() => onFilterChange({ search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sector, View Mode Toggle, Sort Controls */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* View Mode Toggle: Standard vs Compact */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            <button
              id="viewmode-standard-btn"
              onClick={() => onFilterChange({ viewMode: 'standard' })}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                currentViewMode === 'standard'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="標準表示（チャート・増配バッジ付き）"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">標準</span>
            </button>

            <button
              id="viewmode-compact-btn"
              onClick={() => onFilterChange({ viewMode: 'compact' })}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                currentViewMode === 'compact'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="表のみのコンパクト表示（多くの銘柄を一度に一覧）"
            >
              <Table className="w-3.5 h-3.5" />
              <span>コンパクト</span>
            </button>
          </div>

          {/* Sector Select */}
          <select
            id="filter-sector-select"
            value={filter.sector}
            onChange={(e) => onFilterChange({ sector: e.target.value })}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs sm:text-sm text-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">全業種 ({availableSectors.length})</option>
            {availableSectors.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>

          {/* Sort By Select */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg px-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
            <select
              id="filter-sort-select"
              value={filter.sortBy}
              onChange={(e) => onFilterChange({ sortBy: e.target.value as any })}
              className="py-2 bg-transparent text-xs sm:text-sm text-slate-300 font-medium focus:outline-none cursor-pointer"
            >
              <option value="dividendYield" className="bg-slate-800">配当利回り順</option>
              <option value="pbr" className="bg-slate-800">PBR（低倍率順）</option>
              <option value="per" className="bg-slate-800">PER（低PER順）</option>
              <option value="undervaluedScore" className="bg-slate-800">割安度（理論株価比）</option>
              <option value="price" className="bg-slate-800">現在株価順</option>
              <option value="consecutiveDays" className="bg-slate-800">滞在日数順</option>
              <option value="marketCap" className="bg-slate-800">時価総額順</option>
              <option value="graduationReturnPercent" className="bg-slate-800">卒業リターン順</option>
            </select>
            <button
              id="filter-sort-order-btn"
              onClick={() => onFilterChange({ sortOrder: filter.sortOrder === 'asc' ? 'desc' : 'asc' })}
              className="ml-1 px-1.5 py-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 rounded cursor-pointer"
              title="昇順 / 降順 切り替え"
            >
              {filter.sortOrder === 'desc' ? '▼ 降順' : '▲ 昇順'}
            </button>
          </div>

          {/* Advanced Filter Toggle */}
          <button
            id="filter-advanced-toggle-btn"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`inline-flex items-center px-3 py-2 text-xs sm:text-sm font-medium rounded-lg border transition-colors cursor-pointer ${
              showAdvanced || isFiltered
                ? 'bg-indigo-950/60 text-indigo-400 border-indigo-500/50'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            <span className="hidden sm:inline">条件絞込</span>
            {isFiltered && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 ml-1.5"></span>
            )}
          </button>
        </div>

      </div>

      {/* Advanced Filter Accordion */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-slate-700/70 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-150">
          
          {/* Min Dividend Yield Slider */}
          <div>
            <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
              <span>最小配当利回り</span>
              <span className="font-bold text-emerald-400 font-mono">{filter.minYield.toFixed(1)}% 以上</span>
            </div>
            <input
              id="filter-min-yield-slider"
              type="range"
              min="3.0"
              max="5.5"
              step="0.1"
              value={filter.minYield}
              onChange={(e) => onFilterChange({ minYield: parseFloat(e.target.value) })}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5 font-mono">
              <span>3.0%</span>
              <span>4.0%</span>
              <span>5.5%</span>
            </div>
          </div>

          {/* Max PBR Slider */}
          <div>
            <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
              <span>最大PBR (低PBR重視)</span>
              <span className="font-bold text-indigo-400 font-mono">{filter.maxPbr.toFixed(2)}倍 以下</span>
            </div>
            <input
              id="filter-max-pbr-slider"
              type="range"
              min="0.4"
              max="1.5"
              step="0.05"
              value={filter.maxPbr}
              onChange={(e) => onFilterChange({ maxPbr: parseFloat(e.target.value) })}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5 font-mono">
              <span>0.4倍</span>
              <span>1.0倍 (解散価値)</span>
              <span>1.5倍</span>
            </div>
          </div>

          {/* Quick Checkboxes: High Financial Health & Consecutive Dividend Hikes */}
          <div className="flex flex-col justify-center space-y-2">
            <label className="flex items-center text-xs text-slate-300 font-medium cursor-pointer">
              <input
                id="filter-financial-health-check"
                type="checkbox"
                checked={filter.onlyHighFinancialHealth}
                onChange={(e) => onFilterChange({ onlyHighFinancialHealth: e.target.checked })}
                className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 mr-2"
              />
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 mr-1" />
              <span>自己資本比率 50%以上 (好財務)</span>
            </label>

            <label className="flex items-center text-xs text-slate-300 font-medium cursor-pointer">
              <input
                id="filter-dividend-hike-check"
                type="checkbox"
                checked={filter.onlyDividendHike}
                onChange={(e) => onFilterChange({ onlyDividendHike: e.target.checked })}
                className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 mr-2"
              />
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400 mr-1" />
              <span>連続増配銘柄のみ</span>
            </label>
          </div>

          {/* Reset Filters & Results Badge */}
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <span className="text-xs text-slate-400 font-medium">
              該当: <strong className="text-slate-100 font-bold font-mono">{totalFilteredCount}</strong> 件
            </span>
            {isFiltered && (
              <button
                id="filter-reset-btn"
                onClick={onResetFilter}
                className="px-2.5 py-1 text-xs font-semibold text-rose-400 bg-rose-950/40 hover:bg-rose-900/50 rounded border border-rose-500/30 cursor-pointer"
              >
                フィルター解除
              </button>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
