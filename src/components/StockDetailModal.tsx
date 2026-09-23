import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  ExternalLink,
  Sparkles,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Calendar,
  AlertTriangle,
  Building2,
  PieChart,
  ShieldCheck,
  Zap,
  MessageSquareShare,
} from 'lucide-react';
import { StockItem, ScreeningCriteria, StockChartData, StockAiDiagnosisResponse } from '../types';
import { fetchStockChart, fetchAiDiagnosis, createChatGptConsultUrl } from '../services/aiService';
import { StockMiniChart } from './StockMiniChart';
import { calculateMetricRanks, getStockMetricStyle } from '../utils/heatmap';

interface StockDetailModalProps {
  stock: StockItem | null;
  criteria: ScreeningCriteria;
  stocks?: StockItem[];
  onClose: () => void;
}

export const StockDetailModal: React.FC<StockDetailModalProps> = ({
  stock,
  criteria,
  stocks,
  onClose,
}) => {
  const [chartData, setChartData] = useState<StockChartData | null>(null);
  const [isChartLoading, setIsChartLoading] = useState<boolean>(false);

  const [aiData, setAiData] = useState<StockAiDiagnosisResponse | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // 全銘柄に対する順位マップを計算（テーブル・カードと同一のヒートマップ評価）
  const metricRanks = useMemo(() => {
    if (stocks && stocks.length > 0) {
      return calculateMetricRanks(stocks);
    }
    return undefined;
  }, [stocks]);

  // チャート取得
  const loadChart = useCallback(async (code: string) => {
    setIsChartLoading(true);
    try {
      const data = await fetchStockChart(code);
      setChartData(data);
    } catch {
      setChartData(null);
    } finally {
      setIsChartLoading(false);
    }
  }, []);

  // AI診断取得
  const loadAiDiagnosis = useCallback(
    async (targetStock: StockItem, force = false) => {
      setIsAiLoading(true);
      setAiError(null);
      try {
        const res = await fetchAiDiagnosis(targetStock, force);
        if (res && res.success) {
          setAiData(res);
        } else {
          setAiError('診断データの取得に失敗しました');
        }
      } catch (err: any) {
        setAiError(err.message || 'AI診断通信エラー');
      } finally {
        setIsAiLoading(false);
      }
    },
    []
  );

  // 銘柄が切り替わったときにチャートとAI診断を読み込み
  useEffect(() => {
    if (!stock) {
      setChartData(null);
      setAiData(null);
      setAiError(null);
      return;
    }
    loadChart(stock.code);
    loadAiDiagnosis(stock, false);
  }, [stock, loadChart, loadAiDiagnosis]);

  if (!stock) return null;

  // ChatGPTに相談するURLを生成（AI診断サマリーは省き、財務指標中心のシンプルな依頼文）
  const chatGptUrl = createChatGptConsultUrl(stock);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#16221c] rounded-xl sm:rounded-2xl max-w-[540px] w-full shadow-2xl border border-[#273a2f] overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#e3ece6] flex flex-col my-auto max-h-[96vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Card Header: 銘柄情報・在籍バッジ・株価 */}
        <div className="px-2.5 py-2.5 sm:px-4 sm:py-3 bg-[#18261f] border-b border-[#24372c]">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-[#101813] text-[#86efac] border border-[#273a2f]">
                  {stock.code}
                </span>
                {stock.category === 'inokori' && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-[#2a2614] text-[#fde047] border border-[#52451c]">
                    居残り{stock.stayDays}日
                  </span>
                )}
                {stock.category === 'tennyu' && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-[#13232b] text-[#7dd3fc] border border-[#213f4e]">
                    転入{stock.stayDays}日
                  </span>
                )}
                {stock.category === 'sotsugyo' && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-[#2b1725] text-[#f472b6] border border-[#542347]">
                    卒業生（追跡）
                  </span>
                )}
              </div>
              <h2 className="font-bold text-[#f0f5f2] text-base sm:text-lg tracking-tight truncate max-w-[280px] sm:max-w-none mt-1">
                {stock.name}
              </h2>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <div className="font-bold text-[#f0f5f2] text-base sm:text-lg font-mono">
                  {stock.close != null ? `${stock.close.toLocaleString()}円` : '-'}
                </div>
                <div
                  className={`text-xs font-semibold text-right flex items-center justify-end gap-0.5 ${
                    (stock.change || 0) > 0
                      ? 'text-[#4ade80]'
                      : (stock.change || 0) < 0
                      ? 'text-[#f87171]'
                      : 'text-[#8ba295]'
                  }`}
                >
                  {(stock.change || 0) > 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (stock.change || 0) < 0 ? (
                    <TrendingDown className="w-3 h-3" />
                  ) : null}
                  <span>
                    {stock.change != null
                      ? `${stock.change > 0 ? '+' : ''}${stock.change.toFixed(2)}%`
                      : '-'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#749182] hover:text-[#f0f5f2] hover:bg-[#25392e] transition-colors ml-0.5"
                aria-label="閉じる"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 5指標を1行配置（配当・PBR・PER・ROE・資本）良い値からパッとしない値への文字色グラデーション適用 */}
          {(() => {
            const dyStyle = getStockMetricStyle('dividend_yield', stock, metricRanks);
            const pbrStyle = getStockMetricStyle('pbr', stock, metricRanks);
            const perStyle = getStockMetricStyle('per', stock, metricRanks);
            const roeStyle = getStockMetricStyle('roe', stock, metricRanks);
            const eqStyle = getStockMetricStyle('equity_ratio', stock, metricRanks);

            return (
              <div className="grid grid-cols-5 gap-0.5 sm:gap-1 text-center bg-[#101813] rounded-lg p-1.5 mt-2 border border-[#223329] font-mono text-xs whitespace-nowrap">
                <div>
                  <span className="text-[10px] text-[#8ea899] font-sans block">配当</span>
                  <span
                    style={dyStyle}
                    className="text-[11px] sm:text-xs"
                  >
                    {stock.dividend_yield != null ? `${stock.dividend_yield.toFixed(1)}%` : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8ea899] font-sans block">PBR</span>
                  <span
                    style={pbrStyle}
                    className="text-[11px] sm:text-xs"
                  >
                    {stock.pbr != null ? `${stock.pbr.toFixed(2)}倍` : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8ea899] font-sans block">PER</span>
                  <span
                    style={perStyle}
                    className="text-[11px] sm:text-xs"
                  >
                    {stock.per != null ? `${stock.per.toFixed(1)}倍` : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8ea899] font-sans block">ROE</span>
                  <span
                    style={roeStyle}
                    className="text-[11px] sm:text-xs"
                  >
                    {stock.roe != null ? `${stock.roe.toFixed(1)}%` : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8ea899] font-sans block">資本</span>
                  <span
                    style={eqStyle}
                    className="text-[11px] sm:text-xs"
                  >
                    {stock.equity_ratio != null ? `${stock.equity_ratio.toFixed(0)}%` : '-'}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Scrollable Body: 6ヶ月チャート ＋ 毎週土曜 Ai診断 ＋ アクションボタン */}
        <div className="p-2 sm:p-3.5 space-y-2.5 overflow-y-auto flex-1">
          {/* 1. Yahoo!ファイナンス風 6ヶ月チャート */}
          <div>
            <StockMiniChart
              chartData={chartData}
              isLoading={isChartLoading}
              onRefresh={() => loadChart(stock.code)}
              code={stock.code}
            />
          </div>

          {/* 2. 毎週土曜 Ai診断 セクション */}
          <div className="bg-[#121c16] rounded-xl p-2.5 sm:p-3.5 border border-[#24372c]">
            {/* AI Header */}
            <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-[#1f2f25]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center shadow-xs shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <span className="text-sm sm:text-base font-bold text-[#f0f5f2] block leading-tight">
                    AIバリュースコープ
                  </span>
                  <span className="text-[11px] text-[#718f80] flex items-center gap-1 font-mono mt-0.5">
                    <Calendar className="w-3 h-3 text-[#34d399]" />
                    <span>毎週土曜 AI診断</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#182a20] text-[#86efac] border border-[#274433] font-medium">
                  gemini
                </span>
                <button
                  type="button"
                  onClick={() => loadAiDiagnosis(stock, true)}
                  disabled={isAiLoading}
                  title="最新データで再診断"
                  className="p-1 rounded text-[#719080] hover:text-[#f0f5f2] hover:bg-[#1f3127] transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* AI Content */}
            {isAiLoading && (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-[#80a492]">
                <RefreshCw className="w-5 h-5 animate-spin text-[#10b981]" />
                <span>gemini で診断中...</span>
              </div>
            )}

            {aiError && !isAiLoading && (
              <div className="p-3 rounded-lg bg-[#271515] border border-[#542525] text-xs text-[#fca5a5] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="flex-1">{aiError}</span>
                <button
                  type="button"
                  onClick={() => loadAiDiagnosis(stock, true)}
                  className="text-xs underline font-medium hover:text-white"
                >
                  再試行
                </button>
              </div>
            )}

            {!isAiLoading && aiData && (
              <div className="space-y-2.5">
                {/* 1. 事業特色 */}
                <div className="p-2.5 sm:p-3 rounded-lg bg-[#18261e] border border-[#273d30]">
                  <div className="text-xs font-bold text-[#86efac] flex items-center gap-1.5 mb-1">
                    <Building2 className="w-3.5 h-3.5 text-[#34d399] shrink-0" />
                    <span>事業特色</span>
                  </div>
                  <p className="text-[#f0f7f2] font-medium text-[13px] sm:text-sm leading-relaxed">
                    {aiData.diagnosis.business_summary}
                  </p>
                </div>

                {/* 2. 投資妙味と割安要因 */}
                <div className="p-2.5 sm:p-3 rounded-lg bg-[#18261e] border border-[#273d30]">
                  <div className="text-xs font-bold text-[#fde047] flex items-center gap-1.5 mb-1">
                    <PieChart className="w-3.5 h-3.5 text-[#facc15] shrink-0" />
                    <span>投資妙味と割安要因</span>
                  </div>
                  <p className="text-[#e2eee7] text-[13px] sm:text-sm leading-relaxed">
                    {aiData.diagnosis.valuation_appeal}
                  </p>
                </div>

                {/* 3. 配当の持続性と株主還元方針 */}
                <div className="p-2.5 sm:p-3 rounded-lg bg-[#18261e] border border-[#273d30]">
                  <div className="text-xs font-bold text-[#67e8f9] flex items-center gap-1.5 mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#22d3ee] shrink-0" />
                    <span>配当の持続性と株主還元方針</span>
                  </div>
                  <p className="text-[#e2eee7] text-[13px] sm:text-sm leading-relaxed">
                    {aiData.diagnosis.dividend_sustainability}
                  </p>
                </div>

                {/* 4. PBR是正や株価上昇カタリスト */}
                <div className="p-2.5 sm:p-3 rounded-lg bg-[#18261e] border border-[#273d30]">
                  <div className="text-xs font-bold text-[#c084fc] flex items-center gap-1.5 mb-1">
                    <Zap className="w-3.5 h-3.5 text-[#a855f7] shrink-0" />
                    <span>PBR是正・株価上昇カタリスト</span>
                  </div>
                  <p className="text-[#e2eee7] text-[13px] sm:text-sm leading-relaxed">
                    {aiData.diagnosis.catalyst}
                  </p>
                </div>

                {/* 5. 注意すべきリスク要因 (文字を一段階大きく・はっきり視認) */}
                <div className="p-2.5 sm:p-3 rounded-lg bg-[#241a1a] border border-[#482828]">
                  <div className="text-xs font-bold text-[#f87171] flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#ef4444] shrink-0" />
                    <span>注意すべきリスク要因</span>
                  </div>
                  <p className="text-[#fce7e7] text-[13px] sm:text-sm leading-relaxed">
                    {aiData.diagnosis.risks}
                  </p>
                </div>

                {/* 診断日メタ情報 */}
                <div className="flex items-center justify-between text-[11px] text-[#698877] pt-1 px-1 font-mono">
                  <span>診断日: {aiData.diagnosedDateLabel}</span>
                  <span>{aiData.nextDiagnosisLabel}</span>
                </div>
              </div>
            )}
          </div>

          {/* スクロール最下部アクション（ChatGPTに相談 ＆ Y!finance / 株探 / 閉じる） */}
          <div className="pt-2 flex flex-col gap-2 pb-1">
            {/* ChatGPTに相談ボタン */}
            <a
              href={chatGptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#10a37f] via-[#0d9488] to-[#047857] hover:from-[#0fa680] hover:to-[#059669] text-white text-xs font-bold shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.99] border border-[#22c55e]/30 group"
            >
              <MessageSquareShare className="w-3.5 h-3.5 text-white group-hover:rotate-6 transition-transform" />
              <span>ChatGPTに相談</span>
              <ExternalLink className="w-3 h-3 text-white/80 ml-auto" />
            </a>

            {/* 1行アクションボタン（Y!finance 株探 閉じる） */}
            <div className="grid grid-cols-3 gap-2">
              <a
                href={`https://finance.yahoo.co.jp/quote/${stock.code}.T`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-2 rounded-lg bg-[#18261e] border border-[#273d30] hover:border-[#3d5948] text-[#9fc7b0] hover:text-[#f0f5f2] text-xs font-medium flex items-center justify-center gap-1 transition-colors whitespace-nowrap"
              >
                <span>Y!finance</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
              <a
                href={`https://kabutan.jp/stock/?code=${stock.code}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-2 rounded-lg bg-[#18261e] border border-[#273d30] hover:border-[#3d5948] text-[#9fc7b0] hover:text-[#f0f5f2] text-xs font-medium flex items-center justify-center gap-1 transition-colors whitespace-nowrap"
              >
                <span>株探</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
              <button
                type="button"
                onClick={onClose}
                className="py-2 px-2 rounded-lg bg-[#18261e] border border-[#273d30] text-[#7d998b] hover:text-[#f0f5f2] text-xs font-medium hover:bg-[#203328] transition-colors whitespace-nowrap text-center"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
