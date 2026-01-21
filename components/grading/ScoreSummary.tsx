import React from "react";
import { GradingResult } from "../../types";

interface ScoreSummaryProps {
  gradingResult: GradingResult;
}

export const ScoreSummary: React.FC<ScoreSummaryProps> = ({
  gradingResult,
}) => {
  return (
    <div className="bg-gradient-to-br from-cyan-50 via-white to-blue-50 rounded-2xl p-6 border border-cyan-100 shadow-sm relative overflow-hidden group">
      <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <span className="material-symbols-outlined text-[140px] text-cyan-600 rotate-12">
          verified
        </span>
      </div>
      <div className="relative z-10 flex justify-between items-start">
        <div>
          <p className="text-text-secondary text-sm font-semibold mb-1 uppercase tracking-wide">
            Total Score
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold text-slate-900 tracking-tight">
              {gradingResult.totalScore}
            </span>
            <span className="text-xl text-slate-400 font-medium">
              / 15
            </span>
          </div>
        </div>
        <div className="bg-emerald-100/60 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200 uppercase tracking-wider flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">
            check_circle
          </span>
          Good Pass
        </div>
      </div>
      <div className="mt-5">
        <div className="w-full bg-slate-200/60 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full shadow-sm"
            style={{ width: `${(gradingResult.totalScore / 15) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};
