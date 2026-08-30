import React, { useState, useMemo, useEffect } from 'react';
import { 
  Header 
} from './components/Header';
import { 
  MetricOverviewCards 
} from './components/MetricOverviewCards';
import { 
  CategoryTabs 
} from './components/CategoryTabs';
import { 
  FilterBar 
} from './components/FilterBar';
import { 
  StockTable 
} from './components/StockTable';
import { 
  ChronicValueView 
} from './components/ChronicValueView';
import { 
  RareUndervaluedView 
} from './components/RareUndervaluedView';
import { 
  GraduatedStocksView 
} from './components/GraduatedStocksView';
import { 
  HistorySnapshotView 
} from './components/HistorySnapshotView';
import { 
  PortfolioView 
} from './components/PortfolioView';
import { 
  StockDetailModal 
} from './components/StockDetailModal';
import { 
  AiFinancialSummaryModal 
} from './components/AiFinancialSummaryModal';
import { 
  GitHubSetupModal 
} from './components/GitHubSetupModal';
import { 
  DataManagementModal 
} from './components/DataManagementModal';

import { Stock, FilterState, ScreeningSnapshot, TabType, HoldingItem, SortKey, AiSummaryItem } from './types/stock';
import { INITIAL_STOCKS, MOCK_SNAPSHOTS } from './data/mockStocks';

