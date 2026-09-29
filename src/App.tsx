import React, { useState, useEffect, useMemo } from 'react';
import { StockItem, ScreeningCriteria, DEFAULT_CRITERIA, SortConfig, SortField, AlumniCategory } from './types';
import { INITIAL_STOCKS } from './data/initialStocks';
import { fetchScreeningStocks, applyScreeningCriteria } from './services/tradingViewService';
import { Header } from './components/Header';
import { StockTable } from './components/StockTable';
import { StockCardList } from './components/StockCardList';
import { FilterModal } from './components/FilterModal';
import { StockDetailModal } from './components/StockDetailModal';

export default function App() {
  // 1. Core State: 全母集団候補 (allCandidates) と現在のスクリーニング条件
  const [allCandidates, setAllCandidates] = useState<StockItem[]>(INITIAL_STOCKS);
  const [criteria, setCriteria] = useState<ScreeningCriteria>(DEFAULT_CRITERIA);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'market_cap', // Requirement: 初期値は時価総額の降順でソート
    direction: 'desc',
  });
  const [activeCategory, setActiveCategory] = useState<AlumniCategory>('wariyasu');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);

  // 2. Fetching & Status State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('未取得（スクリーニング待ち）');

  // Check if criteria matches default
  const isDefaultCriteria = useMemo(() => {
    return (
      criteria.maxPbr === DEFAULT_CRITERIA.maxPbr &&
      criteria.minRoe === DEFAULT_CRITERIA.minRoe &&
      criteria.minDividendYield === DEFAULT_CRITERIA.minDividendYield &&
      criteria.minEbitdaGrowth === DEFAULT_CRITERIA.minEbitdaGrowth &&
      criteria.minEquityRatio === DEFAULT_CRITERIA.minEquityRatio
    );
  }, [criteria]);

  // 全母集団銘柄に対してスクリーニング条件をリアルタイムに同期適用（0ミリ秒で即座に反映）
  const screenedStocks = useMemo(() => {
    return applyScreeningCriteria(allCandidates, criteria);
  }, [allCandidates, criteria]);

  // Initial fetch and manual refresh
  const loadData = async (activeCriteria: ScreeningCriteria) => {
    setIsLoading(true);
    try {
      const result = await fetchScreeningStocks(activeCriteria);
      if (result.allCandidates && result.allCandidates.length > 0) {
        setAllCandidates(result.allCandidates);
      } else if (result.stocks && result.stocks.length > 0) {
        setAllCandidates(result.stocks);
      }
      setIsLive(result.isLive);
      setLastUpdated(result.timestamp);
    } catch {
      // Fallback already handled inside service
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Attempt live fetch on initial mount
    loadData(criteria);
  }, []);

  // Handle Sort Toggle
  const handleSort = (field: SortField) => {
    setSortConfig((prev) => {
      if (prev.key === field) {
        return {
          key: field,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      } else {
        const defaultAscFields: SortField[] = ['code', 'per', 'pbr', 'de_ratio'];
        return {
          key: field,
          direction: defaultAscFields.includes(field) ? 'asc' : 'desc',
        };
      }
    });
  };

  // Helper to normalize category
  const getCategory = (stock: StockItem): AlumniCategory => {
    if (stock.category === 'sotsugyo') return 'sotsugyo';
    if (stock.category === 'datsuraku') return 'datsuraku';
    if (stock.category === 'shokaku') return 'shokaku';
    if (stock.category === 'wariyasu') return 'wariyasu';
    // Legacy fallback
    if (stock.pbr != null && stock.pbr > 1.2) return 'sotsugyo';
    if (stock.pbr != null && stock.pbr > 1.0) return 'shokaku';
    return 'wariyasu';
  };

  // Category counts (スクリーニングされた銘柄群から算出)
  const categoryCounts = useMemo(() => {
    let wariyasuCount = 0;
    let shokakuCount = 0;
    let sotsugyoCount = 0;
    let datsurakuCount = 0;

    for (const s of screenedStocks) {
      const cat = getCategory(s);
      if (cat === 'wariyasu') wariyasuCount++;
      else if (cat === 'shokaku') shokakuCount++;
      else if (cat === 'sotsugyo') sotsugyoCount++;
      else if (cat === 'datsuraku') datsurakuCount++;
    }

    return { wariyasuCount, shokakuCount, sotsugyoCount, datsurakuCount };
  }, [screenedStocks]);

  // Filter by Category and Sort
  const processedStocks = useMemo(() => {
    let list = screenedStocks.filter((stock) => {
      return getCategory(stock) === activeCategory;
    });

    // Sorting
    list = [...list].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      // Always push null or undefined values to the end
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      // stayDays is always positive integer
      if (sortConfig.key === 'stayDays') {
        aVal = Math.abs(Number(aVal));
        bVal = Math.abs(Number(bVal));
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const cmp = aVal.localeCompare(bVal, 'ja');
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      }

      const numA = Number(aVal);
      const numB = Number(bVal);
      if (isNaN(numA) || isNaN(numB)) return 0;

      if (numA !== numB) {
        return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
      }
      return a.code.localeCompare(b.code);
    });

    return list;
  }, [screenedStocks, activeCategory, sortConfig]);

  return (
    <div className="min-h-screen bg-[#121a15] flex flex-col font-sans text-[#e3ece6]">
      {/* 1. Header with Category Badges [割安組][昇格組][卒業生][脱落者] */}
      <Header
        filteredStocks={processedStocks}
        wariyasuCount={categoryCounts.wariyasuCount}
        shokakuCount={categoryCounts.shokakuCount}
        sotsugyoCount={categoryCounts.sotsugyoCount}
        datsurakuCount={categoryCounts.datsurakuCount}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        isLoading={isLoading}
        isLive={isLive}
        lastUpdated={lastUpdated}
        onRefresh={() => loadData(criteria)}
        onOpenFilterModal={() => setIsFilterModalOpen(true)}
        viewMode={viewMode}
        setViewMode={setViewMode}
        isDefaultCriteria={isDefaultCriteria}
      />

      {/* 2. Main Content: Full-width expansive chalkboard table */}
      <main className="flex-1 w-full px-2 sm:px-4 lg:px-5 py-2 sm:py-3">
        {viewMode === 'table' ? (
          <StockTable
            stocks={processedStocks}
            sortConfig={sortConfig}
            onSort={handleSort}
            onSelectStock={(stock) => setSelectedStock(stock)}
          />
        ) : (
          <StockCardList
            stocks={processedStocks}
            sortConfig={sortConfig}
            onSelectStock={(stock) => setSelectedStock(stock)}
          />
        )}
      </main>

      {/* 3. Footer */}
      <footer className="bg-[#141e18] border-t border-[#24372c] mt-auto py-2 text-center text-xs text-[#739180]">
        <div className="w-full px-4">
          <p className="text-[#5c7767] text-[11px]">
            スクリーニング条件: PBR≦1.2倍・ROE≧7.5%・配当利回り≧3.8%・自己資本比率≧48%・EBITDA成長率≧-10% | 割安組(PBR≦1.0)・昇格組(1.0&lt;PBR≦1.2)・卒業生(PBR&gt;1.2・1年追跡)・脱落者(基準未達・1年追跡)
          </p>
        </div>
      </footer>

      {/* 4. Screening Criteria Adjustment Modal */}
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        criteria={criteria}
        onApply={(newCriteria) => {
          setCriteria(newCriteria);
          loadData(newCriteria);
        }}
        onReset={() => {
          setCriteria(DEFAULT_CRITERIA);
          loadData(DEFAULT_CRITERIA);
        }}
      />

      {/* 5. Stock Details Modal */}
      <StockDetailModal
        stock={selectedStock}
        criteria={criteria}
        stocks={screenedStocks}
        onClose={() => setSelectedStock(null)}
      />
    </div>
  );
}
