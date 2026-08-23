import React from 'react';
import { 
  GraduationCap, 
  TrendingUp, 
  Award, 
  CheckCircle2, 
  ExternalLink, 
  ArrowUpRight,
  DollarSign,
  Calendar,
  Sparkles
} from 'lucide-react';
import { Stock } from '../types/stock';

interface GraduatedStocksViewProps {
  stocks: Stock[];
  onSelectStock: (stock: Stock) => void;
}

export const GraduatedStocksView: React.FC<GraduatedStocksViewProps> = ({
  stocks,
  onSelectStock
}) => {
  const graduatedStocks = stocks.filter(s => s.status === 'graduated');

  const avgReturn = graduatedStocks.length
    ? (graduatedStocks.reduce((a, b) => a + (b.graduationReturnPercent || 0), 0) / graduatedStocks.length).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-500/15 via-[#1e293b] to-slate-800 border border-purple-500/30 rounded-xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-100">
                  割安卒業銘柄（上昇達成・バリュエーション適正化）
                </h2>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {graduatedStocks.length} 銘柄
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
                かつて割安高配当スクリーナーにランクインしていたものの、<strong className="text-purple-300">株価の大幅上昇、PBR1倍超への改善、自社株買いや業績好転</strong>によって
                利回りが低下または適正株価へ到達し、<strong className="text-purple-300">「割安状態を満了して卒業」</strong>した実績銘柄群です。割安投資の成果・勝率の検証に役立ちます。
              </p>
            </div>
          </div>

          <div className="bg-slate-800/90 border border-purple-500/30 rounded-lg p-3 shrink-0 text-xs sm:text-right shadow-md">
            <span className="text-slate-400 block">卒業時平均獲得リターン</span>
            <strong className="text-purple-400 text-lg font-mono font-extrabold">
              +{avgReturn}%
            </strong>
          </div>
        </div>
      </div>

      {/* Graduated Stocks Table & Story Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {graduatedStocks.map((stock) => {
          return (
            <div
              key={stock.code}
              id={`graduated-card-${stock.code}`}
              onClick={() => onSelectStock(stock)}
              className="bg-[#1e293b] border border-slate-700 hover:border-purple-500/60 rounded-xl p-5 shadow-xl hover:shadow-2xl transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full -z-0"></div>

              <div className="relative z-10">
                
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded border border-purple-500/30">
                        {stock.code}
                      </span>
                      <span className="font-bold text-base text-slate-100 group-hover:text-purple-400 transition-colors">
                        {stock.name}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-medium mt-0.5 block">
                      {stock.sector} • {stock.market}
                    </span>
                  </div>

                  {/* Return Badge */}
                  <div className="text-right">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-mono font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-md">
                      <TrendingUp className="w-4 h-4 mr-1 text-emerald-400" />
                      +{stock.graduationReturnPercent}%
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      卒業日: {stock.graduationDate}
                    </span>
                  </div>
                </div>

                {/* Price Journey: Entry vs Exit */}
                <div className="my-4 p-3 bg-slate-800/80 rounded-lg border border-purple-500/20 grid grid-cols-3 gap-2 text-center font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block">スクリーニング検出時</span>
                    <span className="font-bold text-sm text-slate-300">¥{stock.entryPrice?.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-center text-purple-400 font-bold">
                    ➔
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">卒業時株価 / 現在値</span>
                    <span className="font-extrabold text-sm text-purple-300">¥{stock.price.toLocaleString()}</span>
                  </div>
                </div>

                {/* Graduation Reason */}
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700">
                  <span className="text-[11px] font-bold text-purple-300 flex items-center mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                    卒業理由・上昇要因
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {stock.graduationReason}
                  </p>
                </div>

                {/* Current Valuation Metrics (Post-Graduation) */}
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>現在PBR: <strong className="text-slate-200 font-bold">{stock.pbr.toFixed(2)}倍</strong></span>
                  <span>現在PER: <strong className="text-slate-200 font-bold">{stock.per.toFixed(1)}倍</strong></span>
                  <span>現在利回り: <strong className="text-slate-200 font-bold">{stock.dividendYield.toFixed(2)}%</strong></span>
                </div>

              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-slate-700/80 flex items-center justify-between text-xs relative z-10">
                <span className="text-slate-400 font-mono text-[11px]">
                  通算滞在 {stock.totalAppearances} 日間
                </span>
                <span className="font-semibold text-purple-400 group-hover:underline flex items-center">
                  詳細履歴を見る <ArrowUpRight className="w-3 h-3 ml-0.5" />
                </span>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
