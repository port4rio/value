import React from 'react';
import { 
  Calendar, 
  Layers, 
  Hourglass, 
  Zap, 
  GraduationCap, 
  ArrowRight, 
  TrendingUp,
  Percent,
  CheckCircle2
} from 'lucide-react';
import { ScreeningSnapshot, Stock } from '../types/stock';

interface HistorySnapshotViewProps {
  snapshots: ScreeningSnapshot[];
  allStocks: Stock[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onSelectStock: (stock: Stock) => void;
}

export const HistorySnapshotView: React.FC<HistorySnapshotViewProps> = ({
  snapshots,
  allStocks,
  selectedDate,
  onSelectDate,
  onSelectStock
}) => {
  const currentSnapshot = snapshots.find(s => s.date === selectedDate) || snapshots[0];

  const stocksOnDate = allStocks.filter(stock => {
    // Check if the stock was present in this snapshot or active on that date
    if (currentSnapshot?.stockCodes?.includes(stock.code)) return true;
    return stock.history.some(h => h.date <= selectedDate && h.inScreener);
  });

  return (
    <div className="space-y-6">
      
      {/* Date Selector & Timeline Banner */}
      <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700/80">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              日次スナップショット・履歴アーカイブ
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              過去の特定日付時点におけるみんかぶ割安高配当スクリーニングの記録を再現・比較します。
            </p>
          </div>

          {/* Date Selector Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1">
            {snapshots.map((snap) => {
              const isSelected = snap.date === selectedDate;
              return (
                <button
                  key={snap.date}
                  id={`snapshot-date-btn-${snap.date}`}
                  onClick={() => onSelectDate(snap.date)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700'
                  }`}
                >
                  {snap.date} {snap.date === '2026-08-22' ? '(最新)' : ''}
                </button>
              );
            })}
          </div>
        </div>

        {/* Snapshot Summary Metrics for the Selected Date */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
            <span className="text-[11px] text-slate-400 font-medium block">スクリーニング該当数</span>
            <span className="text-lg font-bold text-slate-100 font-mono">
              {currentSnapshot?.totalCount || stocksOnDate.length} 銘柄
            </span>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
            <span className="text-[11px] text-slate-400 font-medium block">平均配当利回り</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">
              {currentSnapshot?.avgYield || '4.41'}%
            </span>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
            <span className="text-[11px] text-slate-400 font-medium block">平均PBR</span>
            <span className="text-lg font-bold text-slate-200 font-mono">
              {currentSnapshot?.avgPbr || '0.82'}倍
            </span>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
            <span className="text-[11px] text-slate-400 font-medium block">最高利回り銘柄</span>
            <span className="text-xs font-bold text-indigo-300 truncate block">
              {currentSnapshot?.topYieldStock?.name || 'JFEホールディングス'} ({currentSnapshot?.topYieldStock?.yield || '4.90'}%)
            </span>
          </div>
        </div>

      </div>

      {/* Stocks Active On Selected Date */}
      <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-5 shadow-xl">
        <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center justify-between">
          <span>{selectedDate} 時点のスクリーニング一覧</span>
          <span className="text-xs font-normal text-slate-400">{stocksOnDate.length} 件</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {stocksOnDate.map((stock) => {
            const histOnDate = stock.history.find(h => h.date === selectedDate) || stock.history[stock.history.length - 1];

            return (
              <div
                key={stock.code}
                onClick={() => onSelectStock(stock)}
                className="p-3 bg-slate-800/70 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-lg transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-mono text-xs font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 text-slate-300">
                      {stock.code}
                    </span>
                    <span className="font-bold text-xs text-slate-100 truncate max-w-[130px]">
                      {stock.name}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {stock.sector} • PBR {histOnDate ? histOnDate.pbr.toFixed(2) : stock.pbr.toFixed(2)}倍
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div className="text-xs font-bold text-emerald-400">
                    利回り {histOnDate ? histOnDate.dividendYield.toFixed(2) : stock.dividendYield.toFixed(2)}%
                  </div>
                  <div className="text-[11px] text-slate-400">
                    ¥{(histOnDate ? histOnDate.price : stock.price).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};
