import React, { RefObject } from "react";
import { Link } from "react-router-dom";
import { Student, StudentStatus } from "../../types";

interface ImagePreviewPanelProps {
  student: Student | undefined;
  zoomLevel: number;
  displayZoom: number;
  imageViewerRef: RefObject<HTMLDivElement>;
  onWheel: (e: React.WheelEvent) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onZoomChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStatusToggle: (id: string, newStatus: StudentStatus) => void;
  onClearImage: (id: string) => void;
  onReplaceImage: (id: string) => void;
  onRetry: (id: string) => void;
}

export const ImagePreviewPanel: React.FC<ImagePreviewPanelProps> = ({
  student,
  zoomLevel,
  displayZoom,
  imageViewerRef,
  onWheel,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onZoomChange,
  onStatusToggle,
  onClearImage,
  onReplaceImage,
  onRetry,
}) => {
  if (!student) {
    return (
      <div className="w-[45%] xl:w-[40%] flex flex-col gap-4">
        <div className="flex-1 flex items-center justify-center text-text-secondary">
          Select a student to view details
        </div>
      </div>
    );
  }

  return (
    <div className="w-[45%] xl:w-[40%] flex flex-col gap-4">
      <div className="flex-1 bg-surface-card rounded-xl border border-border-subtle flex flex-col shadow-lg shadow-slate-200/50 overflow-hidden relative">
        <div className="px-4 py-3 border-b border-border-subtle bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <span className="material-symbols-outlined text-sm">
                visibility
              </span>
            </div>
            <div>
              <h3 className="text-slate-900 text-sm font-semibold leading-none">
                {student.name}
              </h3>
              <p className="text-xs text-text-secondary mt-1 font-mono">
                ID: {student.id}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {student.status === StudentStatus.Graded && (
              <Link to={`/grade/${student.id}`} className="bg-primary hover:bg-primary-hover text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors">
                Detailed View
              </Link>
            )}
          </div>
        </div>

        {/* Image Viewer */}
        <div 
          ref={imageViewerRef}
          className="flex-1 bg-slate-50 relative flex items-center justify-center overflow-auto p-4"
          onWheel={onWheel}
        >
          <div className="absolute inset-0 paper-pattern opacity-40"></div>
          {student.imageUrl ? (
            <div
              className="relative transition-transform duration-200 ease-out origin-center"
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: "center center",
              }}
            >
              <img
                alt="Student handwritten essay preview"
                className="max-w-full max-h-full object-contain shadow-2xl border border-slate-200 rounded-sm bg-white"
                src={student.imageUrl}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400">
              <span className="material-symbols-outlined text-6xl mb-2">
                image_not_supported
              </span>
              <span className="text-sm">No image mapped</span>
            </div>
          )}
          {/* AI Overlay Mockup */}
          {student.status === StudentStatus.Processing && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="bg-white px-4 py-2 rounded-lg shadow-xl flex items-center gap-2">
                <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
                <span className="text-sm font-medium">Analyzing...</span>
              </div>
            </div>
          )}
          {student.status === StudentStatus.Graded && (
            <div className="absolute top-1/4 right-1/4 bg-white/90 text-primary text-[10px] px-2 py-1 rounded shadow-md backdrop-blur-sm border border-primary/20 font-medium">
              Grammar Check: OK
            </div>
          )}
          
          {/* 缩放控制 */}
          {student.imageUrl && (
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
          )}
        </div>

        {/* Action Bar */}
        <div className="p-4 bg-white border-t border-border-subtle z-10">
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 cursor-pointer group select-none">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-300 bg-white checked:border-red-500 checked:bg-red-500 transition-all focus:ring-red-500"
                  checked={student.status === StudentStatus.Absent}
                  onChange={(e) =>
                    onStatusToggle(
                      student.id,
                      e.target.checked
                        ? StudentStatus.Absent
                        : StudentStatus.Pending
                    )
                  }
                />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 pointer-events-none">
                  <span className="material-symbols-outlined text-[16px]">
                    check
                  </span>
                </span>
              </div>
              <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
                Mark as Absent (缺考)
              </span>
            </label>
            {student.fileName && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onClearImage(student.id)}
                  className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded border border-red-200 hover:bg-red-50"
                >
                  清除图片
                </button>
                <button
                  onClick={() => onReplaceImage(student.id)}
                  className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded border border-blue-200 hover:bg-blue-50"
                >
                  更换图片
                </button>
              </div>
            )}
          </div>
          {student.fileName && (
            <div className="text-xs text-slate-500 mb-2">
              文件名: {student.fileName}
            </div>
          )}
          {student.status === StudentStatus.Failed && (
            <button
              onClick={() => onRetry(student.id)}
              className="w-full bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-red-200"
            >
              重试评分
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
