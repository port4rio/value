import React, { useState, useMemo, useRef, useCallback } from 'react';
import { StockChartData, ChartPoint } from '../types';
import { ExternalLink, RefreshCw } from 'lucide-react';

interface StockMiniChartProps {
  chartData: StockChartData | null;
  isLoading: boolean;
  onRefresh?: () => void;
  code: string;
}

export const StockMiniChart: React.FC<StockMiniChartProps> = ({
  chartData,
  isLoading,
  onRefresh,
  code,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const points = chartData?.points || [];
  const hasData = points.length > 1;

  // チャートの座標計算
  const chartMetrics = useMemo(() => {
    if (!hasData) return null;

    const width = 420;
    const height = 160;
    const padding = { top: 16, right: 8, bottom: 26, left: 42 };

    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    points.forEach((p) => {
      if (p.low < minPrice) minPrice = p.low;
      if (p.high > maxPrice) maxPrice = p.high;
    });

    // 余白を持たせる
    const priceRange = maxPrice - minPrice || 1;
    const yMin = Math.max(0, minPrice - priceRange * 0.05);
    const yMax = maxPrice + priceRange * 0.05;
    const yRange = yMax - yMin;

    const coords = points.map((p, i) => {
      const x = padding.left + (i / (points.length - 1)) * innerWidth;
      const y = padding.top + innerHeight - ((p.close - yMin) / yRange) * innerHeight;
      return { x, y, point: p, index: i };
    });

    // SVG パス生成
    const linePath = coords.reduce((acc, curr, idx) => {
      return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
    }, '');

    const firstPoint = coords[0];
    const lastPoint = coords[coords.length - 1];
    const areaPath = `${linePath} L ${lastPoint.x} ${padding.top + innerHeight} L ${firstPoint.x} ${padding.top + innerHeight} Z`;

    // 水平グリッド線（4段階）
    const gridLines = [0, 0.33, 0.66, 1].map((ratio) => {
      const price = yMin + yRange * ratio;
      const y = padding.top + innerHeight - ratio * innerHeight;
      return {
        y,
        price: Math.round(price),
      };
    });

    // X軸の月別ラベル抽出（重複しない月）
    const monthLabels: { x: number; label: string }[] = [];
    let lastMonth = '';
    coords.forEach((c) => {
      const m = c.point.date.slice(5, 7); // '04', '05' など
      if (m !== lastMonth) {
        lastMonth = m;
        const monthNum = parseInt(m, 10);
        monthLabels.push({
          x: c.x,
          label: `${monthNum}月`,
        });
      }
    });

    return {
      width,
      height,
      padding,
      innerWidth,
      innerHeight,
      coords,
      linePath,
      areaPath,
      gridLines,
      monthLabels,
      minPrice,
      maxPrice,
    };
  }, [points, hasData]);

  // マウス/タッチ移動ハンドラ
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!chartMetrics || !chartMetrics.coords.length) return;
      const svgRect = e.currentTarget.getBoundingClientRect();
      const clientX = e.clientX - svgRect.left;
      const ratio = clientX / svgRect.width;
      const svgX = ratio * chartMetrics.width;

      // 最も近いデータポイントを探索
      let closestIdx = 0;
      let minDiff = Infinity;
      chartMetrics.coords.forEach((c, idx) => {
        const diff = Math.abs(c.x - svgX);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });
      setHoverIndex(closestIdx);
    },
    [chartMetrics]
  );

  const handlePointerLeave = useCallback(() => {
    setHoverIndex(null);
  }, []);

  const activePoint =
    hoverIndex != null && points[hoverIndex]
      ? points[hoverIndex]
      : points[points.length - 1];

  const activeCoord =
    hoverIndex != null && chartMetrics?.coords[hoverIndex]
      ? chartMetrics.coords[hoverIndex]
      : chartMetrics?.coords[chartMetrics.coords.length - 1];

  const isPositive = (chartData?.periodChangePercent || 0) >= 0;
  const strokeColor = isPositive ? '#4ade80' : '#f87171';
  const fillColor = isPositive ? '#4ade80' : '#f87171';

  return (
    <div
      ref={containerRef}
      className="bg-[#121c16] rounded-xl p-2 sm:p-3 border border-[#24372c] relative overflow-hidden"
    >
      {/* Chart Header */}
      <div className="flex items-center justify-between gap-1 mb-1.5 whitespace-nowrap">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-bold text-[#f0f5f2] tracking-wide flex items-center gap-1 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
            6ヵ月推移
          </span>
          <span className="text-[10px] text-[#6e8a7c] font-mono truncate">
            {chartData
              ? `${chartData.startDate.slice(5)}〜${chartData.endDate.slice(5)}`
              : ''}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              title="チャートを再取得"
              className="p-1 rounded text-[#719080] hover:text-[#e4efe8] hover:bg-[#1a2b22] transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
          <a
            href={`https://finance.yahoo.co.jp/quote/${code}.T`}
            target="_blank"
            rel="noopener noreferrer"
            title="Yahoo!ファイナンスで詳細チャートを見る"
            className="flex items-center gap-0.5 text-[10px] text-[#79d4a2] hover:text-[#9ef0c0] hover:underline px-1.5 py-0.5 rounded bg-[#16271e] border border-[#274233]"
          >
            <span>Y!株価</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>

      {/* Chart High/Low & Status Bar (矢印・余分なスペースを排除し、完全1行化) */}
      {chartData && (
        <div className="flex items-baseline justify-between mb-1 text-xs whitespace-nowrap font-mono">
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-sm text-[#f0f5f2]">
              {activePoint ? `${activePoint.close.toLocaleString()}円` : '-'}
            </span>
            <span
              className={`text-xs font-semibold ${
                isPositive ? 'text-[#4ade80]' : 'text-[#f87171]'
              }`}
            >
              6ヵ月:{isPositive ? '+' : ''}
              {chartData.periodChangePercent}%
            </span>
          </div>

          <div className="text-[11px] text-[#8ea899] flex items-center gap-1.5">
            <span>高{chartData.highPrice.toLocaleString()}</span>
            <span>/</span>
            <span>安{chartData.lowPrice.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Chart Canvas (SVG) */}
      <div className="relative w-full h-[160px] select-none">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#121c16]/80 backdrop-blur-xs">
            <div className="flex items-center gap-2 text-xs text-[#80a492]">
              <RefreshCw className="w-4 h-4 animate-spin text-[#4ade80]" />
              <span>チャート読み込み中...</span>
            </div>
          </div>
        )}

        {!isLoading && !hasData && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-[#6e8a7c]">
            チャートデータが取得できませんでした
          </div>
        )}

        {chartMetrics && (
          <svg
            viewBox={`0 0 ${chartMetrics.width} ${chartMetrics.height}`}
            className="w-full h-full cursor-crosshair overflow-visible"
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
          >
            <defs>
              {/* グラデーション塗り */}
              <linearGradient id={`areaGrad-${code}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={fillColor} stopOpacity="0.28" />
                <stop offset="60%" stopColor={fillColor} stopOpacity="0.08" />
                <stop offset="100%" stopColor={fillColor} stopOpacity="0.00" />
              </linearGradient>
            </defs>

            {/* 水平グリッド線 & 価格ラベル */}
            {chartMetrics.gridLines.map((gl, i) => (
              <g key={i}>
                <line
                  x1={chartMetrics.padding.left}
                  y1={gl.y}
                  x2={chartMetrics.width - chartMetrics.padding.right}
                  y2={gl.y}
                  stroke="#1e3025"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <text
                  x={chartMetrics.padding.left - 5}
                  y={gl.y + 4}
                  textAnchor="end"
                  className="text-[11px] fill-[#8ea899] font-mono font-medium select-none"
                >
                  {gl.price}
                </text>
              </g>
            ))}

            {/* 月別X軸ラベル */}
            {chartMetrics.monthLabels.map((ml, i) => (
              <text
                key={i}
                x={ml.x}
                y={chartMetrics.height - 6}
                textAnchor="middle"
                className="text-[11px] fill-[#8ea899] font-mono font-medium select-none"
              >
                {ml.label}
              </text>
            ))}

            {/* エリアグラデーション */}
            <path d={chartMetrics.areaPath} fill={`url(#areaGrad-${code})`} />

            {/* 折れ線 */}
            <path
              d={chartMetrics.linePath}
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* ホバー時の垂直線と点 */}
            {activeCoord && hoverIndex != null && (
              <g>
                <line
                  x1={activeCoord.x}
                  y1={chartMetrics.padding.top}
                  x2={activeCoord.x}
                  y2={chartMetrics.height - chartMetrics.padding.bottom}
                  stroke="#86efac"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <circle
                  cx={activeCoord.x}
                  cy={activeCoord.y}
                  r="4"
                  fill="#86efac"
                  stroke="#121c16"
                  strokeWidth="2"
                />
              </g>
            )}
          </svg>
        )}

        {/* ホバー時のインタラクティブツールチップ */}
        {activePoint && hoverIndex != null && activeCoord && (
          <div
            className="absolute top-1 pointer-events-none z-20 bg-[#16271e] text-[#f0f5f2] text-[10px] px-2 py-1 rounded shadow-lg border border-[#2e4738] font-mono whitespace-nowrap"
            style={{
              left: `${Math.min(
                Math.max(10, (activeCoord.x / 420) * 100),
                80
              )}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="text-[#8ba797] text-[9px]">{activePoint.date}</div>
            <div className="font-bold text-[#86efac]">
              終値: {activePoint.close.toLocaleString()}円
            </div>
            <div className="text-[9px] text-[#b8d1c3]">
              高: {activePoint.high.toLocaleString()} / 安: {activePoint.low.toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
