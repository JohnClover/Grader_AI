import React, { RefObject } from "react";
import { AppConfig } from "../../types";

interface DashboardControlBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  listInputRef: RefObject<HTMLInputElement>;
  onImportList: () => void;
  onGenerateList: () => void;
  onShowROISettings: () => void;
  onClearGrades: () => void;
  onClearImageMappings: () => void;
  onBatchGrading: () => void;
  onStopGrading: () => void;
  isGrading: boolean;
  selectedCount: number;
  config: AppConfig;
}

export const DashboardControlBar: React.FC<DashboardControlBarProps> = ({
  searchTerm,
  onSearchChange,
  listInputRef,
  onImportList,
  onGenerateList,
  onShowROISettings,
  onClearGrades,
  onClearImageMappings,
  onBatchGrading,
  onStopGrading,
  isGrading,
  selectedCount,
  config,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
      <div className="flex items-center flex-1 max-w-md bg-white rounded-lg h-10 border border-border-subtle focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all shadow-sm">
        <div className="pl-3 text-slate-400">
          <span className="material-symbols-outlined">search</span>
        </div>
        <input
          className="bg-transparent border-none text-slate-800 placeholder-slate-400 w-full h-full focus:ring-0 text-sm px-2 outline-none"
          placeholder="Filter by Student ID, Name, or Class..."
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-3">
        <input
          ref={listInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
        />
        <button
          onClick={onImportList}
          className="h-10 px-4 rounded-lg bg-white border border-border-subtle text-text-secondary hover:text-text-main hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-2 text-sm font-medium shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">
            upload_file
          </span>
          导入名单
        </button>
        <button
          onClick={onGenerateList}
          className="h-10 px-4 rounded-lg bg-white border border-border-subtle text-text-secondary hover:text-text-main hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-2 text-sm font-medium shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">
            add_circle
          </span>
          生成名单
        </button>
        <button
          onClick={onShowROISettings}
          className="h-10 px-4 rounded-lg bg-white border border-cyan-200 text-cyan-700 hover:text-cyan-800 hover:bg-cyan-50 hover:border-cyan-300 transition-all flex items-center gap-2 text-sm font-medium shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">
            crop_free
          </span>
          设置ROI识别区域
        </button>
        <button
          onClick={onClearImageMappings}
          disabled={isGrading}
          className="h-10 px-4 rounded-lg bg-white border border-amber-200 text-amber-700 hover:text-amber-800 hover:bg-amber-50 hover:border-amber-300 transition-all flex items-center gap-2 text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[18px]">
            imagesmode
          </span>
          清除图片映射
        </button>
        <button
          onClick={onClearGrades}
          disabled={isGrading}
          className="h-10 px-4 rounded-lg bg-white border border-rose-200 text-rose-700 hover:text-rose-800 hover:bg-rose-50 hover:border-rose-300 transition-all flex items-center gap-2 text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[18px]">
            delete_sweep
          </span>
          清除成绩
        </button>
        <button
          onClick={isGrading ? onStopGrading : onBatchGrading}
          disabled={
            !isGrading &&
            ((config.apiProvider === "gemini" && !config.apiKey) ||
            (config.apiProvider === "poe" && !config.poeApiKey))
          }
          className="h-10 px-6 rounded-lg bg-primary hover:bg-primary-hover text-white transition-all flex items-center gap-2 text-sm font-bold shadow-lg shadow-blue-500/20 active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[20px] fill-1">
            {isGrading ? "stop" : "play_arrow"}
          </span>
          {isGrading 
            ? "中止处理" 
            : selectedCount > 0 
              ? `批量处理选中 (${selectedCount})` 
              : "Auto-Grade Batch"}
        </button>
      </div>
    </div>
  );
};
