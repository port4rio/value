import React from 'react';
import { 
  X, 
  ExternalLink, 
  TrendingUp, 
  Hourglass, 
  Zap, 
  GraduationCap, 
  ShieldCheck, 
  CheckCircle2, 
  Calendar, 
  Layers, 
  Percent,
  Sparkles,
  Info,
  Star,
  Bot,
  ArrowUpRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { Stock, HoldingItem } from '../types/stock';
import { generateStockConsultationPrompt, buildChatGPTUrl } from '../utils/chatGptUrlEncoder';

interface StockDetailModalProps {
  stock: Stock | null;
  holding?: HoldingItem;
  onToggleHolding?: (stock: Stock) => void;
  onOpenAiSummary?: (stock: Stock) => void;
  onClose: () => void;
}

export const StockDetailModal: React.FC<StockDetailModalProps> = ({
  stock,
  holding,
  onToggleHolding,
  onOpenAiSummary,
  onClose
}) => {
  if (!stock) return null;

  const isGraduated = stock.status === 'graduated';
  const isSaved = !!holding;
  const chatGptUrl = buildChatGPTUrl(generateStockConsultationPrompt(stock, holding));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      
      {/* Modal Card */}
      <div className="bg-[#1e293b] rounded-2xl border border-slate-700 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col text-slate-200">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-700/80 flex items-start justify-between sticky top-0 bg-[#1e293b] z-20">
          <div>
            <div className="flex items-center space-x-2.5">
              {onToggleHolding && (
                <button
                  onClick={() => onToggleHolding(stock)}
                  className={`p-1 rounded-lg transition-colors ${
                    isSaved ? 'text-amber-400 bg-amber-500/10' : 'text-slate-500 hover:text-amber-400 hover:bg-slate-800'
                  }`}
                  title={isSaved ? 'port4rio保有・ウォッチから解除' : 'port4rio保有・ウォッチに追加'}
                >
                  <Star className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                </button>
              )}

              <span className="font-mono text-sm font-bold bg-slate-900 text-indigo-400 px-2 py-0.5 rounded border border-slate-700">
                {stock.code}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
                {stock.name}
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                {stock.market}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-400">
              <span className="font-medium text-slate-300">{stock.sector}</span>
              <span className="text-slate-600">•</span>
              <span>時価総額: <strong className="font-mono text-slate-200">{stock.marketCap.toLocaleString()}億円</strong></span>
              <span className="text-slate-600">•</span>
              <span className="font-mono">初検出: {stock.firstDetectedDate}</span>
              {stock.status === 'chronic' && (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  ⏳ ずっと割安 ({stock.consecutiveDays}日滞在)
                </span>
              )}
              {stock.status === 'rare_new' && (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-pulse">
                  ⚡ 珍しく割安 ({stock.consecutiveDays}日目新着)
                </span>
              )}
              {stock.status === 'graduated' && (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  🎓 割安卒業 (+{stock.graduationReturnPercent}%)
                </span>
              )}
              {isSaved && (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ★ port4rio保有登録済 ({holding?.shares}株)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="modal-close-btn"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-5 sm:p-6 space-y-6">
          
          {/* Quick AI & ChatGPT Consultation Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-indigo-950/60 to-slate-800 border border-indigo-500/30 rounded-xl">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-200">
                AI分析 & ChatGPT相談 URL連携
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {onOpenAiSummary && (
                <button
                  onClick={() => onOpenAiSummary(stock)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-900 bg-indigo-300 hover:bg-indigo-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  AI決算サマリーを開く
                </button>
              )}
              <a
                href={chatGptUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 text-xs font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Bot className="w-3.5 h-3.5" />
                ChatGPTで深掘り相談
                <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Price & Primary KPIs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            
            {/* Current Price */}
            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
              <span className="text-[11px] text-slate-400 font-sans font-medium block">現在株価</span>
              <div className="text-xl font-bold text-slate-100 mt-0.5">
                ¥{stock.price.toLocaleString()}
              </div>
              <div className={`text-xs font-semibold ${stock.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {stock.change >= 0 ? `+${stock.change}` : stock.change} ({stock.changePercent >= 0 ? `+${stock.changePercent}%` : `${stock.changePercent}%`})
              </div>
            </div>

            {/* Dividend Yield */}
            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
              <span className="text-[11px] text-emerald-400 font-sans font-medium block">予想配当利回り</span>
              <div className="text-xl font-extrabold text-emerald-400 mt-0.5">
                {stock.dividendYield.toFixed(2)}%
              </div>
              <div className="text-xs text-slate-400 font-sans">
                {stock.consecutiveDividendHikeYears > 0 ? `${stock.consecutiveDividendHikeYears}期連続増配` : '配当安定維持'}
              </div>
            </div>

            {/* PBR & PER */}
            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
              <span className="text-[11px] text-slate-400 font-sans font-medium block">実績PBR / 予想PER</span>
              <div className="text-xl font-bold text-slate-100 mt-0.5">
                {stock.pbr.toFixed(2)}倍
              </div>
              <div className="text-xs text-slate-400">
                PER: {stock.per.toFixed(1)}倍
              </div>
            </div>

            {/* Minkabu Theoretical Price */}
            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
              <span className="text-[11px] text-indigo-400 font-sans font-medium block">みんかぶ理論株価</span>
              <div className="text-xl font-bold text-slate-100 mt-0.5">
                ¥{stock.minkabuTheoreticalPrice.toLocaleString()}
              </div>
              <div className="text-xs font-bold text-indigo-300">
                +{stock.undervaluedScore.toFixed(1)}% 割安
              </div>
            </div>

          </div>

          {/* Graduated Highlight Banner (if applicable) */}
          {isGraduated && (
            <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <GraduationCap className="w-6 h-6 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-bold text-indigo-300">
                      割安卒業実績（リターン +{stock.graduationReturnPercent}% 達成）
                    </h4>
                    <span className="text-xs font-mono text-indigo-400">
                      卒業日: {stock.graduationDate}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {stock.graduationReason}
                  </p>
                  <div className="mt-2 flex items-center space-x-4 text-xs font-mono text-slate-400">
                    <span>検出時株価: ¥{stock.entryPrice?.toLocaleString()}</span>
                    <span>➔</span>
                    <span className="text-emerald-400 font-bold">卒業時株価: ¥{stock.price.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Historical Trend Chart */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700">
            <h4 className="text-xs font-bold text-slate-300 mb-3 flex items-center justify-between">
              <span>指標推移チャート（株価・配当利回り・PBR）</span>
              <span className="text-[11px] font-normal text-slate-400">スクリーニング記録期間</span>
            </h4>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stock.history} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" stroke="#34d399" tick={{ fontSize: 11 }} domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                  <YAxis yAxisId="right" orientation="right" stroke="#818cf8" tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px', color: '#f8fafc' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                  <Line 
                    yAxisId="left" 
                    type="monotone" 
                    dataKey="dividendYield" 
                    name="配当利回り (%)" 
                    stroke="#34d399" 
                    strokeWidth={2.5} 
                    dot={{ r: 3 }} 
                  />
                  <Line 
                    yAxisId="left" 
                    type="monotone" 
                    dataKey="pbr" 
                    name="実績PBR (倍)" 
                    stroke="#fbbf24" 
                    strokeWidth={2} 
                    dot={{ r: 3 }} 
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="price" 
                    name="株価 (円)" 
                    stroke="#818cf8" 
                    strokeWidth={2} 
                    dot={{ r: 3 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Financial Safety & Valuation Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Fundamentals */}
            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700">
              <h4 className="text-xs font-bold text-slate-200 mb-3 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                財務健全性・収益性
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-700/60">
                  <span className="text-slate-400">自己資本比率</span>
                  <strong className="font-mono text-slate-200">{stock.equityRatio.toFixed(1)}%</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-700/60">
                  <span className="text-slate-400">ROE (自己資本利益率)</span>
                  <strong className="font-mono text-indigo-300 font-bold">{stock.roe ? `${stock.roe.toFixed(1)}%` : '-'}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-700/60">
                  <span className="text-slate-400">営業利益成長率</span>
                  <strong className="font-mono text-emerald-400 font-semibold">{stock.operatingGrowth !== undefined ? (stock.operatingGrowth > 0 ? `+${stock.operatingGrowth.toFixed(1)}%` : `${stock.operatingGrowth.toFixed(1)}%`) : '-'}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-700/60">
                  <span className="text-slate-400">売上高成長率</span>
                  <strong className="font-mono text-slate-200">{stock.salesCagr3y !== undefined ? `+${stock.salesCagr3y.toFixed(1)}%` : '-'}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-700/60">
                  <span className="text-slate-400">配当性向</span>
                  <strong className="font-mono text-slate-200">{stock.payoutRatio.toFixed(1)}%</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">連続増配年数</span>
                  <strong className="font-mono text-indigo-400">{stock.consecutiveDividendHikeYears}年連続</strong>
                </div>
              </div>
            </div>

            {/* Notes & Analyst Targets */}
            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700">
              <h4 className="text-xs font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-slate-400" />
                銘柄解説・分析ポイント
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                {stock.notes}
              </p>
              <div className="pt-2 border-t border-slate-700/60 text-xs flex justify-between">
                <span className="text-slate-400">アナリスト目標株価平均</span>
                <strong className="font-mono text-slate-100">¥{stock.targetPrice.toLocaleString()}</strong>
              </div>
            </div>

          </div>

          {/* External Links */}
          <div className="pt-2 border-t border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-400 font-medium">外部サービスで最新情報を確認:</span>
            <div className="flex items-center space-x-2">
              <a
                href={`https://minkabu.jp/stock/${stock.code}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
              >
                みんかぶ
                <ExternalLink className="w-3 h-3 ml-1 text-slate-400" />
              </a>
              <a
                href={`https://finance.yahoo.co.jp/quote/${stock.code}.T`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
              >
                Yahoo!ファイナンス
                <ExternalLink className="w-3 h-3 ml-1 text-slate-400" />
              </a>
              <a
                href={`https://kabutan.jp/stock/?code=${stock.code}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
              >
                株探 (Kabutan)
                <ExternalLink className="w-3 h-3 ml-1 text-slate-400" />
              </a>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
