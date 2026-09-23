import React, { useMemo } from 'react';
import { StockItem, SortConfig } from '../types';
import { TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { calculateMetricRanks, getStockMetricStyle } from '../utils/heatmap';

interface StockCardListProps {
  stocks: StockItem[];
  sortConfig: SortConfig;
  onSelectStock: (stock: StockItem) => void;
}

export const StockCardList: React.FC<StockCardListProps> = ({
  stocks,
  sortConfig,
  onSelectStock,
}) => {
  // 表示中銘柄における各指標のランクを計算（テーブルと同一のヒートマップ評価）
  const metricRanks = useMemo(() => {
    return calculateMetricRanks(stocks);
  }, [stocks]);

  if (stocks.length === 0) {
    return (
      <div className="py-20 text-center text-[#7d9b8a] bg-[#141e18] rounded-xl border border-[#273a2f]">
        <p className="font-medium text-[#c0d4c8]">条件に一致する銘柄が見つかりませんでした</p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-5 bg-[#121a15] min-h-[500px]">
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {stocks.map((stock, index) => {
          const dyStyle = getStockMetricStyle('dividend_yield', stock, metricRanks);
          const pbrStyle = getStockMetricStyle('pbr', stock, metricRanks);
          const perStyle = getStockMetricStyle('per', stock, metricRanks);
          const roeStyle = getStockMetricStyle('roe', stock, metricRanks);
          const eqStyle = getStockMetricStyle('equity_ratio', stock, metricRanks);
          const ebitdaStyle = getStockMetricStyle('ebitda_growth', stock, metricRanks);

          return (
            <div
              key={stock.code}
              onClick={() => onSelectStock(stock)}
              className="bg-[#16221c] rounded-xl p-4 border border-[#273a2f] shadow-md hover:border-[#3d5948] hover:bg-[#1a2821] transition-all cursor-pointer relative group flex flex-col justify-between"
            >
              {/* Top row: Code, Name, Price */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#101813] text-[#86efac] border border-[#273a2f]">
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
                            🎓 卒業生
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-[#f0f5f2] text-base tracking-tight truncate max-w-[170px] mt-1">
                        {stock.name}
                      </h3>
                      {stock.category === 'sotsugyo' && stock.graduationReason && (
                        <p className="text-[11px] text-[#f472b6] truncate max-w-[200px] mt-0.5">
                          {stock.graduationReason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-bold text-[#f0f5f2] text-base font-mono">
                      {stock.close != null ? `${stock.close.toLocaleString()}円` : '-'}
                    </div>
                    <div
                      className={`text-xs font-semibold text-right ${
                        (stock.change || 0) > 0
                          ? 'text-[#4ade80]'
                          : (stock.change || 0) < 0
                          ? 'text-[#f87171]'
                          : 'text-[#8ba295]'
                      }`}
                    >
                      <span>
                        {stock.change != null
                          ? `${stock.change > 0 ? '+' : ''}${stock.change.toFixed(2)}%`
                          : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5指標を1行配置: 配当, PBR, PER, ROE, 資本（良い値からパッとしない値への文字色グラデーション適用） */}
                <div className="grid grid-cols-5 gap-1 text-center bg-[#101813] rounded-lg p-2 my-2.5 border border-[#223329] text-xs font-mono whitespace-nowrap">
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

                {/* Secondary metrics */}
                <div className="flex items-center justify-between text-[11px] text-[#8aa596] px-1 font-mono">
                  <span>
                    時価総額: <strong className="text-[#d8e8de] font-sans">{stock.market_cap ? `${stock.market_cap}億` : '-'}</strong>
                  </span>
                  <span>
                    配当性向: <strong className="text-[#c5d8cd]">{stock.payout_ratio ? `${stock.payout_ratio.toFixed(1)}%` : '-'}</strong>
                  </span>
                  <span>
                    成長率: <strong style={ebitdaStyle}>{stock.ebitda_growth ? `${stock.ebitda_growth > 0 ? '+' : ''}${stock.ebitda_growth.toFixed(1)}%` : '-'}</strong>
                  </span>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-3 pt-2.5 border-t border-[#223329] flex items-center justify-between text-xs">
                <span className="text-[#597364] text-[11px]">#{index + 1}</span>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <a
                    href={`https://finance.yahoo.co.jp/quote/${stock.code}.T`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#fde047] hover:text-[#fef08a] bg-[#223026] px-2 py-1 rounded border border-[#354f3e] transition-colors"
                  >
                    <span>チャート</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
