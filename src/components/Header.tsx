import React from 'react';
import { 
  TrendingUp, 
  GitBranch, 
  Download, 
  RefreshCw, 
  Calendar, 
  Star,
  ExternalLink,
  Bot
} from 'lucide-react';

interface HeaderProps {
  lastUpdated: string;
  totalStocksCount: number;
  holdingsCount?: number;
  onOpenGitHubSetup: () => void;
  onOpenDataModal: () => void;
  onRefreshData: () => void;
  onOpenPortfolio?: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  lastUpdated,
  totalStocksCount,
  holdingsCount = 0,
  onOpenGitHubSetup,
  onOpenDataModal,
  onRefreshData,
  onOpenPortfolio,
  isRefreshing
}) => {
  return (
    <header className="bg-[#1e293b] border-b border-slate-700 sticky top-0 z-30 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Title */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md ring-1 ring-indigo-400/30 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  みんかぶ割安高配当トラッカー
                </h1>
                <a
                  href="https://github.com/port4rio/port4rio.github.io"
                  target="_blank"
                  rel="noreferrer"
                  className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 hover:text-white transition-colors"
                  title="port4rio.github.io 新機能"
                >
                  <span>port4rio</span>
                  <ExternalLink className="w-2.5 h-2.5 ml-1 opacity-70" />
                </a>
                <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                  日次自動追跡中
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span>ずっと割安・新着割安・卒業銘柄 & AI決算サマリー</span>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <span className="hidden sm:flex items-center gap-1 font-mono text-emerald-400 text-[11px]">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  {lastUpdated}
                </span>
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Holdings Quick Button */}
            {onOpenPortfolio && (
              <button
                id="header-portfolio-btn"
                onClick={onOpenPortfolio}
                className="inline-flex items-center px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-semibold text-amber-300 bg-amber-950/40 hover:bg-amber-900/50 rounded-lg transition-colors border border-amber-500/30 cursor-pointer"
                title="LocalStorage保有銘柄・ChatGPT相談"
              >
                <Star className="w-3.5 h-3.5 mr-1.5 fill-current text-amber-400" />
                <span className="hidden sm:inline">port4rio保有</span>
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {holdingsCount}
                </span>
              </button>
            )}

            {/* Live Refresh Simulator */}
            <button
              id="header-refresh-btn"
              onClick={onRefreshData}
              disabled={isRefreshing}
              className="inline-flex items-center px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg transition-colors border border-slate-700 cursor-pointer"
              title="データを最新状態に再集計"
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:mr-1.5 text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? '集計中...' : '最新化'}</span>
            </button>

            {/* Data Import / Export */}
            <button
              id="header-data-btn"
              onClick={onOpenDataModal}
              className="inline-flex items-center px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg transition-colors border border-slate-700 cursor-pointer"
              title="データのエクスポート・インポート"
            >
              <Download className="w-3.5 h-3.5 sm:mr-1.5 text-slate-400" />
              <span className="hidden sm:inline">データ入出力</span>
            </button>

            {/* GitHub Actions / Pages Integration Setup */}
            <button
              id="header-github-btn"
              onClick={onOpenGitHubSetup}
              className="inline-flex items-center px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md transition-all hover:ring-2 hover:ring-indigo-400/40 cursor-pointer"
            >
              <GitBranch className="w-3.5 h-3.5 mr-1.5 text-emerald-300" />
              <span className="hidden sm:inline">GitHub Actions連携</span>
              <span className="sm:hidden">GitHub</span>
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};
