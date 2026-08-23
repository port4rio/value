import React from 'react';
import { 
  Hourglass, 
  Zap, 
  GraduationCap, 
  TrendingUp, 
  ShieldCheck, 
  Sparkles, 
  Info, 
  Layers,
  Star,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Bot
} from 'lucide-react';
import { Stock, ViewMode, HoldingItem } from '../types/stock';
import { SparklineChart } from './SparklineChart';

interface StockTableProps {
  stocks: Stock[];
  viewMode?: ViewMode;
  holdings?: Record<string, HoldingItem>;
  onToggleHolding?: (stock: Stock) => void;
  onSelectStock: (stock: Stock) => void;
  onOpenAiSummary?: (stock: Stock) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (field: any) => void;
}

export const StockTable: React.FC<StockTableProps> = ({
  stocks,
  viewMode = 'standard',
  holdings = {},
  onToggleHolding,
  onSelectStock,
  onOpenAiSummary,
  sortBy = 'dividendYield',
  sortOrder = 'desc',
  onSortChange
}) => {
  if (stocks.length === 0) {
    return (
      <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-12 text-center shadow-xl">
        <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center mx-auto mb-3 border border-slate-700">
          <Layers className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-200">該当する銘柄が見つかりませんでした</h3>
        <p className="text-sm text-slate-400 mt-1">検索キーワードや詳細フィルター条件を緩めてお試しください。</p>
      </div>
    );
  }

  const isCompact = viewMode === 'compact';

  const handleHeaderClick = (field: any) => {
    if (onSortChange) {
      onSortChange(field);
    }
  };

  const renderSortIndicator = (field: string) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-600 inline ml-1 opacity-0 group-hover/th:opacity-100 transition-opacity" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-indigo-400 inline ml-1" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-indigo-400 inline ml-1" />
    );
  };

  const renderStatusBadge = (stock: Stock) => {
    switch (stock.status) {
      case 'chronic':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 whitespace-nowrap">
            <Hourglass className="w-3 h-3 mr-1 text-amber-400" />
            ずっと割安 ({stock.consecutiveDays}日)
          </span>
        );
      case 'rare_new':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-pulse whitespace-nowrap">
            <Zap className="w-3 h-3 mr-1 text-emerald-400" />
            新着割安 ({stock.consecutiveDays}日目)
          </span>
        );
      case 'graduated':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 whitespace-nowrap">
            <GraduationCap className="w-3 h-3 mr-1 text-indigo-400" />
            割安卒業 (+{stock.graduationReturnPercent}%)
          </span>
        );
      case 'normal_active':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700 whitespace-nowrap">
            通常監視 ({stock.consecutiveDays}日)
          </span>
        );
    }
  };

  return (
    <div className="bg-[#1e293b] rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          
          {/* Table Header with Click-to-Sort */}
          <thead>
            <tr className="bg-slate-800/70 border-b border-slate-700 text-[10px] font-medium text-slate-400 uppercase tracking-wider select-none">
              <th 
                className="py-3 px-3 cursor-pointer hover:bg-slate-700/50 transition-colors group/th"
                onClick={() => handleHeaderClick('code')}
              >
                <span>コード・銘柄名</span>
                {renderSortIndicator('code')}
              </th>
              
              <th 
                className="py-3 px-2.5 cursor-pointer hover:bg-slate-700/50 transition-colors group/th"
                onClick={() => handleHeaderClick('consecutiveDays')}
              >
                <span>分類・滞在</span>
                {renderSortIndicator('consecutiveDays')}
              </th>

              <th className="py-3 px-2 text-center">
                <span>直近株価推移</span>
              </th>

              <th 
                className="py-3 px-2.5 text-right cursor-pointer hover:bg-slate-700/50 transition-colors group/th"
                onClick={() => handleHeaderClick('price')}
              >
                <span>現在株価 (前日比)</span>
                {renderSortIndicator('price')}
              </th>

              <th 
                className="py-3 px-2.5 text-right cursor-pointer hover:bg-slate-700/50 transition-colors group/th"
                onClick={() => handleHeaderClick('dividendYield')}
              >
                <span className="text-emerald-400 font-bold">予想配当利回り</span>
                {renderSortIndicator('dividendYield')}
              </th>

              <th 
                className="py-3 px-2.5 text-right cursor-pointer hover:bg-slate-700/50 transition-colors group/th"
                onClick={() => handleHeaderClick('pbr')}
              >
                <span>PBR / PER</span>
                {renderSortIndicator('pbr')}
              </th>

              <th 
                className="py-3 px-2.5 text-right cursor-pointer hover:bg-slate-700/50 transition-colors group/th"
                onClick={() => handleHeaderClick('undervaluedScore')}
              >
                <span>理論株価 (割安度)</span>
                {renderSortIndicator('undervaluedScore')}
              </th>

              {!isCompact && (
                <th 
                  className="py-3 px-2.5 cursor-pointer hover:bg-slate-700/50 transition-colors group/th"
                  onClick={() => handleHeaderClick('consecutiveDividendHikeYears')}
                >
                  <span>増配 / 財務健全性</span>
                  {renderSortIndicator('consecutiveDividendHikeYears')}
                </th>
              )}

              <th className="py-3 px-3 text-center">AI・操作</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className={`divide-y divide-slate-700/50 ${isCompact ? 'text-xs' : 'text-xs sm:text-sm'}`}>
            {stocks.map((stock) => {
              const isGraduated = stock.status === 'graduated';
              const isSaved = !!holdings[stock.code];

              return (
                <tr
                  key={stock.code}
                  id={`stock-row-${stock.code}`}
                  className={`hover:bg-slate-800/60 transition-colors group cursor-pointer ${
                    isGraduated ? 'bg-indigo-950/20' : ''
                  } ${isSaved ? 'bg-indigo-950/15' : ''}`}
                  onClick={() => onSelectStock(stock)}
                >
                  
                  {/* Stock Code, Favorite Star & Name */}
                  <td className={`${isCompact ? 'py-2 px-3' : 'py-3.5 px-3'}`}>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onToggleHolding) onToggleHolding(stock);
                        }}
                        className={`p-1 rounded transition-colors ${
                          isSaved ? 'text-amber-400 hover:text-amber-300' : 'text-slate-600 hover:text-amber-400'
                        }`}
                        title={isSaved ? 'port4rio保有・ウォッチから解除' : 'port4rio保有・ウォッチに登録'}
                      >
                        <Star className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                      </button>

                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-bold text-indigo-400 bg-slate-900/80 px-1.5 py-0.5 rounded text-xs border border-slate-700">
                            {stock.code}
                          </span>
                          <span className="font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors truncate max-w-[150px] sm:max-w-[200px]">
                            {stock.name}
                          </span>
                        </div>
                        {!isCompact && (
                          <div className="flex items-center space-x-1 mt-0.5 text-[11px] text-slate-400">
                            <span>{stock.sector}</span>
                            <span className="text-slate-600">•</span>
                            <span>{stock.market}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className={`${isCompact ? 'py-2 px-2.5' : 'py-3.5 px-2.5'} whitespace-nowrap`}>
                    {renderStatusBadge(stock)}
                  </td>

                  {/* Compact 1-Line Sparkline Chart */}
                  <td className={`${isCompact ? 'py-2 px-2' : 'py-3.5 px-2'} text-center whitespace-nowrap`} onClick={(e) => e.stopPropagation()}>
                    <SparklineChart 
                      history={stock.history} 
                      width={isCompact ? 72 : 84} 
                      height={isCompact ? 18 : 22} 
                    />
                  </td>

                  {/* Price & Change */}
                  <td className={`${isCompact ? 'py-2 px-2.5' : 'py-3.5 px-2.5'} text-right whitespace-nowrap font-mono`}>
                    <div className="font-bold text-slate-100">
                      ¥{stock.price.toLocaleString()}
                    </div>
                    <div className={`text-[10px] font-medium ${
                      stock.change >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {stock.change >= 0 ? `+${stock.change}` : stock.change} ({stock.changePercent >= 0 ? `+${stock.changePercent}%` : `${stock.changePercent}%`})
                    </div>
                  </td>

                  {/* Dividend Yield */}
                  <td className={`${isCompact ? 'py-2 px-2.5' : 'py-3.5 px-2.5'} text-right whitespace-nowrap font-mono`}>
                    <div className="font-extrabold text-sm text-emerald-400">
                      {stock.dividendYield.toFixed(2)}%
                    </div>
                    {!isCompact && <div className="text-[10px] text-slate-500 font-sans">予想年間</div>}
                  </td>

                  {/* PBR & PER */}
                  <td className={`${isCompact ? 'py-2 px-2.5' : 'py-3.5 px-2.5'} text-right whitespace-nowrap font-mono`}>
                    <div className="text-slate-200">
                      <span className="text-[10px] text-slate-500 mr-1 font-sans">PBR</span>
                      <strong className={`${stock.pbr < 0.7 ? 'text-amber-400' : 'text-slate-200'} font-bold`}>
                        {stock.pbr.toFixed(2)}倍
                      </strong>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      <span className="text-slate-500 mr-1 font-sans">PER</span>
                      {stock.per.toFixed(1)}倍
                    </div>
                  </td>

                  {/* Minkabu Theoretical Price & Undervalued Score */}
                  <td className={`${isCompact ? 'py-2 px-2.5' : 'py-3.5 px-2.5'} text-right whitespace-nowrap font-mono`}>
                    <div className="font-medium text-slate-200">
                      ¥{stock.minkabuTheoreticalPrice.toLocaleString()}
                    </div>
                    <div className={`text-[10px] font-bold ${
                      stock.undervaluedScore >= 30 ? 'text-emerald-400' : 'text-slate-400'
                    }`}>
                      +{stock.undervaluedScore.toFixed(1)}% 割安
                    </div>
                  </td>

                  {/* Consecutive Hikes & Health (hidden in compact mode) */}
                  {!isCompact && (
                    <td className="py-3.5 px-2.5 whitespace-nowrap">
                      <div className="text-slate-300 font-medium text-[11px]">
                        {stock.consecutiveDividendHikeYears > 0 ? (
                          <span className="inline-flex items-center text-indigo-300 bg-indigo-950/60 border border-indigo-500/30 px-1.5 py-0.2 rounded text-[10px] font-bold">
                            <TrendingUp className="w-3 h-3 mr-0.5" />
                            {stock.consecutiveDividendHikeYears}期連続増配
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">安定維持</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400 inline" />
                        自己資本 {stock.equityRatio.toFixed(0)}%
                      </div>
                    </td>
                  )}

                  {/* Actions */}
                  <td className={`${isCompact ? 'py-2 px-3' : 'py-3.5 px-3'} text-center whitespace-nowrap`} onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center space-x-1.5">
                      {onOpenAiSummary && (
                        <button
                          onClick={() => onOpenAiSummary(stock)}
                          className="px-2 py-1 text-[11px] font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/30 rounded transition-colors inline-flex items-center"
                          title="AI決算サマリー & ChatGPT相談"
                        >
                          <Sparkles className="w-3 h-3 mr-0.5" />
                          AI
                        </button>
                      )}
                      <button
                        id={`view-detail-btn-${stock.code}`}
                        onClick={() => onSelectStock(stock)}
                        className="px-2 py-1 text-[11px] font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 rounded transition-colors"
                      >
                        推移
                      </button>
                    </div>
                  </td>

                </tr>
              );
            })}
          </tbody>

        </table>
      </div>

      {/* Footer Info */}
      <div className="px-5 py-3 bg-slate-900/60 border-t border-slate-700/80 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <Info className="w-3.5 h-3.5 text-slate-500" />
          <span>※ 各列ヘッダーをクリックすると昇順・降順ソートできます。「★」でport4rio保有・ウォッチに保存。</span>
        </div>
        <span className="font-mono font-medium text-slate-300">表示件数: {stocks.length} 件</span>
      </div>

    </div>
  );
};
