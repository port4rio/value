import React, { useMemo } from 'react';
import { StockChartData } from '../types';

interface StockCardSparklineProps {
  chartData?: StockChartData | null;
  isLoading?: boolean;
}

export const StockCardSparkline: React.FC<StockCardSparklineProps> = ({
  chartData,
  isLoading = false,
}) => {
  const points = chartData?.points || [];
  const hasData = points.length >= 2;

  const sparkline = useMemo(() => {
    if (!hasData) return null;

    const width = 240;
    const height = 40;
    const paddingTop = 4;
    const paddingBottom = 4;
    const drawHeight = height - paddingTop - paddingBottom;

    let min = Infinity;
    let max = -Infinity;
    for (const p of points) {
      if (p.close < min) min = p.close;
      if (p.close > max) max = p.close;
    }

    const range = max - min || 1;
    const len = points.length;

    const coords = points.map((p, i) => {
      const x = (i / (len - 1)) * width;
      const y = paddingTop + drawHeight * (1 - (p.close - min) / range);
      return { x, y };
    });

    const linePath = coords.reduce((acc, curr, idx) => {
      return idx === 0 ? `M ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}` : `${acc} L ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
    }, '');

    const first = coords[0];
    const last = coords[coords.length - 1];
    const areaPath = `${linePath} L ${last.x.toFixed(1)} ${height} L ${first.x.toFixed(1)} ${height} Z`;

    const isPositive = (chartData?.periodChangePercent ?? 0) >= 0;
    const strokeColor = isPositive ? '#4ade80' : '#f87171';
    const gradId = `sparkGrad-${chartData?.symbol?.replace(/[^a-zA-Z0-9]/g, '') || Math.random().toString(36).slice(2, 7)}`;

    return {
      linePath,
      areaPath,
      last,
      strokeColor,
      gradId,
    };
  }, [points, hasData, chartData?.periodChangePercent, chartData?.symbol]);

  if (isLoading) {
    return (
      <div className="w-full h-9 my-1 rounded bg-[#101813] border border-[#1b2b21] flex items-center justify-center">
        <div className="w-2/3 h-1 bg-[#1e3327] rounded-full animate-pulse" />
      </div>
    );
  }

  if (!sparkline) {
    return (
      <div className="w-full h-9 my-1 rounded bg-[#101813]/60 border border-[#1b2b21]/70 flex items-center justify-center">
        <span className="text-[10px] text-[#557161] font-mono">6ヶ月推移（集計中）</span>
      </div>
    );
  }

  return (
    <div className="w-full h-9 my-1 rounded bg-[#101813]/80 border border-[#1b2b21] relative overflow-hidden flex items-center">
      <svg
        viewBox="0 0 240 40"
        preserveAspectRatio="none"
        className="w-full h-full overflow-visible pointer-events-none"
      >
        <defs>
          <linearGradient id={sparkline.gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={sparkline.strokeColor} stopOpacity="0.28" />
            <stop offset="60%" stopColor={sparkline.strokeColor} stopOpacity="0.08" />
            <stop offset="100%" stopColor={sparkline.strokeColor} stopOpacity="0.00" />
          </linearGradient>
        </defs>

        {/* 基準の薄い中心ガイドライン */}
        <line
          x1="0"
          y1="20"
          x2="240"
          y2="20"
          stroke="#19281f"
          strokeWidth="1"
          strokeDasharray="2 3"
        />

        {/* グラデーション塗り */}
        <path d={sparkline.areaPath} fill={`url(#${sparkline.gradId})`} />

        {/* 折れ線 */}
        <path
          d={sparkline.linePath}
          fill="none"
          stroke={sparkline.strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 終点ドット */}
        <circle
          cx={sparkline.last.x}
          cy={sparkline.last.y}
          r="2.5"
          fill={sparkline.strokeColor}
        />
      </svg>
    </div>
  );
};
