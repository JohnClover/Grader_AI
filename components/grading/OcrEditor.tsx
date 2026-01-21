import React from "react";

interface OcrEditorProps {
  ocrText: string;
  onChange: (text: string) => void;
}

export const OcrEditor: React.FC<OcrEditorProps> = ({
  ocrText,
  onChange,
}) => {
  return (
    <div className="flex-1 p-6 flex flex-col min-w-0 bg-slate-50">
      <div className="flex justify-between items-center mb-4">
        <label className="flex items-center gap-2 text-sm font-bold text-cyan-600 uppercase tracking-wide">
          <span className="material-symbols-outlined text-[18px]">
            description
          </span>
          Digitized Text
        </label>
        <span className="text-xs text-cyan-600 bg-cyan-50 border border-cyan-100 px-2 py-1 rounded font-medium">
          Editable
        </span>
      </div>
      <div className="flex-1 relative group h-full">
        <div className="w-full h-full bg-white border border-slate-200 rounded-xl shadow-sm relative overflow-hidden transition-shadow hover:shadow-md">
          <textarea
            className="w-full h-full bg-transparent p-8 text-lg leading-loose text-slate-800 font-display resize-none focus:outline-none focus:ring-0 transition-all placeholder:text-slate-300 lined-paper"
            spellCheck="false"
            value={ocrText}
            onChange={(e) => onChange(e.target.value)}
          ></textarea>
        </div>
      </div>
    </div>
  );
};
