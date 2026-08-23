import React from 'react';
import { 
  X, 
  Sparkles, 
  Bot, 
  TrendingUp, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  Check, 
  ArrowUpRight,
  HelpCircle,
  FileText,
  DollarSign
} from 'lucide-react';
import { Stock } from '../types/stock';
import { generateStockConsultationPrompt, buildChatGPTUrl, HoldingItem } from '../utils/chatGptUrlEncoder';

interface AiFinancialSummaryModalProps {
  stock: Stock | null;
  holding?: HoldingItem;
  onClose: () => void;
}

export const AiFinancialSummaryModal: React.FC<AiFinancialSummaryModalProps> = ({
  stock,
  holding,
  onClose
}) => {
  const [copiedPrompt, setCopiedPrompt] = React.useState(false);

  if (!stock) return null;

  const consultationPrompt = generateStockConsultationPrompt(stock, holding);
  const chatGptUrl = buildChatGPTUrl(consultationPrompt);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(consultationPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  // Automated financial risk / strength evaluation logic
  const isHighHealth = stock.equityRatio >= 50;
  const isDividendHiker = stock.consecutiveDividendHikeYears > 0;
  const isLowPbr = stock.pbr < 0.7;
  const isSafePayout = stock.payoutRatio <= 40;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#1e293b] rounded-2xl border border-slate-700 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col text-slate-200 relative">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-700/80 flex items-start justify-between sticky top-0 bg-[#1e293b] z-20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center text-white shadow-lg shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold bg-slate-900 text-indigo-400 px-2 py-0.5 rounded border border-slate-700">
                  {stock.code}
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {stock.name} AI決算・財務サマリー
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {stock.sector} • 配当利回り <strong className="text-emerald-400 font-mono font-bold">{stock.dividendYield.toFixed(2)}%</strong> • PBR <strong className="text-amber-400 font-mono font-bold">{stock.pbr.toFixed(2)}倍</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-6">
          
          {/* Quick AI Diagnostics Scorecard */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-center">
              <span className="text-[10px] text-slate-400 font-sans block">配当持続力スコア</span>
              <span className="text-base font-extrabold text-emerald-400 block mt-0.5">
                {isSafePayout && isHighHealth ? 'S ランク (極めて安全)' : isHighHealth ? 'A ランク (高安全性)' : 'B ランク (標準水準)'}
              </span>
              <span className="text-[10px] text-slate-500 font-sans">配当性向 {stock.payoutRatio.toFixed(0)}%</span>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-center">
              <span className="text-[10px] text-slate-400 font-sans block">割安度 (理論株価比)</span>
              <span className="text-base font-extrabold text-indigo-400 block mt-0.5">
                +{stock.undervaluedScore.toFixed(0)}% 割安
              </span>
              <span className="text-[10px] text-slate-500 font-sans">理論値 ¥{stock.minkabuTheoreticalPrice.toLocaleString()}</span>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-center">
              <span className="text-[10px] text-slate-400 font-sans block">PBR改革カタリスト</span>
              <span className={`text-base font-extrabold block mt-0.5 ${isLowPbr ? 'text-amber-400' : 'text-slate-200'}`}>
                {isLowPbr ? 'PBR超割安' : '適正推移'}
              </span>
              <span className="text-[10px] text-slate-500 font-sans">PBR {stock.pbr.toFixed(2)}倍</span>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-center">
              <span className="text-[10px] text-slate-400 font-sans block">財務健全性 (自己資本)</span>
              <span className={`text-base font-extrabold block mt-0.5 ${isHighHealth ? 'text-emerald-400' : 'text-slate-200'}`}>
                {stock.equityRatio.toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-500 font-sans">{isHighHealth ? '健全水準(50%超)' : '標準的'}</span>
            </div>
          </div>

          {/* AI Structured Overview */}
          <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-400" />
              AIアナリストによる要点サマリー
            </h4>

            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3 bg-slate-800 rounded-lg border border-slate-700/80">
                <strong className="text-indigo-300 block mb-1 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  1. 投資妙味と割安の背景
                </strong>
                <p className="text-slate-300">
                  {stock.notes} 
                  現在のみんかぶ理論株価 ¥{stock.minkabuTheoreticalPrice.toLocaleString()} に対し、+{stock.undervaluedScore.toFixed(1)}% の大幅なディスカウント水準にあります。
                  {stock.status === 'chronic' && ' 90日以上の長期にわたり割安圏で推移しているため、東証のPBR1倍割れ要請や自社株買い発表が大きな株価見直しカタリストとなります。'}
                  {stock.status === 'rare_new' && ' 直近で急落または増配により突如スクリーナーにランクインした優良銘柄であり、リバウンド局面でのキャピタル＋インカムのダブルゲインが期待されます。'}
                </p>
              </div>

              <div className="p-3 bg-slate-800 rounded-lg border border-slate-700/80">
                <strong className="text-emerald-300 block mb-1 font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  2. 配当の持続性と株主還元方針
                </strong>
                <p className="text-slate-300">
                  自己資本比率は <span className="font-mono text-emerald-400 font-bold">{stock.equityRatio.toFixed(1)}%</span>、配当性向は <span className="font-mono text-slate-200 font-bold">{stock.payoutRatio.toFixed(1)}%</span> で推移。
                  {isDividendHiker ? `${stock.consecutiveDividendHikeYears}期連続増配を継続しており、累進的な還元姿勢が強固です。` : '配当は安定的であり、無理のない利益還元水準を保っています。'}
                </p>
              </div>

              <div className="p-3 bg-slate-800 rounded-lg border border-slate-700/80">
                <strong className="text-amber-300 block mb-1 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  3. 注視すべきリスク要因
                </strong>
                <p className="text-slate-300">
                  業種特性（{stock.sector}）による市況変動や為替・金利動向の影響。次回の四半期決算発表における進捗率および通期会社予想の据え置き・上方修正動向を必ずご確認ください。
                </p>
              </div>
            </div>
          </div>

          {/* ChatGPT Deep Consultation Box with URL Encoder */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-indigo-950/40 to-slate-900 border border-emerald-500/30 rounded-xl p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <Bot className="w-5 h-5 text-emerald-400" />
                  <h4 className="text-sm font-bold text-white">
                    ChatGPT にこの銘柄を丸ごと深掘り相談
                  </h4>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  現在のリアルタイム財務指標・割安度データを自動でプロンプト化し、ChatGPT URLへエンコードします。
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  id="copy-chatgpt-prompt-btn"
                  onClick={handleCopyPrompt}
                  className="inline-flex items-center px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  {copiedPrompt ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                      コピー完了
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                      プロンプトをコピー
                    </>
                  )}
                </button>

                <a
                  id="open-chatgpt-url-btn"
                  href={chatGptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center px-4 py-2 text-xs font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-lg transition-all hover:scale-102 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 fill-current" />
                  ChatGPTで相談する
                  <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                </a>
              </div>
            </div>

            {/* Prompt Preview Accordion */}
            <div className="mt-3 pt-3 border-t border-slate-700/60">
              <details className="group">
                <summary className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer flex items-center justify-between select-none">
                  <span>生成されるChatGPT相談用プロンプトの内容を確認</span>
                  <span className="text-indigo-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <pre className="mt-2 p-3 bg-slate-950 text-slate-300 font-mono text-[11px] rounded-lg overflow-x-auto max-h-48 border border-slate-800 whitespace-pre-wrap leading-relaxed">
                  {consultationPrompt}
                </pre>
              </details>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
