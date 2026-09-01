import React from 'react';
import { 
  Hourglass, 
  Zap, 
  GraduationCap, 
  Star, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Sparkles,
  Info,
  Layers
} from 'lucide-react';
import { Stock, ViewMode, HoldingItem, SortKey, AiSummaryItem } from '../types/stock';

interface StockTableProps {
  stocks: Stock[];
  viewMode?: ViewMode;
  holdings?: Record<string, HoldingItem>;
  aiSummaries?: Record<string, AiSummaryItem>;
  onToggleHolding?: (stock: Stock) => void;
  onSelectStock: (stock: Stock) => void;
  onOpenAiSummary?: (stock: Stock) => void;
  sortBy?: SortKey | string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (field: SortKey) => void;
}

export const StockTable: React.FC<StockTableProps> = ({
  stocks,
  viewMode = 'standard',
  holdings = {},
  aiSummaries = {},
  onToggleHolding,
  onSelectStock,
  onOpenAiSummary,
  sortBy = 'roe',
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

  const handleHeaderClick = (field: SortKey) => {
    if (onSortChange) {
      onSortChange(field);
    }
  };

  const renderSortIndicator = (field: SortKey) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-600 inline ml-1 opacity-0 group-hover/th:opacity-100 transition-opacity" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-indigo-400 inline ml-1" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-indigo-400 inline ml-1" />
    );
  };

  const getMarketBadge = (stock: Stock) => {
    const short = stock.marketShort || (stock.market === 'プライム' ? '東P' : stock.market === 'スタンダード' ? '東S' : '東G');
    const isPrime = short === '東P' || stock.market === 'プライム';
    const isStandard = short === '東S' || stock.market === 'スタンダード';

    return (
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono tracking-tight border ${
        isPrime 
          ? 'bg-blue-950/60 text-blue-300 border-blue-500/30' 
          : isStandard 
            ? 'bg-amber-950/60 text-amber-300 border-amber-500/30' 
            : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
      }`}>
        {short}
      </span>
    );
  };

  const formatMarketCap = (marketCap: number) => {
    if (!marketCap || marketCap <= 0) return '-';
    if (marketCap >= 10000) {
      const cho = (marketCap / 10000).toFixed(marketCap >= 100000 ? 1 : 2);
      return `${cho}兆円`;
    }
    return `${marketCap.toLocaleString()}億円`;
  };

  const renderStatusBadge = (stock: Stock) => {
    switch (stock.status) {
      case 'chronic':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 whitespace-nowrap">
            <Hourglass className="w-2.5 h-2.5 mr-1 text-amber-400" />
            ずっと割安 ({stock.consecutiveDays}日)
          </span>
        );
      case 'rare_new':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-pulse whitespace-nowrap">
            <Zap className="w-2.5 h-2.5 mr-1 text-emerald-400" />
            新着割安 ({stock.consecutiveDays}日目)
          </span>
        );
      case 'graduated':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 whitespace-nowrap">
            <GraduationCap className="w-2.5 h-2.5 mr-1 text-indigo-400" />
            卒業 (+{stock.graduationReturnPercent}%)
          </span>
        );
      case 'normal_active':
      default:
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700 whitespace-nowrap">
            {stock.consecutiveDays}日滞在
          </span>
        );
    }
  };

  return (
    <div className="bg-[#1e293b] rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          
          {/* Table Header */}
          <thead>
            <tr className="bg-slate-800/80 border-b border-slate-700 text-[11px] font-semibold text-slate-400 select-none">
              
              {/* 1. 銘柄 (コードと東S、改行して銘柄名) */}
              <th 
                className="py-3 px-3 cursor-pointer hover:bg-slate-700/50 transition-colors group/th min-w-[160px]"
                onClick={() => handleHeaderClick('code')}
              >
                <span>銘柄</span>
                {renderSortIndicator('code')}
              </th>

              {/* 2. 株価 */}
              <th 
                className="py-3 px-2.5 text-right cursor-pointer hover:bg-slate-700/50 transition-colors group/th whitespace-nowrap"
                onClick={() => handleHeaderClick('price')}
              >
                <span>株価</span>
                {renderSortIndicator('price')}
              </th>

              {/* 3. 前日比 */}
              <th 
                className="py-3 px-2.5 text-right cursor-pointer hover:bg-slate-700/50 transition-colors group/th whitespace-nowrap"
                onClick={() => handleHeaderClick('changePercent')}
              >
                <span>前日比</span>
                {renderSortIndicator('changePercent')}
              </th>

              {/* [4. 目標株価: 非表示] */}

              {/* 5. 時価総額 */}
              <th 
                className="py-3 px-2.5 text-right cursor-pointer hover:bg-slate-700/50 transition-colors group/th whitespace-nowrap"
                onClick={() => handleHeaderClick('marketCap')}
              >
                <span>時価総額</span>
                {renderSortIndicator('marketCap')}
              </th>

              {/* 6. PER */}
              <th 
                className="py-3 px-2.5 text-right cursor-pointer hover:bg-slate-700/50 transition-colors group/th whitespace-nowrap"
                onClick={() => handleHeaderClick('per')}
              >
                <span>PER</span>
                {renderSortIndicator('per')}
              </th>

              {/* 7. PBR */}
              <th 
                className="py-3 px-2.5 text-right cursor-pointer hover:bg-slate-700/50 transition-colors group/th whitespace-nowrap"
                onClick={() => handleHeaderClick('pbr')}
              >
                <span>PBR</span>
                {renderSortIndicator('pbr')}
              </th>

              {/* 8. ROE */}
              <th 
                className="py-3 px-2.5 text-right cursor-pointer hover:bg-slate-700/50 transition-colors group/th whitespace-nowrap"
                onClick={() => handleHeaderClick('roe')}
              >
                <span className="text-indigo-300 font-bold">ROE</span>
                {renderSortIndicator('roe')}
              </th>

              {/* 9. 営業利益成長率 */}
              <th 
                className="py-3 px-2.5 text-right cursor-pointer hover:bg-slate-700/50 transition-colors group/th whitespace-nowrap"
                onClick={() => handleHeaderClick('operatingGrowth')}
              >
                <span>営業利益成長率</span>
                {renderSortIndicator('operatingGrowth')}
              </th>

              {/* 10. 配当利回り */}
              <th 
                className="py-3 px-2.5 text-right cursor-pointer hover:bg-slate-700/50 transition-colors group/th whitespace-nowrap"
                onClick={() => handleHeaderClick('dividendYield')}
              >
                <span className="text-emerald-400 font-bold">配当利回り</span>
                {renderSortIndicator('dividendYield')}
              </th>

              {/* 11. 自己資本比率 */}
              <th 
                className="py-3 px-2.5 text-right cursor-pointer hover:bg-slate-700/50 transition-colors group/th whitespace-nowrap"
                onClick={() => handleHeaderClick('equityRatio')}
              >
                <span>自己資本比率</span>
                {renderSortIndicator('equityRatio')}
              </th>

              {/* [12. 最低投資金額: 非表示] */}

              {/* 13. 滞在日数 / AI・操作 */}
              <th className="py-3 px-3 text-center whitespace-nowrap">
                <span>滞在・AI</span>
              </th>

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
                  className={`hover:bg-slate-800/70 transition-colors group cursor-pointer ${
                    isGraduated ? 'bg-indigo-950/20' : ''
                  } ${isSaved ? 'bg-indigo-950/15' : ''}`}
                  onClick={() => onSelectStock(stock)}
                >
                  
                  {/* 1. 銘柄: 1行目に[コード]と東S(市場)、改行して2行目に銘柄名 */}
                  <td className={`${isCompact ? 'py-2 px-3' : 'py-3 px-3'}`}>
                    <div className="flex items-start space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onToggleHolding) onToggleHolding(stock);
                        }}
                        className={`p-1 mt-0.5 rounded transition-colors ${
                          isSaved ? 'text-amber-400 hover:text-amber-300' : 'text-slate-600 hover:text-amber-400'
                        }`}
                        title={isSaved ? 'port4rio保有・ウォッチから解除' : 'port4rio保有・ウォッチに登録'}
                      >
                        <Star className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                      </button>

                      <div className="flex flex-col">
                        {/* 1行目: コード + 市場バッジ (例: [8058] 東P) */}
                        <div className="flex items-center space-x-1.5 leading-tight">
                          <span className="font-mono font-bold text-indigo-400 text-xs">
                            {stock.code}
                          </span>
                          {getMarketBadge(stock)}
                          <span className="text-[11px] text-slate-500 truncate max-w-[80px]">
                            {stock.sector}
                          </span>
                        </div>

                        {/* 2行目 (改行): 銘柄名 */}
                        <div className="mt-1 font-bold text-slate-100 group-hover:text-indigo-300 transition-colors truncate max-w-[150px] sm:max-w-[210px] text-sm">
                          {stock.name}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* 2. 株価 */}
                  <td className={`${isCompact ? 'py-2 px-2.5' : 'py-3 px-2.5'} text-right whitespace-nowrap font-mono`}>
                    <span className="font-bold text-slate-100">
                      {stock.price.toLocaleString()}円
                    </span>
                  </td>

                  {/* 3. 前日比 */}
                  <td className={`${isCompact ? 'py-2 px-2.5' : 'py-3 px-2.5'} text-right whitespace-nowrap font-mono`}>
                    <div className={`text-xs font-semibold ${
                      stock.change > 0 ? 'text-emerald-400' : stock.change < 0 ? 'text-rose-400' : 'text-slate-400'
                    }`}>
                      {stock.change > 0 ? `+${stock.change}` : stock.change}円
                    </div>
                    <div className={`text-[10px] ${
                      stock.changePercent > 0 ? 'text-emerald-400/90' : stock.changePercent < 0 ? 'text-rose-400/90' : 'text-slate-500'
                    }`}>
                      ({stock.changePercent >= 0 ? `+${stock.changePercent}%` : `${stock.changePercent}%`})
                    </div>
                  </td>

                  {/* 5. 時価総額 */}
                  <td className={`${isCompact ? 'py-2 px-2.5' : 'py-3 px-2.5'} text-right whitespace-nowrap font-mono text-slate-300 text-xs`}>
                    {formatMarketCap(stock.marketCap)}
                  </td>

                  {/* 6. PER (調整後 PER から「調整後」は消去) */}
                  <td className={`${isCompact ? 'py-2 px-2.5' : 'py-3 px-2.5'} text-right whitespace-nowrap font-mono`}>
                    <span className={`font-medium ${stock.per <= 10.0 ? 'text-amber-400 font-bold' : 'text-slate-200'}`}>
                      {stock.per.toFixed(1)}倍
                    </span>
                  </td>

                  {/* 7. PBR */}
                  <td className={`${isCompact ? 'py-2 px-2.5' : 'py-3 px-2.5'} text-right whitespace-nowrap font-mono`}>
                    <span className={`font-bold ${stock.pbr < 0.7 ? 'text-amber-400' : 'text-slate-200'}`}>
                      {stock.pbr.toFixed(2)}倍
                    </span>
                  </td>

                  {/* 8. ROE */}
                  <td className={`${isCompact ? 'py-2 px-2.5' : 'py-3 px-2.5'} text-right whitespace-nowrap font-mono`}>
                    <span className="font-bold text-indigo-300">
                      {stock.roe ? `${stock.roe.toFixed(1)}%` : '-'}
                    </span>
                  </td>

                  {/* 9. 営業利益成長率 */}
                  <td className={`${isCompact ? 'py-2 px-2.5' : 'py-3 px-2.5'} text-right whitespace-nowrap font-mono text-slate-300`}>
                    <div className={
                      (stock.operatingGrowth !== undefined && stock.operatingGrowth >= 1) 
                        ? 'text-emerald-400 font-semibold' 
                        : (stock.operatingGrowth !== undefined && stock.operatingGrowth < 0) 
                          ? 'text-rose-400' 
                          : 'text-slate-300'
                    }>
                      {stock.operatingGrowth !== undefined 
                        ? (stock.operatingGrowth > 0 ? `+${stock.operatingGrowth.toFixed(1)}%` : `${stock.operatingGrowth.toFixed(1)}%`)
                        : (stock.salesCagr3y !== undefined ? `+${stock.salesCagr3y.toFixed(1)}%` : '-')}
                    </div>
                    {stock.salesCagr3y !== undefined && (
                      <div className="text-[10px] text-slate-500">
                        (売上 {stock.salesCagr3y >= 0 ? `+${stock.salesCagr3y.toFixed(1)}%` : `${stock.salesCagr3y.toFixed(1)}%`})
                      </div>
                    )}
                  </td>

                  {/* 10. 配当利回り */}
                  <td className={`${isCompact ? 'py-2 px-2.5' : 'py-3 px-2.5'} text-right whitespace-nowrap font-mono`}>
                    <div className="font-extrabold text-sm text-emerald-400">
                      {stock.dividendYield.toFixed(2)}%
                    </div>
                  </td>

                  {/* 11. 自己資本比率 */}
                  <td className={`${isCompact ? 'py-2 px-2.5' : 'py-3 px-2.5'} text-right whitespace-nowrap font-mono text-slate-300`}>
                    <span className={stock.equityRatio >= 60 ? 'text-emerald-300 font-semibold' : 'text-slate-300'}>
                      {stock.equityRatio.toFixed(1)}%
                    </span>
                  </td>

                  {/* 13. 滞在日数 & AI・操作 */}
                  <td className={`${isCompact ? 'py-2 px-3' : 'py-3 px-3'} text-center whitespace-nowrap`} onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center space-x-1.5">
                      <div className="hidden sm:block">
                        {renderStatusBadge(stock)}
                      </div>
                      
                      {onOpenAiSummary && (
                        <button
                          onClick={() => onOpenAiSummary(stock)}
                          className={`px-2 py-1 text-[11px] font-semibold rounded transition-all inline-flex items-center gap-1 cursor-pointer ${
                            aiSummaries[stock.code]
                              ? 'text-emerald-200 bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-400/50 shadow-xs shadow-emerald-500/20'
                              : 'text-slate-400 bg-slate-800 hover:bg-slate-700 border border-slate-700'
                          }`}
                          title={aiSummaries[stock.code] ? `AI診断: ${aiSummaries[stock.code].aiVerdict} (スコア: ${aiSummaries[stock.code].healthScore}点)` : "AI財務サマリー & 診断"}
                        >
                          <Sparkles className={`w-3 h-3 ${aiSummaries[stock.code] ? 'text-emerald-300 fill-emerald-400/30' : 'text-slate-400'}`} />
                          <span>AI</span>
                          {aiSummaries[stock.code] && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse hidden xl:inline-block" />
                          )}
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
          <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>※ 各列ヘッダーをクリックすると昇順・降順ソートできます。「★」でport4rio保有・ウォッチ銘柄に登録。</span>
        </div>
        <span className="font-mono font-medium text-slate-300 shrink-0">表示件数: {stocks.length} 件</span>
      </div>

    </div>
  );
};
