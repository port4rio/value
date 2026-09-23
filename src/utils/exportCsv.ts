import { StockItem } from '../types';
import { STOCK_COLUMNS } from '../data/columns';

export function exportStocksToCsv(stocks: StockItem[], filename = 'バリュー株同窓会_スクリーニング結果.csv') {
  if (!stocks || stocks.length === 0) return;

  const headers = STOCK_COLUMNS.map((col) => `"${col.label}${col.unit ? `(${col.unit})` : ''}"`).join(',');

  const rows = stocks.map((stock) => {
    return STOCK_COLUMNS.map((col) => {
      const val = stock[col.key];
      if (val === null || val === undefined) return '""';
      if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
      return val;
    }).join(',');
  });

  const csvContent = '\uFEFF' + [headers, ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
