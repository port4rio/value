import React from 'react';
import { StockMetricHistory } from '../types/stock';

interface SparklineChartProps {
  history?: StockMetricHistory[];
  prices?: number[];
  width?: number;
  height?: number;
  showLabels?: boolean;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({
  history,
  prices,
  width = 84,
  height = 24,
  showLabels = false
}) => {
  const dataPoints = React.useMemo(() => {
    if (prices && prices.length > 0) return prices;
    if (history && history.length > 0) return history.map(h => h.price);
    return [100, 102, 101, 105, 104, 108]; // fallback
  }, [history, prices]);

  if (dataPoints.length < 2) {
    return (
      <div className="text-[10px] text-slate-500 font-mono text-center">
        推移記録中
      </div>
    );
  }

  const min = Math.min(...dataPoints);
  const max = Math.max(...dataPoints);
  const range = max - min === 0 ? 1 : max - min;
  
  const paddingY = 3;
  const paddingX = 2;
  const usableWidth = width - paddingX * 2;
  const usableHeight = height - paddingY * 2;

  const points = dataPoints.map((val, idx) => {
    const x = paddingX + (idx / (dataPoints.length - 1)) * usableWidth;
    const y = height - paddingY - ((val - min) / range) * usableHeight;
    return { x, y, val };
  });

  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  // Fill area under line
  const lastPt = points[points.length - 1];
  const firstPt = points[0];
  const areaD = `${pathD} L ${lastPt.x} ${height} L ${firstPt.x} ${height} Z`;

  const isUp = lastPt.val >= firstPt.val;
  const strokeColor = isUp ? '#34d399' : '#f87171'; // emerald-400 or rose-400
  const fillColor = isUp ? 'rgba(52, 211, 153, 0.15)' : 'rgba(248, 113, 113, 0.15)';

  const changePercent = (((lastPt.val - firstPt.val) / firstPt.val) * 100).toFixed(1);

  return (
    <div className="inline-flex items-center space-x-1.5 group/spark relative">
      <svg 
        width={width} 
        height={height} 
        className="overflow-visible select-none"
        title={`初値: ¥${firstPt.val.toLocaleString()} → 最新: ¥${lastPt.val.toLocaleString()} (${isUp ? '+' : ''}${changePercent}%)`}
      >
        <defs>
          <linearGradient id={`grad-${firstPt.val}-${lastPt.val}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#grad-${firstPt.val}-${lastPt.val})`} />
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        {/* Start dot */}
        <circle cx={firstPt.x} cy={firstPt.y} r="2" fill="#94a3b8" />
        {/* Current / End dot */}
        <circle cx={lastPt.x} cy={lastPt.y} r="2.5" fill={strokeColor} className="animate-ping opacity-30" />
        <circle cx={lastPt.x} cy={lastPt.y} r="2.5" fill={strokeColor} />
      </svg>
      {showLabels && (
        <span className={`text-[10px] font-mono font-semibold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isUp ? '+' : ''}{changePercent}%
        </span>
      )}
    </div>
  );
};
