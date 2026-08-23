import React from 'react';
import { 
  Hourglass, 
  Zap, 
  GraduationCap, 
  Layers, 
  TrendingUp, 
  Percent, 
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import { Stock } from '../types/stock';

interface MetricOverviewCardsProps {
  stocks: Stock[];
  activeTab: string;
  onSelectTab: (tab: 'all' | 'chronic' | 'rare_new' | 'graduated' | 'history' | 'setup') => void;
}

export const MetricOverviewCards: React.FC<MetricOverviewCardsProps> = ({
  stocks,
  activeTab,
  onSelectTab
}) => {
  const activeStocks = stocks.filter(s => s.status !== 'graduated');
  const chronicStocks = stocks.filter(s => s.status === 'chronic');
  const rareNewStocks = stocks.filter(s => s.status === 'rare_new');
  const graduatedStocks = stocks.filter(s => s.status === 'graduated');

  const avgYield = activeStocks.length 
    ? (activeStocks.reduce((acc, s) => acc + s.dividendYield, 0) / activeStocks.length).toFixed(2)
    : '0.00';

  const avgPbr = activeStocks.length
    ? (activeStocks.reduce((acc, s) => acc + s.pbr, 0) / activeStocks.length).toFixed(2)
    : '0.00';

  const avgGraduatedReturn = graduatedStocks.length
    ? (graduatedStocks.reduce((acc, s) => acc + (s.graduationReturnPercent || 0), 0) / graduatedStocks.length).toFixed(1)
    : '0.0';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      
      {/* 1. All Active Stocks */}
      <div 
        id="card-all-stocks"
        onClick={() => onSelectTab('all')}
        className={`cursor-pointer rounded-xl p-5 transition-all border ${
          activeTab === 'all' 
            ? 'bg-slate-800 border-indigo-500 shadow-lg ring-1 ring-indigo-500/40' 
            : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800/80 hover:border-slate-600 shadow-md'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">全割安高配当銘柄</span>
          <div className="w-8 h-8 rounded-lg bg-indigo-900/40 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline justify-between">
          <div className="text-3xl font-bold text-white font-mono">
            {activeStocks.length} <span className="text-xs font-normal text-slate-400 font-sans">銘柄</span>
          </div>
          <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
            平均 {avgYield}%
          </span>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-700/60 text-xs text-slate-400 flex items-center justify-between">
          <span>平均PBR: <strong className="text-slate-200 font-mono">{avgPbr}倍</strong></span>
          <span className="text-indigo-400 text-xs font-semibold flex items-center">
            一覧 <ArrowUpRight className="w-3 h-3 ml-0.5" />
          </span>
        </div>
      </div>

      {/* 2. Chronic Undervalued Stocks (ずっと割安放置) */}
      <div 
        id="card-chronic-stocks"
        onClick={() => onSelectTab('chronic')}
        className={`cursor-pointer rounded-xl p-5 transition-all border ${
          activeTab === 'chronic' 
            ? 'bg-amber-950/30 border-amber-400 shadow-lg ring-1 ring-amber-400/40' 
            : 'bg-amber-900/10 border-amber-500/30 hover:bg-amber-900/20 hover:border-amber-500/50 shadow-md'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400/90">ずっと割安放置</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
              90日超
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-900/40 text-amber-400 border border-amber-500/30 flex items-center justify-center">
            <Hourglass className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline justify-between">
          <div className="text-3xl font-bold text-amber-400 font-mono">
            {chronicStocks.length} <span className="text-xs font-normal text-amber-400/60 font-sans">銘柄</span>
          </div>
          <span className="text-xs font-medium text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded">
            万年低PBR
          </span>
        </div>
        <div className="mt-3 pt-2.5 border-t border-amber-500/20 text-xs text-slate-400 flex items-center justify-between">
          <span>ディープバリュー / 還元余力</span>
          <span className="text-amber-400 text-xs font-semibold flex items-center">
            分析 <ArrowUpRight className="w-3 h-3 ml-0.5" />
          </span>
        </div>
      </div>

      {/* 3. Rare / Freshly Undervalued Stocks (珍しく割安) */}
      <div 
        id="card-rare-stocks"
        onClick={() => onSelectTab('rare_new')}
        className={`cursor-pointer rounded-xl p-5 transition-all border ${
          activeTab === 'rare_new' 
            ? 'bg-emerald-950/40 border-emerald-400 shadow-lg ring-1 ring-emerald-400/40' 
            : 'bg-emerald-900/10 border-emerald-500/30 hover:bg-emerald-900/20 hover:border-emerald-500/50 shadow-md'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">珍しく割安</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-pulse">
              新着
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-900/40 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline justify-between">
          <div className="text-3xl font-bold text-emerald-400 font-mono">
            {rareNewStocks.length} <span className="text-xs font-normal text-emerald-400/60 font-sans">銘柄</span>
          </div>
          <span className="text-xs font-medium text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
            21日以内新着
          </span>
        </div>
        <div className="mt-3 pt-2.5 border-t border-emerald-500/20 text-xs text-slate-400 flex items-center justify-between">
          <span>急落・増配による浮上チャンス</span>
          <span className="text-emerald-400 text-xs font-semibold flex items-center">
            注目 <ArrowUpRight className="w-3 h-3 ml-0.5" />
          </span>
        </div>
      </div>

      {/* 4. Graduated Stocks (割安卒業銘柄) */}
      <div 
        id="card-graduated-stocks"
        onClick={() => onSelectTab('graduated')}
        className={`cursor-pointer rounded-xl p-5 transition-all border ${
          activeTab === 'graduated' 
            ? 'bg-indigo-950/40 border-indigo-400 shadow-lg ring-1 ring-indigo-400/40' 
            : 'bg-indigo-900/10 border-indigo-500/30 hover:bg-indigo-900/20 hover:border-indigo-500/50 shadow-md'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400/90">割安卒業銘柄</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              上昇達成
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-indigo-900/40 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
            <GraduationCap className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline justify-between">
          <div className="text-3xl font-bold text-indigo-400 font-mono">
            {graduatedStocks.length} <span className="text-xs font-normal text-indigo-400/60 font-sans">銘柄</span>
          </div>
          <span className="text-xs font-mono font-semibold text-indigo-300 bg-indigo-950/60 border border-indigo-500/30 px-2 py-0.5 rounded">
            平均 +{avgGraduatedReturn}%
          </span>
        </div>
        <div className="mt-3 pt-2.5 border-t border-indigo-500/20 text-xs text-slate-400 flex items-center justify-between">
          <span>PBR改善・株価急伸で離脱</span>
          <span className="text-indigo-400 text-xs font-semibold flex items-center">
            検証 <ArrowUpRight className="w-3 h-3 ml-0.5" />
          </span>
        </div>
      </div>

    </div>
  );
};
