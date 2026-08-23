import React from 'react';
import { 
  Zap, 
  TrendingUp, 
  ShieldCheck, 
  Sparkles, 
  Clock, 
  AlertCircle,
  ArrowUpRight
} from 'lucide-react';
import { Stock } from '../types/stock';

interface RareUndervaluedViewProps {
  stocks: Stock[];
  onSelectStock: (stock: Stock) => void;
}

export const RareUndervaluedView: React.FC<RareUndervaluedViewProps> = ({
  stocks,
  onSelectStock
}) => {
  const rareStocks = stocks.filter(s => s.status === 'rare_new');

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-500/15 via-[#1e293b] to-slate-800 border border-indigo-500/30 rounded-xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-100">
                  珍しく割安になっている銘柄（新着・急落バリュー）
                </h2>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 animate-pulse">
                  {rareStocks.length} 銘柄
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
                普段はPERやPBRが高くスクリーナーに入らない優良銘柄が、<strong className="text-indigo-300">一時的な地合い悪化・決算後の過剰反応・為替変動・増配発表</strong>などを機に、
                直近（21日以内）でスクリーニング条件に飛び込んできた<strong className="text-indigo-300">「押し目買い・リバウンド狙い」</strong>の注目銘柄です。
              </p>
            </div>
          </div>

          <div className="bg-slate-800/90 border border-indigo-500/30 rounded-lg p-3 shrink-0 text-xs sm:text-right shadow-md">
            <span className="text-slate-400 block">新着平均利回り</span>
            <strong className="text-indigo-400 text-base font-mono">
              {(rareStocks.reduce((a, b) => a + b.dividendYield, 0) / (rareStocks.length || 1)).toFixed(2)}%
            </strong>
          </div>
        </div>
      </div>

      {/* Grid of Rare / Fresh Stocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rareStocks.map((stock) => (
          <div
            key={stock.code}
            id={`rare-card-${stock.code}`}
            onClick={() => onSelectStock(stock)}
            className="bg-[#1e293b] border border-slate-700 hover:border-indigo-500/60 rounded-xl p-5 shadow-xl hover:shadow-2xl transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
          >
            {/* Top Accent Ribbon */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-emerald-400"></div>

            <div>
              
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                      {stock.code}
                    </span>
                    <span className="font-bold text-base text-slate-100 group-hover:text-indigo-400 transition-colors">
                      {stock.name}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-medium mt-0.5 block">
                    {stock.sector} • {stock.market}
                  </span>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    <Clock className="w-3 h-3 mr-1 text-indigo-400" />
                    {stock.consecutiveDays}日目新着
                  </span>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-3 gap-2 my-4 p-3 bg-slate-800/80 rounded-lg text-center font-mono border border-slate-700/60">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">配当利回り</span>
                  <span className="font-extrabold text-sm text-emerald-400">{stock.dividendYield.toFixed(2)}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">予想PER</span>
                  <span className="font-bold text-sm text-indigo-400">{stock.per.toFixed(1)}倍</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">理論株価</span>
                  <span className="font-bold text-sm text-slate-200">¥{stock.minkabuTheoreticalPrice.toLocaleString()}</span>
                </div>
              </div>

              {/* Notes */}
              <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                {stock.notes}
              </p>

              {/* Consecutive Dividend Hikes Badge */}
              <div className="mt-3 flex items-center gap-2">
                {stock.consecutiveDividendHikeYears > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {stock.consecutiveDividendHikeYears}期連続増配
                  </span>
                )}
                <span className="text-[11px] text-slate-400">
                  初検出: {stock.firstDetectedDate}
                </span>
              </div>

            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-slate-700/80 flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-semibold flex items-center">
                みんかぶ理論比 +{stock.undervaluedScore.toFixed(1)}% 割安
              </span>
              <span className="font-semibold text-indigo-400 group-hover:underline flex items-center">
                詳細分析 <ArrowUpRight className="w-3 h-3 ml-0.5" />
              </span>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
};
