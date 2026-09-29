import React from 'react';
import { RefreshCw, Download, SlidersHorizontal, Table, LayoutGrid } from 'lucide-react';
import { StockItem, AlumniCategory } from '../types';
import { exportStocksToCsv } from '../utils/exportCsv';

interface HeaderProps {
  filteredStocks: StockItem[];
  wariyasuCount: number;
  shokakuCount: number;
  sotsugyoCount: number;
  taigakuCount: number;
  activeCategory: AlumniCategory;
  setActiveCategory: (category: AlumniCategory) => void;
  isLoading: boolean;
  isLive: boolean;
  lastUpdated: string;
  onRefresh: () => void;
  onOpenFilterModal: () => void;
  viewMode: 'table' | 'cards';
  setViewMode: (mode: 'table' | 'cards') => void;
  isDefaultCriteria: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  filteredStocks,
  wariyasuCount,
  shokakuCount,
  sotsugyoCount,
  taigakuCount,
  activeCategory,
  setActiveCategory,
  isLoading,
  onRefresh,
  onOpenFilterModal,
  viewMode,
  setViewMode,
  isDefaultCriteria,
}) => {
  return (
    <header className="bg-[#16221c] border-b-2 border-[#2b3d33] sticky top-0 z-50 shadow-md">
      <div className="w-full px-3 sm:px-5 py-2">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5">
          {/* Left: Sister Site Dual Tabs [🫜Port4rio] + [バリュー株同窓会] & Classification Tabs */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            {/* Dual Tabs: [🫜 Port4rio] [バリュー株同窓会] */}
            <div className="flex items-center bg-[#0d1611] p-1 rounded-xl border border-[#23352b] shadow-inner">
              {/* Tab 1: 姉妹サイト 🫜 Port4rio */}
              <a
                href="https://port4rio.github.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#142019] hover:bg-[#1b2b22] text-[#d6e4dc] hover:text-white border border-[#273d30] transition-all select-none shadow-xs"
                title="姉妹サイト「Port4rio」へ移動（別タブで開く）"
              >
                <span className="text-base leading-none group-hover:scale-110 transition-transform">🫜</span>
                <span className="font-extrabold tracking-tight text-sm sm:text-base font-display">
                  Port<span className="text-[#38bdf8]">4</span>rio
                </span>
                <span className="text-[10px] text-[#4f6b5c] group-hover:text-[#38bdf8] transition-colors">↗</span>
              </a>

              {/* Tab 2: バリュー株同窓会 (アクティブタブ) */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#203a2c] border border-[#3a684e] text-white shadow-sm select-none relative">
                <span className="text-base leading-none">🗿</span>
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-[#f3f7f4] font-display whitespace-nowrap">
                  バリュー株同窓会
                </h1>
              </div>
            </div>

            {/* Classification Tabs: [割安組] [昇格組] [卒業生] [脱落者] */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* 割安組 (PBR <= 1.0) */}
              <button
                type="button"
                onClick={(e) => {
                  (e.currentTarget as HTMLElement).blur();
                  setActiveCategory('wariyasu');
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all outline-none focus:outline-none ${
                  activeCategory === 'wariyasu'
                    ? 'bg-[#1b382b] text-[#86efac] border border-[#2e5941] shadow-sm ring-1 ring-[#4ade80]/20 font-bold'
                    : 'bg-[#121c17] text-[#8ea89b] md:hover:text-[#f0f5f2] border border-[#23352b] md:hover:bg-[#18261f]'
                }`}
                title="王道バリュー（PBR≦1.0倍・スクリーニング基準クリア）"
              >
                <span>割安組</span>
                <span className="font-mono font-bold text-[#86efac]">{wariyasuCount}</span>
              </button>

              {/* 昇格組 (1.0 < PBR <= 1.2) */}
              <button
                type="button"
                onClick={(e) => {
                  (e.currentTarget as HTMLElement).blur();
                  setActiveCategory('shokaku');
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all outline-none focus:outline-none ${
                  activeCategory === 'shokaku'
                    ? 'bg-[#332c16] text-[#fde047] border border-[#665421] shadow-sm ring-1 ring-[#fde047]/20 font-bold'
                    : 'bg-[#121c17] text-[#8ea89b] md:hover:text-[#f0f5f2] border border-[#23352b] md:hover:bg-[#18261f]'
                }`}
                title="卒業を目指す有望株（1.0<PBR≦1.2倍・スクリーニング基準クリア）"
              >
                <span>昇格組</span>
                <span className="font-mono font-bold text-[#fde047]">{shokakuCount}</span>
              </button>

              {/* 卒業生 (PBR > 1.2, 1年追跡) */}
              <button
                type="button"
                onClick={(e) => {
                  (e.currentTarget as HTMLElement).blur();
                  setActiveCategory('sotsugyo');
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all outline-none focus:outline-none ${
                  activeCategory === 'sotsugyo'
                    ? 'bg-[#361a2e] text-[#f472b6] border border-[#6b2554] shadow-sm ring-1 ring-[#f472b6]/20 font-bold'
                    : 'bg-[#121c17] text-[#8ea89b] md:hover:text-[#f0f5f2] border border-[#23352b] md:hover:bg-[#18261f]'
                }`}
                title="名誉の卒業（株価上昇によりPBR1.2倍超達成・1年間追跡中）"
              >
                <span>卒業生</span>
                <span className="font-mono font-bold text-[#f472b6]">{sotsugyoCount}</span>
              </button>

              {/* 脱落者 (利回り低下、減配、ROE低下、財務悪化等, 1年追跡) */}
              <button
                type="button"
                onClick={(e) => {
                  (e.currentTarget as HTMLElement).blur();
                  setActiveCategory('taigaku');
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all outline-none focus:outline-none ${
                  activeCategory === 'taigaku' || (activeCategory as string) === 'datsuraku'
                    ? 'bg-[#281b36] text-[#c084fc] border border-[#58337a] shadow-sm ring-1 ring-[#c084fc]/20 font-bold'
                    : 'bg-[#121c17] text-[#8ea89b] md:hover:text-[#f0f5f2] border border-[#23352b] md:hover:bg-[#18261f]'
                }`}
                title="基準未達（利回り低下・減配・ROE低下・財務悪化等により脱落・1年間追跡中）"
              >
                <span>脱落者</span>
                <span className="font-mono font-bold text-[#c084fc]">{taigakuCount}</span>
              </button>
            </div>
          </div>

          {/* Right: Controls (Search abolished as requested) */}
          <div className="flex items-center gap-2 self-end lg:self-center">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#101813] p-0.5 rounded-lg border border-[#27382d] text-xs">
              <button
                type="button"
                onClick={(e) => {
                  (e.currentTarget as HTMLElement).blur();
                  setViewMode('table');
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium transition-colors outline-none focus:outline-none ${
                  viewMode === 'table'
                    ? 'bg-[#22352b] text-[#fef08a] shadow-xs font-bold'
                    : 'text-[#7d9989] hover:text-[#e1ebe5]'
                }`}
                title="全画面・黒板表表示"
              >
                <Table className="w-3 h-3" />
                <span>表</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  (e.currentTarget as HTMLElement).blur();
                  setViewMode('cards');
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium transition-colors outline-none focus:outline-none ${
                  viewMode === 'cards'
                    ? 'bg-[#22352b] text-[#fef08a] shadow-xs font-bold'
                    : 'text-[#7d9989] hover:text-[#e1ebe5]'
                }`}
                title="カード形式で表示"
              >
                <LayoutGrid className="w-3 h-3" />
                <span>カード</span>
              </button>
            </div>

            {/* Filter settings button */}
            <button
              type="button"
              onClick={(e) => {
                (e.currentTarget as HTMLElement).blur();
                onOpenFilterModal();
              }}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors relative outline-none focus:outline-none ${
                !isDefaultCriteria
                  ? 'bg-[#2a2c17] border-[#6b6727] text-[#fef08a] font-bold'
                  : 'bg-[#192720] border-[#2c4034] text-[#cfded5] hover:bg-[#203129]'
              }`}
              title="スクリーニング基準の調整・絞込"
            >
              <SlidersHorizontal className="w-3 h-3 text-[#9ab3a5]" />
              <span>絞込</span>
              {!isDefaultCriteria && (
                <span className="w-2 h-2 rounded-full bg-[#facc15] absolute -top-0.5 -right-0.5 shadow-sm"></span>
              )}
            </button>

            {/* CSV Export */}
            <button
              type="button"
              onClick={(e) => {
                (e.currentTarget as HTMLElement).blur();
                exportStocksToCsv(filteredStocks);
              }}
              disabled={filteredStocks.length === 0}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-[#192720] border border-[#2c4034] text-[#cfded5] hover:bg-[#203129] transition-colors disabled:opacity-40 outline-none focus:outline-none"
              title="CSV形式でダウンロード"
            >
              <Download className="w-3 h-3 text-[#9ab3a5]" />
              <span>CSV</span>
            </button>

            {/* Refresh Button - Icon only */}
            <button
              type="button"
              onClick={(e) => {
                (e.currentTarget as HTMLElement).blur();
                onRefresh();
              }}
              disabled={isLoading}
              className="flex items-center justify-center p-1.5 rounded-lg bg-[#192720] border border-[#2c4034] text-[#86efac] hover:bg-[#203129] hover:text-[#bbf7d0] transition-colors disabled:opacity-40 outline-none focus:outline-none"
              title="最新データを再取得（ページ再読み込み）"
              aria-label="最新データを再取得"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
