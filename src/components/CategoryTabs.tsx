import React from 'react';
import { 
  Layers, 
  Hourglass, 
  Zap, 
  GraduationCap, 
  Calendar, 
  GitBranch, 
  Star 
} from 'lucide-react';
import { Stock, TabType } from '../types/stock';

interface CategoryTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  stocks: Stock[];
  holdingsCount?: number;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  activeTab,
  onTabChange,
  stocks,
  holdingsCount = 0
}) => {
  const activeCount = stocks.filter(s => s.status !== 'graduated').length;
  const chronicCount = stocks.filter(s => s.status === 'chronic').length;
  const rareNewCount = stocks.filter(s => s.status === 'rare_new').length;
  const graduatedCount = stocks.filter(s => s.status === 'graduated').length;

  const tabs = [
    {
      id: 'all' as const,
      label: '全割安高配当',
      count: activeCount,
      icon: Layers,
      activeBorder: 'border-indigo-500 text-indigo-400 bg-slate-800/90 shadow-md font-semibold'
    },
    {
      id: 'chronic' as const,
      label: 'ずっと割安放置',
      count: chronicCount,
      icon: Hourglass,
      badge: '90日超',
      activeBorder: 'border-amber-500 text-amber-400 bg-slate-800/90 shadow-md font-semibold'
    },
    {
      id: 'rare_new' as const,
      label: '珍しく割安',
      count: rareNewCount,
      icon: Zap,
      badge: '新着',
      activeBorder: 'border-emerald-500 text-emerald-400 bg-slate-800/90 shadow-md font-semibold'
    },
    {
      id: 'graduated' as const,
      label: '割安卒業銘柄',
      count: graduatedCount,
      icon: GraduationCap,
      badge: '上昇達成',
      activeBorder: 'border-indigo-400 text-indigo-300 bg-slate-800/90 shadow-md font-semibold'
    },
    {
      id: 'portfolio' as const,
      label: 'port4rio 保有・注目',
      count: holdingsCount,
      icon: Star,
      badge: 'Local',
      activeBorder: 'border-amber-400 text-amber-300 bg-slate-800/90 shadow-md font-semibold'
    },
    {
      id: 'history' as const,
      label: '日次推移・過去ログ',
      icon: Calendar,
      activeBorder: 'border-slate-400 text-slate-200 bg-slate-800/90 shadow-md font-semibold'
    },
    {
      id: 'setup' as const,
      label: 'GitHub自動更新設定',
      icon: GitBranch,
      badge: 'Actions',
      activeBorder: 'border-emerald-400 text-emerald-300 bg-slate-800/90 shadow-md font-semibold'
    }
  ];

  return (
    <div className="border-b border-slate-700/80 mb-6">
      <div className="flex space-x-1.5 sm:space-x-2 overflow-x-auto pb-2 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`tab-btn-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-lg text-xs sm:text-sm transition-all whitespace-nowrap border cursor-pointer ${
                isActive
                  ? tab.activeBorder
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-current' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-mono ${
                  isActive ? 'bg-slate-900 text-slate-200 border border-slate-700' : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              )}
              {tab.badge && !tab.count && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
