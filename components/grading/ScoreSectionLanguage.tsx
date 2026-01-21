import React from "react";
import ReactMarkdown from "react-markdown";
import { GradingResult } from "../../types";

interface ScoreSectionLanguageProps {
  gradingResult: GradingResult;
}

export const ScoreSectionLanguage: React.FC<ScoreSectionLanguageProps> = ({
  gradingResult,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
      <div className="px-5 py-3 flex justify-between items-center bg-slate-50/80 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-blue-100 rounded text-blue-600">
            <span className="material-symbols-outlined text-[18px] block">
              translate
            </span>
          </div>
          <h3 className="font-bold text-slate-800 text-sm">
            Language
          </h3>
        </div>
        <span className="text-lg font-bold text-slate-900 font-mono bg-white border border-slate-200 px-2.5 py-0.5 rounded shadow-sm">
          {gradingResult.languageScore}
          <span className="text-slate-400 text-sm font-normal">
            /{gradingResult.languageMax}
          </span>
        </span>
      </div>
      <div className="p-5 flex flex-col gap-4">
        <div className="text-sm text-slate-600 leading-relaxed markdown-content">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-bold text-slate-800">{children}</strong>,
              ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="ml-2">{children}</li>,
              code: ({ children }) => <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
              h1: ({ children }) => <h1 className="text-base font-bold mb-2 mt-3 first:mt-0 text-slate-800">{children}</h1>,
              h2: ({ children }) => <h2 className="text-sm font-bold mb-2 mt-3 first:mt-0 text-slate-800">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0 text-slate-800">{children}</h3>,
            }}
          >
            {gradingResult.comments.language}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};
