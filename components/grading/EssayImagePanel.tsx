import React, { RefObject } from "react";
import { Student } from "../../types";

interface EssayImagePanelProps {
  student: Student;
  croppedImageUrl: string | null;
  zoomLevel: number;
  displayZoom: number;
  imageContainerRef: RefObject<HTMLDivElement>;
  onWheel: (e: React.WheelEvent) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onZoomChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const EssayImagePanel: React.FC<EssayImagePanelProps> = ({
  student,
  croppedImageUrl,
  zoomLevel,
  displayZoom,
  imageContainerRef,
  onWheel,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onZoomChange,
}) => {
  return (
    <section className="w-full lg:w-[45%] flex flex-col relative bg-slate-100 border-r border-slate-200 shadow-[4px_0_24px_rgba(0,0,0,0.03)] z-10">
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-start pointer-events-none">
        <div className="flex flex-col gap-2 pointer-events-auto">
          <div className="bg-white/90 backdrop-blur-md border border-slate-200 px-4 py-3 rounded-lg shadow-soft">
            <div className="flex flex-col">
              <span className="text-[10px] text-text-secondary uppercase tracking-wider font-bold mb-0.5">
                Student ID
              </span>
              <span className="text-slate-800 font-mono font-bold text-lg leading-none">
                #{student.id}
              </span>
              <span className="text-xs text-cyan-600 font-semibold mt-1">
                {student.name}
              </span>
            </div>
          </div>
        </div>
        <div className="bg-white/90 backdrop-blur-md border border-slate-200 px-3 py-1.5 rounded-lg shadow-soft pointer-events-auto flex gap-2 items-center">
          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
          <span className="text-xs font-medium text-slate-700">
            Scanned 10m ago
          </span>
        </div>
      </div>

      <div 
        ref={imageContainerRef}
        className="flex-1 w-full h-full relative overflow-auto bg-slate-200/50 flex items-center justify-center p-8"
        onWheel={onWheel}
      >
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        ></div>
        {/* 只显示裁剪后的ROI区域 */}
        <div 
          className="relative w-full max-w-[500px] aspect-[3/4] shadow-2xl transition-transform duration-200 ease-out origin-center"
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: "center center",
          }}
        >
          <img
            src={croppedImageUrl || student.imageUrl}
            alt="Student Essay (ROI)"
            className="w-full h-full object-contain rounded-sm ring-1 ring-slate-900/5 filter contrast-[1.05] brightness-[1.02]"
          />
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
        <div className="flex items-center gap-1 bg-white border border-slate-200 p-1.5 rounded-xl shadow-xl backdrop-blur-sm">
          <button 
            onClick={onZoomOut}
            disabled={displayZoom <= 25}
            className="p-2 text-text-secondary hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[20px]">
              remove
            </span>
          </button>
          <input
            type="number"
            min="25"
            max="370"
            step="5"
            value={displayZoom}
            onChange={onZoomChange}
            onDoubleClick={onZoomReset}
            className="text-xs font-mono w-14 text-center text-slate-700 font-medium bg-transparent border-none outline-none focus:bg-cyan-50 rounded px-1"
            title="双击重置为100%（实际135%）"
          />
          <span className="text-xs font-mono text-slate-500">%</span>
          <button 
            onClick={onZoomIn}
            disabled={zoomLevel >= 500}
            className="p-2 text-text-secondary hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[20px]">
              add
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};
