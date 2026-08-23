import React from 'react';
import { 
  Hourglass, 
  AlertTriangle, 
  ShieldCheck, 
  TrendingUp, 
  ExternalLink, 
  CheckCircle2,
  Calendar,
  Layers
} from 'lucide-react';
import { Stock } from '../types/stock';

interface ChronicValueViewProps {
  stocks: Stock[];
  onSelectStock: (stock: Stock) => void;
}

export const ChronicValueView: React.FC<ChronicValueViewProps> = ({
  stocks,
  onSelectStock
}) => {
  const chronicStocks = stocks.filter(s => s.status === 'chronic');

  return (
    <div className="space-y-6">
      
      {/* Category Header & Strategy Guide */}
      <div className="bg-gradient-to-r from-amber-500/15 via-[#1e293b] to-slate-800 border border-amber-500/30 rounded-xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <Hourglass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-100">
                  ずっと割安放置された銘柄（万年割安・ディープバリュー）
                </h2>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {chronicStocks.length} 銘柄
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
                スクリーニング条件（割安判定・高利回り）を<strong className="text-amber-300">90日以上連続で満たし続けている</strong>銘柄群です。
                鉄鋼や建設、素材などの市況敏感・成熟産業が多く、PBR0.5〜0.7倍台の極端な低評価で推移していますが、
                東証の「資本コストや株価を意識した経営」要請や自社株買い・増配発表をきっかけに、<strong className="text-amber-300">「割安卒業」への大化けトリガー</strong>を秘めています。
              </p>
            </div>
          </div>

          <div className="bg-slate-800/90 border border-amber-500/30 rounded-lg p-3 shrink-0 text-xs sm:text-right shadow-md">
            <span className="text-slate-400 block">平均滞在期間</span>
            <strong className="text-amber-400 text-base font-mono">
              {Math.round(chronicStocks.reduce((a, b) => a + b.consecutiveDays, 0) / (chronicStocks.length || 1))} 日間
            </strong>
          </div>
        </div>
      </div>

      {/* Chronic Stock Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {chronicStocks.map((stock) => (
          <div
            key={stock.code}
            id={`chronic-card-${stock.code}`}
            onClick={() => onSelectStock(stock)}
            className="bg-[#1e293b] border border-slate-700 hover:border-amber-500/60 rounded-xl p-5 shadow-xl hover:shadow-2xl transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              
              {/* Header: Code, Name, Days Badge */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 border border-slate-700">
                      {stock.code}
                    </span>
                    <span className="font-bold text-base text-slate-100 group-hover:text-amber-400 transition-colors">
                      {stock.name}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-medium mt-0.5 block">
                    {stock.sector} • {stock.market}
                  </span>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Hourglass className="w-3 h-3 mr-1" />
                    {stock.consecutiveDays}日放置
                  </span>
                </div>
              </div>

              {/* Key Metrics Row */}
              <div className="grid grid-cols-3 gap-2 my-4 p-3 bg-slate-800/80 rounded-lg text-center font-mono border border-slate-700/60">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">配当利回り</span>
                  <span className="font-extrabold text-sm text-emerald-400">{stock.dividendYield.toFixed(2)}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">実績PBR</span>
                  <span className="font-bold text-sm text-amber-400">{stock.pbr.toFixed(2)}倍</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">割安度</span>
                  <span className="font-bold text-sm text-slate-200">+{stock.undervaluedScore.toFixed(0)}%</span>
                </div>
              </div>

              {/* Analysis Notes */}
              <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                {stock.notes}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mt-3">
                {stock.tags?.map((tag, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                    {tag}
                  </span>
                ))}
              </div>

            </div>

            {/* Card Footer: Financial Health & Detail Button */}
            <div className="mt-4 pt-3 border-t border-slate-700/80 flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                自己資本 {stock.equityRatio.toFixed(0)}%
              </span>
              <span className="font-semibold text-amber-400 group-hover:underline">
                推移チャートを見る →
              </span>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
};
