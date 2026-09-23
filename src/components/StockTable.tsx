import React, { useState, useMemo } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Info,
  Sparkles,
} from 'lucide-react';
import { StockItem, SortConfig, SortField } from '../types';
import { STOCK_COLUMNS } from '../data/columns';
import { calculateMetricRanks, getHeatmapStyle } from '../utils/heatmap';

interface StockTableProps {
  stocks: StockItem[];
  sortConfig: SortConfig;
  onSort: (field: SortField) => void;
  onSelectStock: (stock: StockItem) => void;
}

export const StockTable: React.FC<StockTableProps> = ({
  stocks,
  sortConfig,
  onSort,
  onSelectStock,
}) => {
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);

  // 表示中銘柄における各指標の1位〜30位/最下位ランクを計算
  const metricRanks = useMemo(() => {
    return calculateMetricRanks(stocks);
  }, [stocks]);

  return (
    <div className="flex flex-col bg-[#141e18] w-full border border-[#273a2f] rounded-lg shadow-xl overflow-hidden">
      {/* Main Table Container: Full-width, fluid on PC, scrollable on mobile */}
      <div className="relative overflow-x-auto overflow-y-auto max-h-[calc(100vh-80px)] min-h-[500px] w-full">
        <table className="w-full text-xs text-left border-collapse border-spacing-0">
          {/* Table Header */}
          <thead className="bg-[#182720] text-[#cdded4] font-semibold sticky top-0 z-30 shadow-md border-b-2 border-[#2b3f33]">
            <tr>
              {STOCK_COLUMNS.map((col) => {
                const isSorted = sortConfig.key === col.key;
                const isCodeCol = col.key === 'code';
                const isNameCol = col.key === 'name';

                // Sticky positioning: コード(54px幅・中央配置) -> 銘柄名(112px幅, sticky left 54px)
                let stickyClasses = '';
                if (isCodeCol) {
                  stickyClasses = `sticky left-0 z-40 ${
                    isSorted ? 'bg-[#23382c]' : 'bg-[#182720]'
                  } shadow-[1px_0_0_0_#2b3f33] w-[54px] min-w-[54px] max-w-[54px] text-center`;
                } else if (isNameCol) {
                  stickyClasses = `sticky left-[54px] z-40 ${
                    isSorted ? 'bg-[#23382c]' : 'bg-[#182720]'
                  } border-r-2 border-[#2f4539] shadow-[4px_0_8px_-2px_rgba(0,0,0,0.3)] w-[112px] min-w-[112px] max-w-[112px]`;
                }

                return (
                  <th
                    key={col.key}
                    scope="col"
                    onClick={(e) => {
                      (e.currentTarget as HTMLElement).blur();
                      onSort(col.key);
                    }}
                    className={`px-2 py-2.5 select-none cursor-pointer outline-none focus:outline-none focus-visible:outline-none whitespace-nowrap group ${
                      col.minWidth
                    } ${stickyClasses} ${
                      isSorted
                        ? 'bg-[#23382c] text-[#fef08a] font-bold ring-1 ring-inset ring-[#fef08a]/20'
                        : `${isCodeCol || isNameCol ? '' : 'bg-[#182720]'} text-[#cdded4] md:hover:bg-[#203328] md:hover:text-[#f0f5f2]`
                    }`}
                    title={col.tooltip}
                  >
                    <div
                      className={`flex items-center gap-1 ${
                        col.align === 'right'
                          ? 'justify-end'
                          : col.align === 'center'
                          ? 'justify-center'
                          : 'justify-start'
                      }`}
                    >
                      <span className="tracking-tight text-[11px] sm:text-xs">
                        {col.label}
                      </span>
                      {col.unit && (
                        <span className="text-[10px] text-[#789686] font-normal">
                          ({col.unit})
                        </span>
                      )}

                      {/* Sort Direction Indicator (現在選択されている列のみアクティブ表示) */}
                      <span
                        className={`inline-flex ml-0.5 shrink-0 ${
                          isSorted
                            ? 'text-[#fde047]'
                            : 'text-[#486354] group-hover:text-[#9bb3a5]'
                        }`}
                      >
                        {isSorted ? (
                          sortConfig.direction === 'desc' ? (
                            <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
                          ) : (
                            <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                          )
                        ) : (
                          <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
                        )}
                      </span>
                    </div>
                  </th>
                );
              })}
              {/* Extra column for AI diagnosis card modal */}
              <th
                scope="col"
                className="px-2 py-2.5 w-[44px] min-w-[44px] text-center whitespace-nowrap bg-[#182720] text-[#86efac] text-[11px] font-bold"
              >
                AI
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-[#223329] font-mono text-[12px]">
            {stocks.length === 0 ? (
              <tr>
                <td
                  colSpan={STOCK_COLUMNS.length + 1}
                  className="py-20 text-center text-[#7d9b8a] bg-[#141e18]"
                >
                  <div className="max-w-md mx-auto flex flex-col items-center">
                    <Info className="w-8 h-8 text-[#547363] mb-2" />
                    <p className="font-medium text-[#c0d4c8]">
                      条件に一致する銘柄が見つかりませんでした
                    </p>
                    <p className="text-xs text-[#6e8c7c] mt-1">
                      スクリーニング条件を調整してください。
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              stocks.map((stock, rowIndex) => {
                const isHovered = hoveredCode === stock.code;
                const isEven = rowIndex % 2 === 0;

                // Chalkboard row background
                const rowBgClass = isHovered
                  ? 'bg-[#203429]'
                  : isEven
                  ? 'bg-[#141e18]'
                  : 'bg-[#17231c]';

                const stickyCellBg = isHovered
                  ? 'bg-[#203429]'
                  : isEven
                  ? 'bg-[#141e18]'
                  : 'bg-[#17231c]';

                // 各指標のヒートマップスタイル (1位: #CCFF00 -> 20位: 白っぽい文字色 #c5d8cd)
                const dyStyle = getHeatmapStyle(metricRanks.dividend_yield?.get(stock.code));
                const perStyle = getHeatmapStyle(metricRanks.per?.get(stock.code));
                const pbrStyle = getHeatmapStyle(metricRanks.pbr?.get(stock.code));
                const roeStyle = getHeatmapStyle(metricRanks.roe?.get(stock.code));
                const ebitdaStyle = getHeatmapStyle(metricRanks.ebitda_growth?.get(stock.code));
                const eqStyle = getHeatmapStyle(metricRanks.equity_ratio?.get(stock.code));
                const deStyle = getHeatmapStyle(metricRanks.de_ratio?.get(stock.code));
                const crStyle = getHeatmapStyle(metricRanks.current_ratio?.get(stock.code));

                // ソート選択列の統一背景クラス（全列で一貫）
                const sortedColBg = (field: SortField) =>
                  sortConfig.key === field ? 'bg-[#1e2f25]/45' : '';

                return (
                  <tr
                    key={stock.code}
                    onMouseEnter={() => setHoveredCode(stock.code)}
                    onMouseLeave={() => setHoveredCode(null)}
                    onClick={() => onSelectStock(stock)}
                    className={`transition-colors cursor-pointer border-b border-[#1f2f25] ${rowBgClass}`}
                  >
                    {/* Column 1: コード (Sticky Left 0, 幅54px・中央配置でスライド時も隠れない) */}
                    <td
                      className={`px-1 py-2 text-center whitespace-nowrap font-bold sticky left-0 z-20 w-[54px] min-w-[54px] max-w-[54px] ${stickyCellBg} shadow-[1px_0_0_0_#273a2f] ${sortedColBg(
                        'code'
                      )}`}
                    >
                      <div className="w-full flex items-center justify-center">
                        <span className="font-mono text-[#86efac] tracking-wide text-center">
                          {stock.code}
                        </span>
                      </div>
                    </td>

                    {/* Column 2: 銘柄名 (Sticky Left 54px, 112px幅) */}
                    <td
                      className={`px-1.5 py-2 whitespace-nowrap font-sans font-medium text-[#f0f5f2] sticky left-[54px] z-20 w-[112px] min-w-[112px] max-w-[112px] ${stickyCellBg} border-r-2 border-[#2f4539] shadow-[4px_0_8px_-2px_rgba(0,0,0,0.3)] ${sortedColBg(
                        'name'
                      )}`}
                    >
                      <span className="truncate block" title={stock.name}>
                        {stock.name}
                      </span>
                    </td>

                    {/* Column 3: 滞在日数 (銘柄名の右に追加) */}
                    <td
                      className={`px-2.5 py-2 text-right whitespace-nowrap font-medium ${sortedColBg(
                        'stayDays'
                      )}`}
                    >
                      {stock.category === 'sotsugyo' ? (
                        <span className="text-[#f472b6] text-[11px]">卒業</span>
                      ) : stock.stayDays != null ? (
                        <span
                          className={
                            stock.category === 'inokori'
                              ? 'text-[#fde047]'
                              : 'text-[#7dd3fc]'
                          }
                        >
                          {stock.stayDays}日
                        </span>
                      ) : (
                        <span className="text-[#738d7e]">-</span>
                      )}
                    </td>

                    {/* Column 4: 現在値 */}
                    <td
                      className={`px-2 py-2 text-right whitespace-nowrap font-semibold text-[#edf4ef] ${sortedColBg(
                        'close'
                      )}`}
                    >
                      {stock.close != null ? `${stock.close.toLocaleString()}円` : '-'}
                    </td>

                    {/* Column 5: 前日比 (矢印アイコン消去、符号と数値のみ) */}
                    <td
                      className={`px-2 py-2 text-right whitespace-nowrap font-semibold ${sortedColBg(
                        'change'
                      )} ${
                        (stock.change || 0) > 0
                          ? 'text-[#4ade80]'
                          : (stock.change || 0) < 0
                          ? 'text-[#f87171]'
                          : 'text-[#94a89d]'
                      }`}
                    >
                      <span>
                        {stock.change != null
                          ? `${stock.change > 0 ? '+' : ''}${stock.change.toFixed(2)}%`
                          : '-'}
                      </span>
                    </td>

                    {/* Column 6: 時価総額 */}
                    <td
                      className={`px-2 py-2 text-right whitespace-nowrap text-[#d3e3da] ${sortedColBg(
                        'market_cap'
                      )}`}
                    >
                      {stock.market_cap != null ? `${stock.market_cap.toLocaleString()}億` : '-'}
                    </td>

                    {/* Column 7: 配当利回り (枠除去、1位〜30位ヒートマップグラデーション) */}
                    <td
                      className={`px-2.5 py-2 text-right whitespace-nowrap ${sortedColBg(
                        'dividend_yield'
                      )}`}
                      style={{ color: dyStyle.color, fontWeight: dyStyle.fontWeight }}
                    >
                      {stock.dividend_yield != null
                        ? `${stock.dividend_yield.toFixed(2)}%`
                        : '-'}
                    </td>

                    {/* Column 8: 配当性向 (基準となる白っぽい文字色) */}
                    <td
                      className={`px-2.5 py-2 text-right whitespace-nowrap text-[#c5d8cd] ${sortedColBg(
                        'payout_ratio'
                      )}`}
                    >
                      {stock.payout_ratio != null ? `${stock.payout_ratio.toFixed(1)}%` : '-'}
                    </td>

                    {/* Column 9: PER (低い方が良い、1位〜30位ヒートマップグラデーション) */}
                    <td
                      className={`px-2 py-2 text-right whitespace-nowrap ${sortedColBg('per')}`}
                      style={{ color: perStyle.color, fontWeight: perStyle.fontWeight }}
                    >
                      {stock.per != null ? `${stock.per.toFixed(2)}倍` : '-'}
                    </td>

                    {/* Column 10: PBR (低い方が良い、1位〜30位ヒートマップグラデーション) */}
                    <td
                      className={`px-2 py-2 text-right whitespace-nowrap ${sortedColBg('pbr')}`}
                      style={{ color: pbrStyle.color, fontWeight: pbrStyle.fontWeight }}
                    >
                      {stock.pbr != null ? `${stock.pbr.toFixed(2)}倍` : '-'}
                    </td>

                    {/* Column 11: ROE (高い方が良い、1位〜30位ヒートマップグラデーション) */}
                    <td
                      className={`px-2 py-2 text-right whitespace-nowrap ${sortedColBg('roe')}`}
                      style={{ color: roeStyle.color, fontWeight: roeStyle.fontWeight }}
                    >
                      {stock.roe != null ? `${stock.roe.toFixed(2)}%` : '-'}
                    </td>

                    {/* Column 12: EBITDA成長率 (高い方が良い、1位〜30位ヒートマップグラデーション) */}
                    <td
                      className={`px-2.5 py-2 text-right whitespace-nowrap ${sortedColBg(
                        'ebitda_growth'
                      )}`}
                      style={{ color: ebitdaStyle.color, fontWeight: ebitdaStyle.fontWeight }}
                    >
                      {stock.ebitda_growth != null
                        ? `${stock.ebitda_growth > 0 ? '+' : ''}${stock.ebitda_growth.toFixed(2)}%`
                        : '-'}
                    </td>

                    {/* Column 13: 自己資本比率 (枠除去、高い方が良い、1位〜30位ヒートマップグラデーション) */}
                    <td
                      className={`px-2.5 py-2 text-right whitespace-nowrap ${sortedColBg(
                        'equity_ratio'
                      )}`}
                      style={{ color: eqStyle.color, fontWeight: eqStyle.fontWeight }}
                    >
                      {stock.equity_ratio != null
                        ? `${stock.equity_ratio.toFixed(2)}%`
                        : '-'}
                    </td>

                    {/* Column 14: D/Eレシオ (低い方が良い、1位〜30位ヒートマップグラデーション) */}
                    <td
                      className={`px-2 py-2 text-right whitespace-nowrap ${sortedColBg(
                        'de_ratio'
                      )}`}
                      style={{ color: deStyle.color, fontWeight: deStyle.fontWeight }}
                    >
                      {stock.de_ratio != null ? `${stock.de_ratio.toFixed(1)}%` : '-'}
                    </td>

                    {/* Column 15: 流動比率 (高い方が良い、1位〜30位ヒートマップグラデーション) */}
                    <td
                      className={`px-2 py-2 text-right whitespace-nowrap ${sortedColBg(
                        'current_ratio'
                      )}`}
                      style={{ color: crStyle.color, fontWeight: crStyle.fontWeight }}
                    >
                      {stock.current_ratio != null ? `${stock.current_ratio.toFixed(1)}%` : '-'}
                    </td>

                    {/* Column 16: AI Diagnosis Button (Opens compact card modal) */}
                    <td
                      className="px-1.5 py-2 text-center whitespace-nowrap"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectStock(stock);
                      }}
                    >
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectStock(stock);
                          }}
                          title="AI診断・チャート詳細を表示"
                          className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-[#162a1f] hover:bg-[#203a2c] text-[#86efac] border border-[#2b4c39] hover:border-[#4ade80] transition-colors flex items-center gap-1 shadow-xs group"
                        >
                          <Sparkles className="w-2.5 h-2.5 text-[#34d399] group-hover:scale-110 transition-transform" />
                          <span>AI</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
