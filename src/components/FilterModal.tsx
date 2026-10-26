import React, { useState, useEffect } from 'react';
import { X, RotateCcw, Check, Sparkles, Sliders, Crown, Building2 } from 'lucide-react';
import { ScreeningCriteria, DEFAULT_CRITERIA, OUDOU_VALUE_CRITERIA } from '../types';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  criteria: ScreeningCriteria;
  onApply: (newCriteria: ScreeningCriteria) => void;
  onReset?: () => void;
}

// 時価総額ツマミのステップ: 制限なし(0) ～ 50億, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 2000, 3000, 4000, 5000億円以上
const MARKET_CAP_STEPS = [
  0,
  50,
  100,
  200,
  300,
  400,
  500,
  600,
  700,
  800,
  900,
  1000,
  2000,
  3000,
  4000,
  5000,
];

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  criteria,
  onApply,
  onReset,
}) => {
  const [draft, setDraft] = useState<ScreeningCriteria>(criteria);

  // モーダルが開いた時や親の criteria が更新された時に draft を同期
  useEffect(() => {
    if (isOpen) {
      setDraft(criteria);
    }
  }, [isOpen, criteria]);

  if (!isOpen) return null;

  const handleReset = () => {
    setDraft({ ...DEFAULT_CRITERIA });
    if (onReset) onReset();
  };

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const applyStandard = () => {
    setDraft({ ...DEFAULT_CRITERIA });
  };

  const applyOudouValue = () => {
    setDraft({ ...OUDOU_VALUE_CRITERIA });
  };

  const currentMarketCap = draft.minMarketCap ?? 0;

  // ツマミ位置（ステップインデックス）の逆引き
  const currentStepIndex = (() => {
    let closestIdx = 0;
    let minDiff = Infinity;
    MARKET_CAP_STEPS.forEach((step, idx) => {
      const diff = Math.abs(step - currentMarketCap);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });
    return closestIdx;
  })();

  const isStandardActive =
    draft.minDividendYield === DEFAULT_CRITERIA.minDividendYield &&
    draft.maxPbr === DEFAULT_CRITERIA.maxPbr &&
    draft.minRoe === DEFAULT_CRITERIA.minRoe &&
    draft.minEbitdaGrowth === DEFAULT_CRITERIA.minEbitdaGrowth &&
    draft.minEquityRatio === DEFAULT_CRITERIA.minEquityRatio &&
    (draft.minMarketCap ?? 0) === DEFAULT_CRITERIA.minMarketCap;

  const isOudouActive =
    draft.minDividendYield === OUDOU_VALUE_CRITERIA.minDividendYield &&
    draft.maxPbr === OUDOU_VALUE_CRITERIA.maxPbr &&
    draft.minRoe === OUDOU_VALUE_CRITERIA.minRoe &&
    draft.minEbitdaGrowth === OUDOU_VALUE_CRITERIA.minEbitdaGrowth &&
    draft.minEquityRatio === OUDOU_VALUE_CRITERIA.minEquityRatio &&
    (draft.minMarketCap ?? 0) === OUDOU_VALUE_CRITERIA.minMarketCap;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#16221c] rounded-xl sm:rounded-2xl max-w-[540px] w-full shadow-2xl border border-[#273a2f] overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#e3ece6] flex flex-col my-auto h-[90vh] max-h-[96vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-3.5 py-3 sm:px-5 sm:py-3.5 border-b border-[#24372c] flex items-center justify-between bg-[#18261f] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#25392e] text-[#fde047] flex items-center justify-center font-bold">
              <Sliders className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-sm font-bold text-[#f0f5f2]">スクリーニング条件設定</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#749182] hover:text-[#f0f5f2] hover:bg-[#25392e] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Presets: [標準] と [王道バリュー] */}
        <div className="px-3 sm:px-5 py-2.5 bg-[#131d17] border-b border-[#24362b] flex items-center justify-between gap-1.5 sm:gap-2 shrink-0">
          <span className="text-xs font-bold text-[#86a394] tracking-wide shrink-0">
            プリセット
          </span>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={applyStandard}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border whitespace-nowrap shrink-0 cursor-pointer ${
                isStandardActive
                  ? 'bg-[#1e3427] border-[#4ade80] text-[#86efac] shadow-[0_0_12px_rgba(74,222,128,0.15)]'
                  : 'bg-[#18261e] border-[#2c4235] text-[#c5d8cd] hover:bg-[#1f3126]'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#86efac]" />
              <span>標準</span>
            </button>

            <button
              type="button"
              onClick={applyOudouValue}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border whitespace-nowrap shrink-0 cursor-pointer ${
                isOudouActive
                  ? 'bg-[#2f2a13] border-[#fde047] text-[#fde047] shadow-[0_0_12px_rgba(253,224,71,0.2)]'
                  : 'bg-[#222013] border-[#4d441c] text-[#fde047]/90 hover:bg-[#2c2815]'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-[#fde047]" />
              <span>王道バリュー</span>
            </button>
          </div>
        </div>

        {/* Sliders and Inputs (前の通りのクラシックなスライダーデザイン) */}
        <div className="p-3.5 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
          {/* 1. 時価総額（下限） */}
          <div className="bg-[#121c16] p-3 rounded-xl border border-[#25392d]">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#f0f5f2] flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>時価総額（下限）</span>
              </label>
              <span className="text-sm font-bold text-[#38bdf8] font-mono">
                {currentMarketCap === 0
                  ? '制限なし'
                  : `${currentMarketCap.toLocaleString()}億円 以上`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={MARKET_CAP_STEPS.length - 1}
              step="1"
              value={currentStepIndex}
              onChange={(e) => {
                const idx = parseInt(e.target.value, 10);
                setDraft({ ...draft, minMarketCap: MARKET_CAP_STEPS[idx] });
              }}
              className="w-full accent-sky-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#6b8577] mt-0.5 font-mono">
              <span>制限なし</span>
              <span className="text-[#a4c2b2] font-medium">王道: 500億</span>
              <span>5,000億以上</span>
            </div>
          </div>

          {/* 2. 配当利回り */}
          <div className="bg-[#121c16] p-3 rounded-xl border border-[#25392d]">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#f0f5f2] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#fde047]" />
                <span>配当利回り（下限）</span>
              </label>
              <span className="text-sm font-bold text-[#fde047] font-mono">
                {draft.minDividendYield.toFixed(1)}% 以上
              </span>
            </div>
            <input
              type="range"
              min="2.0"
              max="7.0"
              step="0.1"
              value={draft.minDividendYield}
              onChange={(e) =>
                setDraft({ ...draft, minDividendYield: parseFloat(e.target.value) })
              }
              className="w-full accent-amber-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#6b8577] mt-0.5">
              <span>2.0%</span>
              <span className="text-[#a4c2b2] font-medium">初期値: 3.8%</span>
              <span>7.0%</span>
            </div>
          </div>

          {/* 3. PBR */}
          <div className="bg-[#121c16] p-3 rounded-xl border border-[#25392d]">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#f0f5f2]">PBR（上限）</label>
              <span className="text-sm font-bold text-[#86efac] font-mono">
                {draft.maxPbr.toFixed(2)}倍 以下
              </span>
            </div>
            <input
              type="range"
              min="0.3"
              max="2.0"
              step="0.05"
              value={draft.maxPbr}
              onChange={(e) => setDraft({ ...draft, maxPbr: parseFloat(e.target.value) })}
              className="w-full accent-emerald-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#6b8577] mt-0.5">
              <span>0.3倍</span>
              <span className="text-[#a4c2b2] font-medium">初期値: 1.20倍</span>
              <span>2.0倍</span>
            </div>
          </div>

          {/* 4. ROE */}
          <div className="bg-[#121c16] p-3 rounded-xl border border-[#25392d]">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#f0f5f2]">ROE（下限）</label>
              <span className="text-sm font-bold text-[#86efac] font-mono">
                {draft.minRoe.toFixed(1)}% 以上
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="0.5"
              value={draft.minRoe}
              onChange={(e) => setDraft({ ...draft, minRoe: parseFloat(e.target.value) })}
              className="w-full accent-emerald-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#6b8577] mt-0.5">
              <span>0%</span>
              <span className="text-[#a4c2b2] font-medium">初期値: 7.5%</span>
              <span>20%</span>
            </div>
          </div>

          {/* 5. EBITDA成長率 */}
          <div className="bg-[#121c16] p-3 rounded-xl border border-[#25392d]">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#f0f5f2]">EBITDA成長率通期（下限）</label>
              <span className="text-sm font-bold text-[#86efac] font-mono">
                {draft.minEbitdaGrowth <= -20
                  ? '制限なし（全対象）'
                  : `${draft.minEbitdaGrowth.toFixed(1)}% 以上`}
              </span>
            </div>
            <input
              type="range"
              min="-20"
              max="20"
              step="1"
              value={draft.minEbitdaGrowth <= -20 ? -20 : draft.minEbitdaGrowth}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setDraft({ ...draft, minEbitdaGrowth: val === -20 ? -999 : val });
              }}
              className="w-full accent-emerald-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#6b8577] mt-0.5">
              <span>制限なし</span>
              <span className="text-[#a4c2b2] font-medium">初期値: -10%</span>
              <span>20%</span>
            </div>
          </div>

          {/* 6. 自己資本比率 */}
          <div className="bg-[#121c16] p-3 rounded-xl border border-[#25392d]">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#f0f5f2]">自己資本比率（下限）</label>
              <span className="text-sm font-bold text-[#93c5fd] font-mono">
                {draft.minEquityRatio.toFixed(0)}% 以上
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="80"
              step="1"
              value={draft.minEquityRatio}
              onChange={(e) =>
                setDraft({ ...draft, minEquityRatio: parseInt(e.target.value, 10) })
              }
              className="w-full accent-blue-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#6b8577] mt-0.5">
              <span>20%</span>
              <span className="text-[#a4c2b2] font-medium">初期値: 48%</span>
              <span>80%</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-5 py-3 bg-[#182720] border-t border-[#283b30] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-medium text-[#8ea899] hover:text-[#f0f5f2] px-2.5 py-1.5 rounded-lg hover:bg-[#203429] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>初期化</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-[#c5d8cd] bg-[#121c16] border border-[#2c4033] rounded-lg hover:bg-[#1a2720] transition-colors cursor-pointer"
            >
              閉じる
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-medium text-[#111c15] bg-[#86efac] hover:bg-[#4ade80] rounded-lg shadow-xs transition-colors font-bold cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>適用</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
