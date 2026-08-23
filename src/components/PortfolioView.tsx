import React from 'react';
import { 
  Star, 
  Trash2, 
  Edit3, 
  Plus, 
  TrendingUp, 
  Bot, 
  Sparkles, 
  ArrowUpRight, 
  Download, 
  Upload, 
  Check, 
  Copy, 
  Layers, 
  DollarSign, 
  PieChart, 
  ShieldCheck, 
  Info,
  ExternalLink
} from 'lucide-react';
import { Stock, HoldingItem } from '../types/stock';
import { SparklineChart } from './SparklineChart';
import { generatePortfolioConsultationPrompt, buildChatGPTUrl } from '../utils/chatGptUrlEncoder';

interface PortfolioViewProps {
  stocks: Stock[];
  holdings: Record<string, HoldingItem>;
  onUpdateHolding: (code: string, shares: number, avgPrice: number, notes?: string) => void;
  onRemoveHolding: (code: string) => void;
  onSelectStock: (stock: Stock) => void;
  onOpenAiSummary: (stock: Stock) => void;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  stocks,
  holdings,
  onUpdateHolding,
  onRemoveHolding,
  onSelectStock,
  onOpenAiSummary
}) => {
  const [editingCode, setEditingCode] = React.useState<string | null>(null);
  const [editShares, setEditShares] = React.useState<number>(100);
  const [editPrice, setEditPrice] = React.useState<number>(0);
  const [editNotes, setEditNotes] = React.useState<string>('');
  const [searchToAdd, setSearchToAdd] = React.useState<string>('');
  const [copiedPrompt, setCopiedPrompt] = React.useState<boolean>(false);

  const holdingEntries = Object.entries(holdings) as [string, HoldingItem][];

  // Map holdings to stock objects
  const portfolioItems = React.useMemo(() => {
    return holdingEntries.map(([code, holding]) => {
      const stock = stocks.find(s => s.code === code) || {
        code,
        name: `銘柄 ${code}`,
        market: 'プライム' as const,
        sector: 'その他',
        price: holding.avgPrice || 1000,
        change: 0,
        changePercent: 0,
        dividendYield: 4.0,
        per: 10,
        pbr: 0.8,
        roe: 8,
        equityRatio: 50,
        marketCap: 1000,
        minkabuTheoreticalPrice: (holding.avgPrice || 1000) * 1.3,
        undervaluedScore: 30,
        targetPrice: (holding.avgPrice || 1000) * 1.2,
        minkabuRating: '割安' as const,
        firstDetectedDate: holding.addedAt,
        lastSeenDate: holding.addedAt,
        consecutiveDays: 1,
        totalAppearances: 1,
        status: 'normal_active' as const,
        dividendTrend: 'stable' as const,
        consecutiveDividendHikeYears: 0,
        payoutRatio: 35,
        history: [{ date: holding.addedAt, price: holding.avgPrice || 1000, dividendYield: 4.0, per: 10, pbr: 0.8, inScreener: true }]
      };
      return { stock, holding };
    });
  }, [holdingEntries, stocks]);

  // Calculations
  const totalCost = portfolioItems.reduce((sum, item) => sum + (item.holding.avgPrice * item.holding.shares), 0);
  const totalValue = portfolioItems.reduce((sum, item) => sum + (item.stock.price * item.holding.shares), 0);
  const totalProfit = totalValue - totalCost;
  const totalProfitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
  
  const totalAnnualDividend = portfolioItems.reduce(
    (sum, item) => sum + (item.holding.shares * item.stock.price * (item.stock.dividendYield / 100)),
    0
  );
  const weightedAverageYield = totalValue > 0 ? (totalAnnualDividend / totalValue) * 100 : 0;

  // Generate ChatGPT prompt
  const portfolioPrompt = generatePortfolioConsultationPrompt(portfolioItems);
  const chatGptPortfolioUrl = buildChatGPTUrl(portfolioPrompt);

  const handleStartEdit = (item: { stock: Stock; holding: HoldingItem }) => {
    setEditingCode(item.stock.code);
    setEditShares(item.holding.shares);
    setEditPrice(item.holding.avgPrice);
    setEditNotes(item.holding.notes || '');
  };

  const handleSaveEdit = (code: string) => {
    onUpdateHolding(code, editShares, editPrice, editNotes);
    setEditingCode(null);
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(portfolioPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const candidateStocks = React.useMemo(() => {
    if (!searchToAdd.trim()) return [];
    const q = searchToAdd.toLowerCase();
    return stocks.filter(s => 
      !holdings[s.code] && (s.code.includes(q) || s.name.toLowerCase().includes(q) || s.sector.includes(q))
    ).slice(0, 5);
  }, [searchToAdd, stocks, holdings]);

  return (
    <div className="space-y-6">
      
      {/* Portfolio Top Banner with port4rio branding */}
      <div className="bg-gradient-to-r from-indigo-900/60 via-[#1e293b] to-slate-800 border border-indigo-500/30 rounded-xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                ★
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                port4rio 保有・ウォッチ銘柄ポートフォリオ
              </h2>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                ログイン不要 / LocalStorage保存
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              ブラウザに安全に保存される高配当ポートフォリオ管理機能です。
              年間受取配当額・利回りの自動計算、AI決算サマリー、<strong>ChatGPTへの一括ポートフォリオ診断URL生成</strong>に対応しています。
            </p>
          </div>

          {/* ChatGPT Batch Consultation Button */}
          {portfolioItems.length > 0 && (
            <div className="flex items-center space-x-2 shrink-0">
              <button
                id="copy-portfolio-chatgpt-btn"
                onClick={handleCopyPrompt}
                className="inline-flex items-center px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                title="ChatGPT用プロンプトをクリップボードにコピー"
              >
                {copiedPrompt ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                    コピー完了
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                    プロンプト複製
                  </>
                )}
              </button>

              <a
                id="open-portfolio-chatgpt-btn"
                href={chatGptPortfolioUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center px-4 py-2 text-xs font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-lg transition-all hover:scale-102 cursor-pointer"
              >
                <Bot className="w-4 h-4 mr-1.5 fill-current" />
                ChatGPTに総合相談
                <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Portfolio Aggregate Summary KPIs */}
      {portfolioItems.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          {/* Total Value & Profit */}
          <div className="bg-[#1e293b] p-4 rounded-xl border border-slate-700 shadow-lg">
            <span className="text-[11px] text-slate-400 font-medium block">現在ポートフォリオ評価額</span>
            <div className="text-xl font-extrabold text-slate-100 font-mono mt-1">
              ¥{Math.round(totalValue).toLocaleString()}
            </div>
            <div className={`text-xs font-mono font-semibold mt-0.5 ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {totalProfit >= 0 ? `+¥${Math.round(totalProfit).toLocaleString()}` : `-¥${Math.round(Math.abs(totalProfit)).toLocaleString()}`} ({totalProfitPercent >= 0 ? '+' : ''}{totalProfitPercent.toFixed(2)}%)
            </div>
          </div>

          {/* Annual Expected Dividend Income */}
          <div className="bg-[#1e293b] p-4 rounded-xl border border-slate-700 shadow-lg">
            <span className="text-[11px] text-emerald-400 font-medium block">年間受取予想配当金</span>
            <div className="text-xl font-extrabold text-emerald-400 font-mono mt-1">
              ¥{Math.round(totalAnnualDividend).toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 font-mono mt-0.5">
              月換算: 約 ¥{Math.round(totalAnnualDividend / 12).toLocaleString()} / 月
            </div>
          </div>

          {/* Weighted Average Yield */}
          <div className="bg-[#1e293b] p-4 rounded-xl border border-slate-700 shadow-lg">
            <span className="text-[11px] text-indigo-400 font-medium block">加重平均配当利回り</span>
            <div className="text-xl font-extrabold text-indigo-400 font-mono mt-1">
              {weightedAverageYield.toFixed(2)}%
            </div>
            <div className="text-xs text-slate-400 font-mono mt-0.5">
              元本換算: {totalCost > 0 ? ((totalAnnualDividend / totalCost) * 100).toFixed(2) : '0.00'}%
            </div>
          </div>

          {/* Holdings Count */}
          <div className="bg-[#1e293b] p-4 rounded-xl border border-slate-700 shadow-lg">
            <span className="text-[11px] text-slate-400 font-medium block">登録保有銘柄数</span>
            <div className="text-xl font-extrabold text-slate-100 font-mono mt-1">
              {portfolioItems.length} <span className="text-xs font-normal text-slate-400">銘柄</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              元本計: ¥{Math.round(totalCost).toLocaleString()}
            </div>
          </div>

        </div>
      )}

      {/* Quick Add Stock Search Bar */}
      <div className="bg-[#1e293b] p-4 rounded-xl border border-slate-700 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Plus className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="ウォッチ・保有銘柄を追加（コード・銘柄名で検索）..."
              value={searchToAdd}
              onChange={(e) => setSearchToAdd(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-800/90 border border-slate-700 rounded-lg text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <span className="text-xs text-slate-400">
            一覧テーブルの星アイコン (★) を押しても即時追加できます
          </span>
        </div>

        {/* Candidate Dropdown */}
        {candidateStocks.length > 0 && (
          <div className="mt-2 p-2 bg-slate-800 border border-slate-700 rounded-lg divide-y divide-slate-700/60">
            {candidateStocks.map(stock => (
              <div key={stock.code} className="py-2 px-3 flex items-center justify-between hover:bg-slate-700/50 rounded transition-colors">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-indigo-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                    {stock.code}
                  </span>
                  <span className="text-xs font-bold text-slate-100">{stock.name}</span>
                  <span className="text-[11px] text-slate-400">({stock.sector} • 利回り {stock.dividendYield.toFixed(2)}%)</span>
                </div>
                <button
                  onClick={() => {
                    onUpdateHolding(stock.code, 100, stock.price, '');
                    setSearchToAdd('');
                  }}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded transition-colors cursor-pointer"
                >
                  + ポートフォリオに追加
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Holdings Table */}
      {portfolioItems.length === 0 ? (
        <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-12 text-center shadow-xl">
          <Star className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-200">保有・ウォッチ銘柄がまだ登録されていません</h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
            スクリーニング一覧の各銘柄の「★」アイコンをクリックするか、上の検索バーから銘柄を追加してください。
            ログイン不要でブラウザ内に安全に保存されます。
          </p>
        </div>
      ) : (
        <div className="bg-[#1e293b] rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/60 border-b border-slate-700 text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                  <th className="py-3 px-4">銘柄</th>
                  <th className="py-3 px-3 text-center">推移</th>
                  <th className="py-3 px-3 text-right">保有株数 / 取得単価</th>
                  <th className="py-3 px-3 text-right">現在株価</th>
                  <th className="py-3 px-3 text-right">評価額 / 評価損益</th>
                  <th className="py-3 px-3 text-right">配当利回り / 予想配当額</th>
                  <th className="py-3 px-3 text-right">PBR / PER</th>
                  <th className="py-3 px-4 text-center">AI・操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-xs sm:text-sm">
                {portfolioItems.map(({ stock, holding }) => {
                  const isEditing = editingCode === stock.code;
                  const itemValue = stock.price * holding.shares;
                  const itemCost = holding.avgPrice * holding.shares;
                  const itemProfit = itemValue - itemCost;
                  const itemProfitPct = itemCost > 0 ? (itemProfit / itemCost) * 100 : 0;
                  const itemDividend = holding.shares * stock.price * (stock.dividendYield / 100);

                  return (
                    <tr key={stock.code} className="hover:bg-slate-800/40 transition-colors group">
                      
                      {/* Stock Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => onRemoveHolding(stock.code)}
                            className="text-amber-400 hover:text-rose-400 transition-colors p-1 cursor-pointer"
                            title="ポートフォリオから解除"
                          >
                            <Star className="w-4 h-4 fill-current" />
                          </button>
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-mono font-bold text-indigo-400 bg-slate-900 px-1.5 py-0.5 rounded text-xs border border-slate-700">
                                {stock.code}
                              </span>
                              <button
                                onClick={() => onSelectStock(stock)}
                                className="font-bold text-slate-100 hover:text-indigo-300 transition-colors text-left cursor-pointer"
                              >
                                {stock.name}
                              </button>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {stock.sector} • {stock.market}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 1-Line Sparkline Chart */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <SparklineChart history={stock.history} width={76} height={20} />
                      </td>

                      {/* Shares & Avg Price (Editable) */}
                      <td className="py-3 px-3 text-right whitespace-nowrap font-mono">
                        {isEditing ? (
                          <div className="space-y-1 inline-block text-left">
                            <div className="flex items-center space-x-1">
                              <span className="text-[10px] text-slate-400">株数:</span>
                              <input
                                type="number"
                                value={editShares}
                                onChange={(e) => setEditShares(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-20 px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                              />
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-[10px] text-slate-400">単価:</span>
                              <input
                                type="number"
                                value={editPrice}
                                onChange={(e) => setEditPrice(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-20 px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                              />
                            </div>
                            <div className="flex items-center space-x-1 justify-end pt-1">
                              <button
                                onClick={() => handleSaveEdit(stock.code)}
                                className="px-2 py-0.5 text-[10px] font-bold text-slate-900 bg-emerald-400 rounded cursor-pointer"
                              >
                                保存
                              </button>
                              <button
                                onClick={() => setEditingCode(null)}
                                className="px-2 py-0.5 text-[10px] text-slate-400 bg-slate-800 rounded cursor-pointer"
                              >
                                戻る
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div onClick={() => handleStartEdit({ stock, holding })} className="cursor-pointer hover:bg-slate-800/60 p-1 rounded transition-colors inline-block text-right" title="クリックして株数・単価を編集">
                            <div className="font-bold text-slate-100">
                              {holding.shares.toLocaleString()} 株
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center justify-end gap-1">
                              <span>取得: ¥{holding.avgPrice.toLocaleString()}</span>
                              <Edit3 className="w-2.5 h-2.5 text-slate-500 opacity-0 group-hover:opacity-100" />
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Current Price */}
                      <td className="py-3 px-3 text-right whitespace-nowrap font-mono">
                        <div className="font-bold text-slate-100">
                          ¥{stock.price.toLocaleString()}
                        </div>
                        <div className={`text-[11px] font-medium ${stock.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {stock.change >= 0 ? `+${stock.change}` : stock.change} ({stock.changePercent >= 0 ? `+${stock.changePercent}%` : `${stock.changePercent}%`})
                        </div>
                      </td>

                      {/* Valuation & Profit */}
                      <td className="py-3 px-3 text-right whitespace-nowrap font-mono">
                        <div className="font-bold text-slate-100">
                          ¥{Math.round(itemValue).toLocaleString()}
                        </div>
                        <div className={`text-[11px] font-bold ${itemProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {itemProfit >= 0 ? `+¥${Math.round(itemProfit).toLocaleString()}` : `-¥${Math.round(Math.abs(itemProfit)).toLocaleString()}`} ({itemProfitPct >= 0 ? '+' : ''}{itemProfitPct.toFixed(1)}%)
                        </div>
                      </td>

                      {/* Dividend Yield & Expected Payout */}
                      <td className="py-3 px-3 text-right whitespace-nowrap font-mono">
                        <div className="font-bold text-emerald-400">
                          {stock.dividendYield.toFixed(2)}%
                        </div>
                        <div className="text-[11px] text-slate-400">
                          年 ¥{Math.round(itemDividend).toLocaleString()}
                        </div>
                      </td>

                      {/* PBR & PER */}
                      <td className="py-3 px-3 text-right whitespace-nowrap font-mono text-xs">
                        <div className="text-slate-200">PBR {stock.pbr.toFixed(2)}倍</div>
                        <div className="text-slate-400 text-[11px]">PER {stock.per.toFixed(1)}倍</div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => onOpenAiSummary(stock)}
                            className="inline-flex items-center px-2 py-1 text-[11px] font-semibold text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-500/30 rounded transition-colors cursor-pointer"
                            title="AI決算・財務サマリーとChatGPT相談"
                          >
                            <Sparkles className="w-3 h-3 mr-1" />
                            AIサマリー
                          </button>
                          <a
                            href={buildChatGPTUrl(generatePortfolioConsultationPrompt([{ stock, holding }]))}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-slate-400 hover:text-emerald-400 bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer"
                            title="この銘柄の保有継続をChatGPTに相談"
                          >
                            <Bot className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3.5 bg-slate-900/60 border-t border-slate-700/80 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>※ 保有株数や取得単価をクリックすると直接数値を編集できます。データはブラウザのLocalStorageに保存されます。</span>
            <span className="font-mono text-slate-300">合計受取見込配当: ¥{Math.round(totalAnnualDividend).toLocaleString()} / 年</span>
          </div>
        </div>
      )}

    </div>
  );
};
