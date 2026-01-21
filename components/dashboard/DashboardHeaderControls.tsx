import React from "react";
import { AppConfig } from "../../types";

interface DashboardHeaderControlsProps {
  config: AppConfig;
  onUpdateConfig: (updates: Partial<AppConfig>) => void;
}

export const DashboardHeaderControls: React.FC<DashboardHeaderControlsProps> = ({
  config,
  onUpdateConfig,
}) => {
  const geminiModels = ["gemini-3-pro", "gemini-3-flash"];
  const poeModels = ["gemini-3-pro", "gemini-3-flash"];
  const activeModel =
    config.apiProvider === "poe"
      ? config.poeModel || poeModels[0]
      : config.model || geminiModels[0];

  return (
    <div className="ml-auto">
      <div className="flex items-center gap-3 h-11 px-4 rounded-full bg-gradient-to-r from-blue-50 via-indigo-50 to-sky-50 border border-blue-100 shadow-sm">
        <span className="material-symbols-outlined text-[18px] text-primary">
          auto_awesome
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Provider</span>
            <div className="relative">
              <select
                className="h-8 pl-3 pr-8 rounded-full border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-300 appearance-none"
                value={config.apiProvider}
                onChange={(e) =>
                  onUpdateConfig({ apiProvider: e.target.value as "gemini" | "poe" })
                }
              >
                <option value="gemini">Gemini</option>
                <option value="poe">Poe</option>
              </select>
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none material-symbols-outlined text-[16px]">
                expand_more
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Model</span>
            <div className="relative">
              <select
                className="h-8 pl-3 pr-8 rounded-full border border-indigo-200 bg-indigo-50 text-xs font-semibold text-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-300 appearance-none"
                value={activeModel}
                onChange={(e) =>
                  config.apiProvider === "poe"
                    ? onUpdateConfig({ poeModel: e.target.value })
                    : onUpdateConfig({ model: e.target.value })
                }
              >
                {(config.apiProvider === "poe" ? poeModels : geminiModels).map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none material-symbols-outlined text-[16px]">
                expand_more
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Thinking</span>
            <div className="relative">
              <select
                className="h-8 pl-3 pr-8 rounded-full border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-300 appearance-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                value={config.poeThinkingLevel}
                onChange={(e) =>
                  onUpdateConfig({ poeThinkingLevel: e.target.value as "low" | "minimal" | "high" })
                }
                disabled={config.apiProvider !== "poe"}
              >
                <option value="low">low</option>
                <option value="minimal">minimal</option>
                <option value="high">high</option>
              </select>
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none material-symbols-outlined text-[16px]">
                expand_more
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
