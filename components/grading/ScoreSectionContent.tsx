import React from "react";
import ReactMarkdown from "react-markdown";
import { GradingResult } from "../../types";

interface ScoreSectionContentProps {
  gradingResult: GradingResult;
}

export const ScoreSectionContent: React.FC<ScoreSectionContentProps> = ({
  gradingResult,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
      <div className="px-5 py-3 flex justify-between items-center bg-slate-50/80 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-amber-100 rounded text-amber-600">
            <span className="material-symbols-outlined text-[18px] block">
              lightbulb
            </span>
          </div>
          <h3 className="font-bold text-slate-800 text-sm">
            Content
          </h3>
        </div>
        <span className="text-lg font-bold text-slate-900 font-mono bg-white border border-slate-200 px-2.5 py-0.5 rounded shadow-sm">
          {gradingResult.contentScore}
          <span className="text-slate-400 text-sm font-normal">
            /{gradingResult.contentMax}
          </span>
        </span>
      </div>
      <div className="p-5">
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
          <div className="text-sm text-amber-900 leading-relaxed markdown-content">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-bold text-amber-950">{children}</strong>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="ml-2">{children}</li>,
                code: ({ children }) => <code className="bg-amber-100 text-amber-950 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                h1: ({ children }) => <h1 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
                h2: ({ children }) => <h2 className="text-sm font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h3>,
              }}
            >
              {gradingResult.comments.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};