export default function App() {
  // 1. Data States
  const [stocks, setStocks] = useState<Stock[]>(() => {
    const saved = localStorage.getItem('minkabu_tracker_stocks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved stocks', e);
      }
    }
    return INITIAL_STOCKS;
  });

  const [aiSummaries, setAiSummaries] = useState<Record<string, AiSummaryItem>>(() => {
    const saved = localStorage.getItem('ai_financial_summaries');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse cached ai summaries', e);
      }
    }
    return {};
  });

  // Attempt to fetch fresh static data from public/data/stocks.json, snapshots.json, and ai_summaries.json
  useEffect(() => {
    async function loadStaticData() {
      const baseUrl = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
      const timestamp = Date.now();

      try {
        const stocksRes = await fetch(`${baseUrl}data/stocks.json?t=${timestamp}`, { cache: 'no-cache' });
        if (stocksRes.ok) {
          const freshStocks = await stocksRes.json();
          if (Array.isArray(freshStocks) && freshStocks.length > 0) {
            setStocks(freshStocks);
            localStorage.setItem('minkabu_tracker_stocks', JSON.stringify(freshStocks));
          }
        }
      } catch (err) {
        // Fallback silently to localStorage or mock
      }

      try {
        const snapshotsRes = await fetch(`${baseUrl}data/snapshots.json?t=${timestamp}`, { cache: 'no-cache' });
        if (snapshotsRes.ok) {
          const freshSnapshots = await snapshotsRes.json();
          if (Array.isArray(freshSnapshots) && freshSnapshots.length > 0) {
            setSnapshots(freshSnapshots);
          }
        }
      } catch (err) {
        // Fallback silently
      }

      try {
        const aiRes = await fetch(`${baseUrl}data/ai_summaries.json?t=${timestamp}`, { cache: 'no-cache' });
        if (aiRes.ok) {
          const freshAi = await aiRes.json();
          if (freshAi && typeof freshAi === 'object' && Object.keys(freshAi).length > 0) {
            setAiSummaries(freshAi);
            localStorage.setItem('ai_financial_summaries', JSON.stringify(freshAi));
          }
        }
      } catch (err) {
        // Fallback silently
      }
    }

    loadStaticData();
  }, []);

  // 2. port4rio Holdings State (LocalStorage, no login required)
  const [holdings, setHoldings] = useState<Record<string, HoldingItem>>(() => {
    const saved = localStorage.getItem('port4rio_holdings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse port4rio holdings', e);
      }
    }
    // Pre-populate with a couple of default holdings for a great initial experience
    return {
      '8058': { code: '8058', shares: 200, avgPrice: 2850, addedAt: '2026-08-01', notes: '商社セクター主力・累進配当' },
      '5401': { code: '5401', shares: 300, avgPrice: 3200, addedAt: '2026-08-10', notes: 'PBR0.6倍台・割安高配当' }
    };
  });

  const [snapshots, setSnapshots] = useState<ScreeningSnapshot[]>(MOCK_SNAPSHOTS);
  const [lastUpdated, setLastUpdated] = useState('2026-08-22 18:00 (JST)');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 3. Navigation & Selection States
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [aiSummaryStock, setAiSummaryStock] = useState<Stock | null>(null);
  const [selectedSnapshotDate, setSelectedSnapshotDate] = useState<string>('2026-08-22');

  // 4. Modals
  const [isGitHubSetupModalOpen, setIsGitHubSetupModalOpen] = useState(false);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);

  // 5. Filter & View Mode State
  const [filter, setFilter] = useState<FilterState>({
    search: '',
    tab: 'all',
    sector: 'all',
    market: 'all',
    minYield: 3.0,
    maxPer: 25.0,
    maxPbr: 1.8,
    minMarketCap: 0,
    minEquityRatio: 0,
    sortBy: 'roe',
    sortOrder: 'desc',
    onlyHighFinancialHealth: false,
    onlyDividendHike: false,
    viewMode: 'standard'
  });

  // Save to localStorage when stocks or holdings change
  useEffect(() => {
    localStorage.setItem('minkabu_tracker_stocks', JSON.stringify(stocks));
  }, [stocks]);

  useEffect(() => {
    localStorage.setItem('port4rio_holdings', JSON.stringify(holdings));
  }, [holdings]);

  // Holdings Management Handlers
  const handleToggleHolding = (stock: Stock) => {
    setHoldings(prev => {
      const next = { ...prev };
      if (next[stock.code]) {
        delete next[stock.code];
      } else {
        next[stock.code] = {
          code: stock.code,
          shares: 100,
          avgPrice: stock.price,
          addedAt: new Date().toISOString().split('T')[0],
          notes: ''
        };
      }
      return next;
    });
  };

  const handleUpdateHolding = (code: string, shares: number, avgPrice: number, notes?: string) => {
    setHoldings(prev => ({
      ...prev,
      [code]: {
        code,
        shares,
        avgPrice,
        addedAt: prev[code]?.addedAt || new Date().toISOString().split('T')[0],
        notes: notes ?? prev[code]?.notes
      }
    }));
  };

  const handleRemoveHolding = (code: string) => {
    setHoldings(prev => {
      const next = { ...prev };
      delete next[code];
      return next;
    });
  };

  // Handle Filter Changes
  const handleFilterChange = (newFilter: Partial<FilterState>) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  };

  const handleHeaderSortChange = (field: SortKey) => {
    setFilter(prev => {
      if (prev.sortBy === field) {
        return { ...prev, sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' };
      }
      return { ...prev, sortBy: field, sortOrder: field === 'pbr' || field === 'per' ? 'asc' : 'desc' };
    });
  };

  const handleResetFilter = () => {
    setFilter({
      search: '',
      tab: activeTab,
      sector: 'all',
      market: 'all',
      minYield: 3.0,
      maxPer: 25.0,
      maxPbr: 1.8,
      minMarketCap: 0,
      minEquityRatio: 0,
      sortBy: 'roe',
      sortOrder: 'desc',
      onlyHighFinancialHealth: false,
      onlyDividendHike: false,
      viewMode: filter.viewMode || 'standard'
    });
  };

  // Distinct Sectors
  const availableSectors = useMemo(() => {
    const sectors = new Set<string>();
    stocks.forEach(s => sectors.add(s.sector));
    return Array.from(sectors).sort();
  }, [stocks]);

  // Filtered & Sorted Stocks for Table View
  const filteredStocks = useMemo(() => {
    return stocks.filter(stock => {
      // Tab Category Filtering
      if (activeTab === 'chronic' && stock.status !== 'chronic') return false;
      if (activeTab === 'rare_new' && stock.status !== 'rare_new') return false;
      if (activeTab === 'graduated' && stock.status !== 'graduated') return false;
      if (activeTab === 'all' && stock.status === 'graduated') return false;

      // Search (code, name, tags, sector)
      if (filter.search) {
        const q = filter.search.toLowerCase().trim();
        const matchCode = stock.code.toLowerCase().includes(q);
        const matchName = stock.name.toLowerCase().includes(q);
        const matchSector = stock.sector.toLowerCase().includes(q);
        const matchTag = stock.tags?.some(t => t.toLowerCase().includes(q));
        if (!matchCode && !matchName && !matchSector && !matchTag) return false;
      }

      // Sector filter
      if (filter.sector !== 'all' && stock.sector !== filter.sector) return false;

      // Yield filter
      if (stock.dividendYield < filter.minYield) return false;

      // PBR filter
      if (stock.pbr > filter.maxPbr) return false;

      // High Financial Health (自己資本比率 50%以上)
      if (filter.onlyHighFinancialHealth && stock.equityRatio < 50) return false;

      // Consecutive dividend hikes
      if (filter.onlyDividendHike && stock.consecutiveDividendHikeYears <= 0) return false;

      return true;
    }).sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      switch (filter.sortBy) {
        case 'code':
          return filter.sortOrder === 'asc' ? a.code.localeCompare(b.code) : b.code.localeCompare(a.code);
        case 'name':
          return filter.sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        case 'price':
          valA = a.price;
          valB = b.price;
          break;
        case 'dividendYield':
          valA = a.dividendYield;
          valB = b.dividendYield;
          break;
        case 'pbr':
          valA = a.pbr;
          valB = b.pbr;
          break;
        case 'per':
          valA = a.per;
          valB = b.per;
          break;
        case 'roe':
          valA = a.roe || 0;
          valB = b.roe || 0;
          break;
        case 'salesCagr3y':
          valA = a.salesCagr3y || 0;
          valB = b.salesCagr3y || 0;
          break;
        case 'operatingGrowth':
          valA = a.operatingGrowth || 0;
          valB = b.operatingGrowth || 0;
          break;
        case 'undervaluedScore':
          valA = a.undervaluedScore;
          valB = b.undervaluedScore;
          break;
        case 'consecutiveDays':
          valA = a.consecutiveDays;
          valB = b.consecutiveDays;
          break;
        case 'marketCap':
          valA = a.marketCap;
          valB = b.marketCap;
          break;
        case 'graduationReturnPercent':
          valA = a.graduationReturnPercent || 0;
          valB = b.graduationReturnPercent || 0;
          break;
        case 'changePercent':
          valA = a.changePercent;
          valB = b.changePercent;
          break;
        case 'consecutiveDividendHikeYears':
          valA = a.consecutiveDividendHikeYears;
          valB = b.consecutiveDividendHikeYears;
          break;
        case 'equityRatio':
          valA = a.equityRatio;
          valB = b.equityRatio;
          break;
        default:
          valA = a.dividendYield;
          valB = b.dividendYield;
      }

      if (filter.sortOrder === 'asc') {
        return valA > valB ? 1 : -1;
      } else {
        return valA < valB ? 1 : -1;
      }
    });
  }, [stocks, activeTab, filter]);

  // Refresh Simulator
  const handleRefreshData = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastUpdated(new Date().toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Tokyo'
      }) + ' (JST)');
    }, 800);
  };

  const holdingsCount = Object.keys(holdings).length;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* Top Header */}
      <Header
        lastUpdated={lastUpdated}
        totalStocksCount={stocks.length}
        holdingsCount={holdingsCount}
        onOpenGitHubSetup={() => setIsGitHubSetupModalOpen(true)}
        onOpenDataModal={() => setIsDataModalOpen(true)}
        onRefreshData={handleRefreshData}
        onOpenPortfolio={() => setActiveTab('portfolio')}
        isRefreshing={isRefreshing}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Metric Overview Cards */}
        <MetricOverviewCards
          stocks={stocks}
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
        />

        {/* Category Segmented Tabs */}
        <CategoryTabs
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
          stocks={stocks}
          holdingsCount={holdingsCount}
        />

        {/* Dynamic View Router */}
        {activeTab === 'all' && (
          <div className="space-y-4">
            <FilterBar
              filter={filter}
              onFilterChange={handleFilterChange}
              onResetFilter={handleResetFilter}
              availableSectors={availableSectors}
              totalFilteredCount={filteredStocks.length}
            />
            <StockTable
              stocks={filteredStocks}
              viewMode={filter.viewMode}
              holdings={holdings}
              aiSummaries={aiSummaries}
              onToggleHolding={handleToggleHolding}
              onSelectStock={(stock) => setSelectedStock(stock)}
              onOpenAiSummary={(stock) => setAiSummaryStock(stock)}
              sortBy={filter.sortBy}
              sortOrder={filter.sortOrder}
              onSortChange={handleHeaderSortChange}
            />
          </div>
        )}

        {activeTab === 'chronic' && (
          <div className="space-y-6">
            <ChronicValueView
              stocks={stocks}
              onSelectStock={(stock) => setSelectedStock(stock)}
            />
            <div className="pt-4 border-t border-slate-700/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <h3 className="text-sm font-bold text-slate-200">ずっと割安放置銘柄 一覧テーブル</h3>
                <FilterBar
                  filter={filter}
                  onFilterChange={handleFilterChange}
                  onResetFilter={handleResetFilter}
                  availableSectors={availableSectors}
                  totalFilteredCount={filteredStocks.length}
                />
              </div>
              <StockTable
                stocks={filteredStocks}
                viewMode={filter.viewMode}
                holdings={holdings}
                aiSummaries={aiSummaries}
                onToggleHolding={handleToggleHolding}
                onSelectStock={(stock) => setSelectedStock(stock)}
                onOpenAiSummary={(stock) => setAiSummaryStock(stock)}
                sortBy={filter.sortBy}
                sortOrder={filter.sortOrder}
                onSortChange={handleHeaderSortChange}
              />
            </div>
          </div>
        )}

        {activeTab === 'rare_new' && (
          <div className="space-y-6">
            <RareUndervaluedView
              stocks={stocks}
              onSelectStock={(stock) => setSelectedStock(stock)}
            />
            <div className="pt-4 border-t border-slate-700/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <h3 className="text-sm font-bold text-slate-200">珍しく割安銘柄 一覧テーブル</h3>
                <FilterBar
                  filter={filter}
                  onFilterChange={handleFilterChange}
                  onResetFilter={handleResetFilter}
                  availableSectors={availableSectors}
                  totalFilteredCount={filteredStocks.length}
                />
              </div>
              <StockTable
                stocks={filteredStocks}
                viewMode={filter.viewMode}
                holdings={holdings}
                aiSummaries={aiSummaries}
                onToggleHolding={handleToggleHolding}
                onSelectStock={(stock) => setSelectedStock(stock)}
                onOpenAiSummary={(stock) => setAiSummaryStock(stock)}
                sortBy={filter.sortBy}
                sortOrder={filter.sortOrder}
                onSortChange={handleHeaderSortChange}
              />
            </div>
          </div>
        )}

        {activeTab === 'graduated' && (
          <div className="space-y-6">
            <GraduatedStocksView
              stocks={stocks}
              onSelectStock={(stock) => setSelectedStock(stock)}
            />
            <div className="pt-4 border-t border-slate-700/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <h3 className="text-sm font-bold text-slate-200">割安卒業銘柄 一覧テーブル</h3>
                <FilterBar
                  filter={filter}
                  onFilterChange={handleFilterChange}
                  onResetFilter={handleResetFilter}
                  availableSectors={availableSectors}
                  totalFilteredCount={filteredStocks.length}
                />
              </div>
              <StockTable
                stocks={filteredStocks}
                viewMode={filter.viewMode}
                holdings={holdings}
                aiSummaries={aiSummaries}
                onToggleHolding={handleToggleHolding}
                onSelectStock={(stock) => setSelectedStock(stock)}
                onOpenAiSummary={(stock) => setAiSummaryStock(stock)}
                sortBy={filter.sortBy}
                sortOrder={filter.sortOrder}
                onSortChange={handleHeaderSortChange}
              />
            </div>
          </div>
        )}

        {activeTab === 'portfolio' && (
          <PortfolioView
            stocks={stocks}
            holdings={holdings}
            onUpdateHolding={handleUpdateHolding}
            onRemoveHolding={handleRemoveHolding}
            onSelectStock={(stock) => setSelectedStock(stock)}
            onOpenAiSummary={(stock) => setAiSummaryStock(stock)}
          />
        )}

        {activeTab === 'history' && (
          <HistorySnapshotView
            snapshots={snapshots}
            allStocks={stocks}
            selectedDate={selectedSnapshotDate}
            onSelectDate={(date) => setSelectedSnapshotDate(date)}
            onSelectStock={(stock) => setSelectedStock(stock)}
          />
        )}

        {activeTab === 'setup' && (
          <GitHubSetupModal isModal={false} />
        )}

      </main>

      {/* Footer */}
      <footer className="bg-[#0f172a] border-t border-slate-800 py-6 mt-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span>みんかぶ割安高配当トラッカー | </span>
            <a href="https://github.com/port4rio/port4rio.github.io" target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 transition-colors">
              port4rio
            </a>
            <span> (日次自動集計 & GitHub Actions / Pages 連携)</span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setActiveTab('portfolio')}
              className="text-amber-400 hover:text-amber-300 font-medium transition-colors cursor-pointer"
            >
              port4rio保有管理 ({holdingsCount})
            </button>
            <span>•</span>
            <button
              onClick={() => setIsGitHubSetupModalOpen(true)}
              className="text-slate-400 hover:text-slate-200 font-medium transition-colors cursor-pointer"
            >
              GitHub Actions設定
            </button>
            <span>•</span>
            <button
              onClick={() => setIsDataModalOpen(true)}
              className="text-slate-400 hover:text-slate-200 font-medium transition-colors cursor-pointer"
            >
              データ入出力
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {selectedStock && (
        <StockDetailModal
          stock={selectedStock}
          aiSummary={aiSummaries[selectedStock.code]}
          holding={holdings[selectedStock.code]}
          onToggleHolding={handleToggleHolding}
          onOpenAiSummary={(stock) => {
            setSelectedStock(null);
            setAiSummaryStock(stock);
          }}
          onClose={() => setSelectedStock(null)}
        />
      )}

      {aiSummaryStock && (
        <AiFinancialSummaryModal
          stock={aiSummaryStock}
          aiSummary={aiSummaries[aiSummaryStock.code]}
          holding={holdings[aiSummaryStock.code]}
          onClose={() => setAiSummaryStock(null)}
        />
      )}

      {isGitHubSetupModalOpen && (
        <GitHubSetupModal
          isModal={true}
          onClose={() => setIsGitHubSetupModalOpen(false)}
        />
      )}

      {isDataModalOpen && (
        <DataManagementModal
          stocks={stocks}
          onUpdateStocks={(newStocks) => setStocks(newStocks)}
          onClose={() => setIsDataModalOpen(false)}
        />
      )}

    </div>
  );
}
