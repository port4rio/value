import React, { useState } from 'react';
import { 
  GitBranch, 
  Copy, 
  Check, 
  Terminal, 
  Play, 
  ExternalLink, 
  Clock, 
  ShieldCheck, 
  Sparkles,
  FileCode,
  Globe,
  ArrowRight,
  Database,
  Calendar,
  AlertTriangle,
  Cpu,
  HelpCircle
} from 'lucide-react';
import { 
  DAILY_WORKFLOW_YML, 
  WEEKEND_AI_WORKFLOW_YML, 
  SCRAPER_SCRIPT, 
  GITHUB_SETUP_STEPS 
} from '../data/githubWorkflowTemplates';

interface GitHubSetupModalProps {
  onClose?: () => void;
  isModal?: boolean;
}

export const GitHubSetupModal: React.FC<GitHubSetupModalProps> = ({
  onClose,
  isModal = false
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<'daily_yml' | 'weekend_ai_yml' | 'scraper'>('daily_yml');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationLog, setSimulationLog] = useState<string[]>([]);

  const getActiveCode = () => {
    switch (activeCodeTab) {
      case 'daily_yml':
        return DAILY_WORKFLOW_YML;
      case 'weekend_ai_yml':
        return WEEKEND_AI_WORKFLOW_YML;
      case 'scraper':
        return SCRAPER_SCRIPT;
      default:
        return DAILY_WORKFLOW_YML;
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(getActiveCode());
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setSimulationLog(['[GitHub Actions] Triggered: .github/workflows/daily_screen.yml (15:37 JST)']);

    setTimeout(() => {
      setSimulationLog(prev => [...prev, '✓ Step 1: Checkout repository & setup Node.js 20']);
    }, 400);

    setTimeout(() => {
      setSimulationLog(prev => [
        ...prev, 
        '✓ Step 2: Executing scripts/fetch_minkabu.mjs...',
        '  > Target: Minkabu Screener (PER<=15, PBR<=1.0, Yield>=3%, Equity>=50%, SalesCAGR>=2%, ROE>=8%)',
        '  > Fetching Pages 1 to 3 with browser user-agent & delay jitter...',
        '  > Total 48 valid undervalued high-dividend stocks detected.',
        '  > [Idempotency Check] Verified lastSeenDate to prevent double-counting consecutive days.'
      ]);
    }, 1100);

    setTimeout(() => {
      setSimulationLog(prev => [
        ...prev, 
        '✓ Step 3: Updated public/data/stocks.json & snapshots.json (Approx. 45 KB total)',
        '✓ Step 4: Committing diff & Deploying to GitHub Pages...',
        '🎉 SUCCESS: Site & database updated with 0 server cost!'
      ]);
      setIsSimulating(false);
    }, 2100);
  };

  const content = (
    <div className="space-y-6">
      
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#1e293b] to-slate-800 text-slate-100 rounded-xl p-5 sm:p-6 border border-slate-700 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <GitBranch className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                GitHub Pages & Actions 自動追跡システム仕様
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-3xl leading-relaxed">
              外部サーバー・有料DB不要（<strong className="text-emerald-400">完全永久無料</strong>）。
              <strong>平日 15:37 JST</strong>（引け後）にみんかぶを巡回し、<strong>土曜 09:07 JST</strong>（API無料枠余裕時）にAI診断を実行します。
            </p>
          </div>

          <div className="shrink-0 flex sm:flex-col gap-2">
            <button
              id="simulate-github-action-btn"
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-xs font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 transition-colors shadow-lg cursor-pointer"
            >
              <Play className={`w-3.5 h-3.5 mr-1.5 fill-current ${isSimulating ? 'animate-spin' : ''}`} />
              <span>{isSimulating ? 'シミュレーション中...' : '動作シミュレーション'}</span>
            </button>
          </div>
        </div>

        {/* Live Simulation Output Box */}
        {simulationLog.length > 0 && (
          <div className="mt-4 p-3 bg-slate-950/90 rounded-lg border border-slate-700 text-xs font-mono text-emerald-400 space-y-1">
            {simulationLog.map((log, idx) => (
              <div key={idx} className={log.includes('SUCCESS') ? 'text-emerald-300 font-bold' : ''}>
                {log}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Target Screening Condition & Anti-Scraping Strategy Card */}
      <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-5 shadow-xl">
        <h3 className="text-sm sm:text-base font-bold text-slate-100 mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4 text-indigo-400" />
          スクリーニング条件 & 巡回設定 (Minkabu Search)
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-3 text-xs">
          <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
            <span className="text-[10px] text-slate-400 block">予想PER</span>
            <span className="font-mono font-bold text-indigo-300">15.0倍 以下</span>
          </div>
          <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
            <span className="text-[10px] text-slate-400 block">実績PBR</span>
            <span className="font-mono font-bold text-indigo-300">1.00倍 以下</span>
          </div>
          <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
            <span className="text-[10px] text-slate-400 block">配当利回り</span>
            <span className="font-mono font-bold text-emerald-400">3.0% 以上</span>
          </div>
          <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
            <span className="text-[10px] text-slate-400 block">自己資本比率</span>
            <span className="font-mono font-bold text-slate-200">50% 以上</span>
          </div>
          <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
            <span className="text-[10px] text-slate-400 block">3年売上成長</span>
            <span className="font-mono font-bold text-slate-200">2.0% 以上</span>
          </div>
          <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
            <span className="text-[10px] text-slate-400 block">予想ROE</span>
            <span className="font-mono font-bold text-amber-300">8.0% 以上 (降順)</span>
          </div>
        </div>

        <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 text-xs space-y-1.5 font-mono text-slate-300">
          <div className="text-slate-400 text-[11px] font-sans">
            巡回対象URL（page=1〜3を順次取得、上位約50〜60銘柄）:
          </div>
          <div className="text-indigo-300 break-all select-all bg-slate-950 p-2 rounded border border-slate-800 text-[11px]">
            https://minkabu.jp/stock/search?view=result&page=1&sort_key=roe&order=desc&minimum_purchase_price[0]=min&minimum_purchase_price[1]=max&market_capitalization[0]=min&market_capitalization[1]=max&per[0]=min&per[1]=15&pbr[0]=min&pbr[1]=1&dividend_yield[0]=3&dividend_yield[1]=max&capital_adequacy_ratio[0]=50&capital_adequacy_ratio[1]=max&sales_cagr_3y[0]=2&sales_cagr_3y[1]=max&roe[0]=8&roe[1]=max
          </div>
          <div className="text-[11px] text-slate-400 font-sans pt-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>ブロック回避対策: 一般的なChrome/macOSのUser-Agent・Sec-CH-UAヘッダーを送信し、ページ間に3〜5秒のランダムジッタースリープを自動挿入。</span>
          </div>
        </div>
      </div>

      {/* Execution Schedule & Idempotency Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Schedule */}
        <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-5 shadow-xl">
          <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            自動実行スケジュール設定
          </h3>
          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
              <div className="flex items-center justify-between font-bold text-slate-100 mb-1">
                <span>① 日次スクリーニング</span>
                <span className="font-mono text-emerald-400">平日 15:37 (JST)</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                東京市場大引け（15:30）の7分後に起動。page 1〜3 を巡回し、割安度・連続滞在日数を更新してGitHub Pagesへ即時デプロイ。
              </p>
            </div>

            <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
              <div className="flex items-center justify-between font-bold text-slate-100 mb-1">
                <span>② 週末AI一括診断</span>
                <span className="font-mono text-indigo-400">土曜 09:07 (JST)</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                平日に決算短信要約等で使用したGemini無料枠がリセットされた週末朝に、上位スクリーニング銘柄の割安理由・持続力・リスクを一括診断。
              </p>
            </div>
          </div>
        </div>

        {/* Idempotency & Safe Manual Execution */}
        <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-5 shadow-xl">
          <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            二重処理・二重カウント防止仕様 (冪等性)
          </h3>
          <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700 text-xs text-slate-300 space-y-2">
            <p className="text-[11px] leading-relaxed">
              手動実行（<code className="text-indigo-300 bg-slate-900 px-1 py-0.5 rounded">workflow_dispatch</code>）やエラー再試行を行っても、<strong>日数の重複加算やデータの破損は一切起きません</strong>。
            </p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
              <li><strong className="text-slate-200">当日判定フラグ:</strong> <code>lastSeenDate === today</code> の場合、滞在日数（consecutiveDays）や登場回数は加算せず最新値のみ置換。</li>
              <li><strong className="text-slate-200">履歴レコード:</strong> 同日の推移データ（history）は追記ではなく当日最新データで上書き。</li>
              <li><strong className="text-slate-200">AI診断:</strong> 直近7日以内に診断済みの銘柄は自動でスキップし、無料API枠の無駄遣いを防止。</li>
            </ul>
          </div>
        </div>

      </div>

      {/* Database & Storage Size Calculation Card */}
      <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-5 shadow-xl">
        <h3 className="text-sm sm:text-base font-bold text-slate-100 mb-3 flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          データベース方式とデータ容量の試算
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          
          <div className="space-y-2 text-slate-300">
            <h4 className="font-bold text-indigo-300">【推奨方式】リポジトリ内 JSON ファイルDB</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              外部DB（PostgreSQLやFirestore等）を契約せず、GitHubリポジトリ内の <code className="text-slate-200">public/data/stocks.json</code> および <code className="text-slate-200">snapshots.json</code> に記録する方式です。
            </p>
            <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-0.5">
              <li>コスト: <strong>完全永久無料</strong>（DB維持費 0円）</li>
              <li>バックアップ: Gitコミット履歴そのものがタイムマシン履歴</li>
              <li>配信速度: GitHub PagesのCDNから1リクエストで超高速ロード</li>
            </ul>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-xs">
            <h4 className="font-bold text-slate-200 mb-2">【データ容量の試算 (50銘柄の場合)】</h4>
            <div className="space-y-1 text-[11px] font-mono">
              <div className="flex justify-between text-slate-400 border-b border-slate-800 pb-1">
                <span>1銘柄あたりの基本情報</span>
                <span className="text-slate-200">約 0.8 KB</span>
              </div>
              <div className="flex justify-between text-slate-400 border-b border-slate-800 py-1">
                <span>年間株価・指標履歴 (250営業日分)</span>
                <span className="text-slate-200">約 12.5 KB / 銘柄</span>
              </div>
              <div className="flex justify-between text-slate-400 border-b border-slate-800 py-1">
                <span>AI決算・財務サマリーテキスト</span>
                <span className="text-slate-200">約 1.5 KB / 銘柄</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-bold pt-1">
                <span>50銘柄 × 1年分の合計データ量</span>
                <span>約 750 KB 〜 1 MB</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 font-sans">
              ※ 5年間運用しても約 5MB 程度。GitHub Pagesの無料容量枠（1GB）の <strong>0.5% 未満</strong> のため、容量制限の心配は一切ありません。
            </p>
          </div>

        </div>
      </div>

      {/* Code Templates Tabs (Workflow vs Scraper) */}
      <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-700/80 mb-4 gap-2">
          
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveCodeTab('daily_yml')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                activeCodeTab === 'daily_yml'
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              daily_screen.yml (平日15:37)
            </button>
            <button
              onClick={() => setActiveCodeTab('weekend_ai_yml')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                activeCodeTab === 'weekend_ai_yml'
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              weekend_ai_diagnosis.yml (土曜09:07)
            </button>
            <button
              onClick={() => setActiveCodeTab('scraper')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                activeCodeTab === 'scraper'
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              scripts/fetch_minkabu.mjs
            </button>
          </div>

          <button
            onClick={handleCopyCode}
            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
          >
            {copiedCode ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                コピー完了！
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1 text-slate-400" />
                コードをコピー
              </>
            )}
          </button>

        </div>

        {/* Code View */}
        <pre className="p-4 bg-slate-950 text-slate-200 text-xs font-mono rounded-xl overflow-x-auto max-h-96 leading-relaxed border border-slate-800">
          <code>{getActiveCode()}</code>
        </pre>
      </div>

    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
        <div className="bg-[#1e293b] rounded-2xl border border-slate-700 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 relative text-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-100">GitHub Actions & Pages 自動連携設定</h2>
            <button
              onClick={onClose}
              className="px-3 py-1 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg cursor-pointer"
            >
              閉じる
            </button>
          </div>
          {content}
        </div>
      </div>
    );
  }

  return content;
};
