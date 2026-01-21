import React from "react";

interface GradingDetailFooterProps {
  isRegenerating: boolean;
  onRegenerate: () => void;
  onBackToList: () => void;
  onConfirmAndNext: () => void;
}

export const GradingDetailFooter: React.FC<GradingDetailFooterProps> = ({
  isRegenerating,
  onRegenerate,
  onBackToList,
  onConfirmAndNext,
}) => {
  return (
    <footer className="p-4 border-t border-slate-200 bg-white z-20 flex justify-between items-center shrink-0 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
      <button
        onClick={onRegenerate}
        disabled={isRegenerating}
        className="px-4 py-2.5 rounded-lg border border-slate-200 text-text-secondary hover:text-cyan-600 hover:bg-cyan-50 hover:border-cyan-100 transition-all text-sm font-medium flex items-center gap-2 bg-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={`material-symbols-outlined text-[20px] ${isRegenerating ? "animate-spin" : ""}`}>
          {isRegenerating ? "progress_activity" : "autorenew"}
        </span>
        {isRegenerating ? "重新评分中..." : "Regenerate AI Analysis"}
      </button>
      <div className="flex items-center gap-3">
        <button
          onClick={onBackToList}
          className="px-6 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-all text-sm font-medium border border-slate-200 shadow-sm"
        >
          Back to List
        </button>
        <button
          onClick={onConfirmAndNext}
          className="px-8 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white transition-all text-sm font-bold shadow-md shadow-cyan-200 flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">
            check
          </span>
          Confirm & Next
        </button>
      </div>
    </footer>
  );
};
