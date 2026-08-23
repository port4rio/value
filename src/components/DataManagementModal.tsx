import React, { useState } from 'react';
import { 
  Download, 
  Upload, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  X, 
  FileText,
  Database
} from 'lucide-react';
import { Stock } from '../types/stock';
import { INITIAL_STOCKS } from '../data/mockStocks';

interface DataManagementModalProps {
  stocks: Stock[];
  onUpdateStocks: (newStocks: Stock[]) => void;
  onClose: () => void;
}

export const DataManagementModal: React.FC<DataManagementModalProps> = ({
  stocks,
  onUpdateStocks,
  onClose
}) => {
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // JSON Export
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(stocks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `minkabu_stocks_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = ['コード', '銘柄名', '市場', '業種', '株価', '配当利回り(%)', 'PBR', 'PER', 'みんかぶ理論株価', '割安度(%)', 'ステータス', '連続日数', '自己資本比率(%)'];
    const rows = stocks.map(s => [
      s.code,
      `"${s.name}"`,
      s.market,
      s.sector,
      s.price,
      s.dividendYield,
      s.pbr,
      s.per,
      s.minkabuTheoreticalPrice,
      s.undervaluedScore,
      s.status,
      s.consecutiveDays,
      s.equityRatio
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `minkabu_screening_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // JSON Import
  const handleImportJSON = () => {
    try {
      const parsed = JSON.parse(importText);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].code) {
        onUpdateStocks(parsed);
        setImportStatus('インポートが完了しました！');
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setImportStatus('エラー: 有効な銘柄配列JSONフォーマットではありません。');
      }
    } catch (e) {
      setImportStatus('エラー: JSONの構文解析に失敗しました。');
    }
  };

  // Reset to default
  const handleResetData = () => {
    if (window.confirm('データを初期状態に戻しますか？')) {
      onUpdateStocks(INITIAL_STOCKS);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#1e293b] rounded-2xl border border-slate-700 shadow-2xl w-full max-w-2xl overflow-hidden text-slate-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-slate-100">データ管理（入出力・初期化）</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6 text-xs sm:text-sm">
          
          {/* Export Section */}
          <div>
            <h4 className="font-bold text-slate-100 mb-2">1. データのエクスポート（ダウンロード）</h4>
            <p className="text-xs text-slate-400 mb-3">
              現在追跡中（{stocks.length}件）の割安高配当銘柄および過去推移データをファイル保存できます。
            </p>
            <div className="flex items-center space-x-3">
              <button
                id="export-json-btn"
                onClick={handleExportJSON}
                className="inline-flex items-center px-3.5 py-2 rounded-lg font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-1.5 text-slate-400" />
                JSON形式で保存
              </button>
              <button
                id="export-csv-btn"
                onClick={handleExportCSV}
                className="inline-flex items-center px-3.5 py-2 rounded-lg font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
              >
                <FileText className="w-4 h-4 mr-1.5 text-slate-400" />
                Excel用 CSV形式で保存
              </button>
            </div>
          </div>

          {/* Import Section */}
          <div className="pt-4 border-t border-slate-700/80">
            <h4 className="font-bold text-slate-100 mb-2">2. JSONデータの直接インポート</h4>
            <p className="text-xs text-slate-400 mb-2">
              GitHub Actions等で生成された最新の `stocks.json` データを貼り付けて反映できます。
            </p>
            <textarea
              id="import-json-textarea"
              rows={4}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='[ { "code": "8058", "name": "三菱商事", ... } ]'
              className="w-full p-2.5 bg-slate-800/80 border border-slate-700 rounded-lg font-mono text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {importStatus && (
              <div className={`mt-2 text-xs font-semibold ${importStatus.includes('エラー') ? 'text-rose-400' : 'text-emerald-400'}`}>
                {importStatus}
              </div>
            )}
            <div className="mt-2 flex justify-end">
              <button
                id="import-json-submit-btn"
                onClick={handleImportJSON}
                disabled={!importText.trim()}
                className="inline-flex items-center px-4 py-2 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow-md"
              >
                <Upload className="w-4 h-4 mr-1.5" />
                インポートを実行
              </button>
            </div>
          </div>

          {/* Reset Section */}
          <div className="pt-4 border-t border-slate-700/80 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-100 text-xs">3. 初期データへのリセット</h4>
              <p className="text-[11px] text-slate-400">
                標準のサンプルデータ（35銘柄の履歴）へ復元します。
              </p>
            </div>
            <button
              onClick={handleResetData}
              className="px-3 py-1.5 text-xs font-semibold text-rose-400 bg-rose-950/40 hover:bg-rose-900/50 rounded-lg border border-rose-500/30 transition-colors"
            >
              初期化する
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
