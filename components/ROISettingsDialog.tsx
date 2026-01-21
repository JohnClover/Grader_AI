import React, { useState, useEffect, useRef, useCallback } from "react";
import { ROIRegion } from "../types";
import { useAppContext } from "../contexts/AppContext";

interface ROISettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sampleImageUrl?: string; // 示例图片URL，用于预览ROI
  requireConfirm?: boolean; // 是否强制要求确认（不允许直接关闭）
}

export const ROISettingsDialog: React.FC<ROISettingsDialogProps> = ({
  isOpen,
  onClose,
  sampleImageUrl,
  requireConfirm = false,
}) => {
  const { config, updateConfig, fileMap, students } = useAppContext();
  const [roiRegion, setRoiRegion] = useState<ROIRegion>(
    config.globalROI || { top: 0, left: 0, width: 100, height: 100 }
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const roiBoxRef = useRef<HTMLDivElement>(null);
  const [imageDisplayInfo, setImageDisplayInfo] = useState<{
    scale: number;
    offsetX: number;
    offsetY: number;
    scaledWidth: number;
    scaledHeight: number;
    baseScale: number; // 基础缩放比例（100%适配时的比例）
  } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100); // 缩放级别，100表示100%
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 }); // 图片位置（用于拖拽）

  // 计算图片的显示信息（用于ROI框定位）
  const updateImageDisplayInfo = useCallback(() => {
    if (!imageRef.current || !imageContainerRef.current) return;
    const img = imageRef.current;
    const container = imageContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    
    if (naturalWidth === 0 || naturalHeight === 0) return;
    
    // 计算容器可用空间（减去padding）
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    
    // 计算基础缩放比例（100%适配窗口）
    const baseScale = Math.min(containerWidth / naturalWidth, containerHeight / naturalHeight);
    
    // 应用用户设置的缩放级别
    const userScale = zoomLevel / 100;
    const scale = baseScale * userScale;
    
    const scaledWidth = naturalWidth * scale;
    const scaledHeight = naturalHeight * scale;
    
    // 计算偏移量（居中显示）
    const offsetX = (containerWidth - scaledWidth) / 2 + imagePosition.x;
    const offsetY = (containerHeight - scaledHeight) / 2 + imagePosition.y;
    
    setImageDisplayInfo({ 
      scale, 
      offsetX, 
      offsetY, 
      scaledWidth, 
      scaledHeight,
      baseScale 
    });
  }, [zoomLevel, imagePosition]);

  // 获取示例图片（使用第一个有图片的学生）
  const getSampleImage = () => {
    if (sampleImageUrl) return sampleImageUrl;
    const studentWithImage = students.find((s) => s.imageUrl || fileMap.has(s.id));
    if (studentWithImage?.imageUrl) return studentWithImage.imageUrl;
    // 如果有文件映射，创建一个blob URL
    if (studentWithImage && fileMap.has(studentWithImage.id)) {
      const file = fileMap.get(studentWithImage.id)!;
      return URL.createObjectURL(file);
    }
    return null;
  };

  const sampleImage = getSampleImage();

  // 当图片加载完成或窗口大小改变时，更新显示信息
  useEffect(() => {
    if (!isOpen) return;
    
    let img: HTMLImageElement | null = null;
    let handleLoad: (() => void) | null = null;
    
    // 延迟执行，确保 DOM 已经渲染
    const timer = setTimeout(() => {
      if (!imageRef.current) return;
      
      img = imageRef.current;
      handleLoad = () => {
        if (imageRef.current) {
          updateImageDisplayInfo();
        }
      };
      
      if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
        updateImageDisplayInfo();
      } else {
        img.addEventListener('load', handleLoad);
      }
      
      window.addEventListener('resize', updateImageDisplayInfo);
    }, 0);
    
    return () => {
      clearTimeout(timer);
      if (img && handleLoad) {
        img.removeEventListener('load', handleLoad);
      }
      window.removeEventListener('resize', updateImageDisplayInfo);
    };
  }, [isOpen, sampleImage, updateImageDisplayInfo]);

  // 当缩放级别或图片位置改变时，更新显示信息
  useEffect(() => {
    if (isOpen) {
      updateImageDisplayInfo();
    }
  }, [isOpen, zoomLevel, imagePosition, updateImageDisplayInfo]);

  useEffect(() => {
    if (isOpen) {
      if (config.globalROI) {
        setRoiRegion(config.globalROI);
      } else {
        // 如果没有配置，默认设置为全图
        setRoiRegion({ top: 0, left: 0, width: 100, height: 100 });
      }
      // 重置缩放和位置
      setZoomLevel(100);
      setImagePosition({ x: 0, y: 0 });
    }
  }, [isOpen, config.globalROI]);

  // 计算鼠标在图片实际像素尺寸中的百分比位置
  // 注意：ROI百分比是相对于图片的实际像素尺寸，不是显示尺寸
  const getPercentageFromEvent = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      if (!imageRef.current || !imageContainerRef.current || !imageDisplayInfo) {
        return { x: 0, y: 0 };
      }
      
      const container = imageContainerRef.current;
      const containerRect = container.getBoundingClientRect();
      
      // 获取鼠标相对于容器的位置
      const mouseX = e.clientX - containerRect.left;
      const mouseY = e.clientY - containerRect.top;
      
      // 计算鼠标相对于图片的位置
      const relativeX = mouseX - imageDisplayInfo.offsetX;
      const relativeY = mouseY - imageDisplayInfo.offsetY;
      
      // 转换为相对于图片实际像素尺寸的百分比
      const naturalWidth = imageRef.current.naturalWidth;
      const naturalHeight = imageRef.current.naturalHeight;
      
      if (!naturalWidth || !naturalHeight) return { x: 0, y: 0 };
      
      const x = (relativeX / imageDisplayInfo.scaledWidth) * 100;
      const y = (relativeY / imageDisplayInfo.scaledHeight) * 100;
      
      return { 
        x: Math.max(0, Math.min(100, x)), 
        y: Math.max(0, Math.min(100, y)) 
      };
    },
    [imageDisplayInfo]
  );

  // 拖拽开始
  const handleROIDragStart = (e: React.MouseEvent) => {
    if (!imageRef.current || !imageDisplayInfo) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    const pos = getPercentageFromEvent(e);
    setDragStart({ x: pos.x - roiRegion.left, y: pos.y - roiRegion.top });
  };

  // 调整大小开始
  const handleROIResizeStart = (e: React.MouseEvent, handle: string) => {
    if (!imageRef.current || !imageDisplayInfo) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
    const pos = getPercentageFromEvent(e);
    setDragStart({ x: pos.x, y: pos.y });
  };

  // 鼠标移动处理
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!imageRef.current || !imageDisplayInfo) return;

      const pos = getPercentageFromEvent(e);

      if (isDragging) {
        // 拖拽移动
        setRoiRegion((prev) => ({
          ...prev,
          left: Math.max(0, Math.min(100 - prev.width, pos.x - dragStart.x)),
          top: Math.max(0, Math.min(100 - prev.height, pos.y - dragStart.y)),
        }));
      } else if (isResizing && resizeHandle) {
        // 调整大小
        setRoiRegion((prev) => {
          let newRegion = { ...prev };
          const deltaX = pos.x - dragStart.x;
          const deltaY = pos.y - dragStart.y;

          // 处理水平方向
          if (resizeHandle.includes("e")) {
            // 右边界
            newRegion.width = Math.max(10, Math.min(100 - prev.left, prev.width + deltaX));
          }
          if (resizeHandle.includes("w")) {
            // 左边界
            const newLeft = Math.max(0, prev.left + deltaX);
            const newWidth = prev.width - (newLeft - prev.left);
            if (newWidth >= 10) {
              newRegion.left = newLeft;
              newRegion.width = newWidth;
            }
          }
          
          // 处理垂直方向
          if (resizeHandle.includes("s")) {
            // 下边界
            newRegion.height = Math.max(10, Math.min(100 - prev.top, prev.height + deltaY));
          }
          if (resizeHandle.includes("n")) {
            // 上边界
            const newTop = Math.max(0, prev.top + deltaY);
            const newHeight = prev.height - (newTop - prev.top);
            if (newHeight >= 10) {
              newRegion.top = newTop;
              newRegion.height = newHeight;
            }
          }

          return newRegion;
        });
        setDragStart({ x: pos.x, y: pos.y });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeHandle(null);
    };

    if (isDragging || isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isOpen, isDragging, isResizing, resizeHandle, dragStart, getPercentageFromEvent, roiRegion]);

  const handleConfirm = () => {
    updateConfig({ globalROI: roiRegion });
    onClose();
    alert("ROI区域已保存，将应用到所有学生的识别中");
  };

  const handleReset = () => {
    setRoiRegion({ top: 0, left: 0, width: 100, height: 100 });
    setZoomLevel(100);
    setImagePosition({ x: 0, y: 0 });
  };

  const handleZoomChange = (value: number) => {
    setZoomLevel(Math.max(25, Math.min(500, value)));
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(500, prev + 25));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(25, prev - 25));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-[90vw] h-[90vh] max-w-6xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">设置OCR识别区域 (ROI)</h2>
            <p className="text-sm text-slate-600 mt-1">
              调整识别区域，此设置将应用到所有学生的图片识别中
            </p>
          </div>
          {!requireConfirm && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-slate-600">close</span>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden p-6 gap-4">
          {/* 缩放控制工具栏 */}
          {sampleImage && (
            <div className="flex items-center gap-4 bg-slate-50 rounded-lg p-3 border border-slate-200">
              <span className="text-sm text-slate-600 font-medium">缩放:</span>
              <button
                onClick={handleZoomOut}
                className="p-1.5 rounded hover:bg-slate-200 transition-colors"
                title="缩小"
              >
                <span className="material-symbols-outlined text-slate-600 text-lg">remove</span>
              </button>
              <input
                type="range"
                min="25"
                max="500"
                value={zoomLevel}
                onChange={(e) => handleZoomChange(Number(e.target.value))}
                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
              />
              <span className="text-sm font-mono font-bold text-slate-700 w-12 text-right">
                {zoomLevel}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1.5 rounded hover:bg-slate-200 transition-colors"
                title="放大"
              >
                <span className="material-symbols-outlined text-slate-600 text-lg">add</span>
              </button>
              <button
                onClick={() => {
                  setZoomLevel(100);
                  setImagePosition({ x: 0, y: 0 });
                }}
                className="px-3 py-1.5 rounded hover:bg-slate-200 transition-colors text-sm text-slate-600 font-medium"
                title="重置缩放"
              >
                重置
              </button>
            </div>
          )}

          {/* 预览区域 */}
          <div className="flex-1 relative bg-slate-100 rounded-lg overflow-auto">
            {sampleImage ? (
              <div
                ref={imageContainerRef}
                className="relative w-full h-full flex items-center justify-center min-h-full"
                style={{ padding: '16px' }}
              >
                <div 
                  className="relative inline-block"
                  style={{
                    transform: `translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                    transition: isDragging || isResizing ? 'none' : 'transform 0.1s',
                  }}
                >
                  <img
                    ref={imageRef}
                    src={sampleImage}
                    alt="Sample"
                    className="rounded-sm shadow-lg block"
                    style={{
                      width: imageDisplayInfo ? `${imageDisplayInfo.scaledWidth}px` : 'auto',
                      height: imageDisplayInfo ? `${imageDisplayInfo.scaledHeight}px` : 'auto',
                      maxWidth: 'none',
                      maxHeight: 'none',
                    }}
                  />
                  {/* ROI Box - 相对于图片实际显示区域定位 */}
                  {imageDisplayInfo && (
                    <div
                      ref={roiBoxRef}
                      className="absolute border-2 border-cyan-500 cursor-move shadow-[0_0_0_9999px_rgba(15,23,42,0.5)] ring-2 ring-cyan-300 ring-opacity-50 z-10"
                      style={{
                        // 将ROI百分比（相对于实际像素）转换为显示坐标
                        top: `${(roiRegion.top / 100) * imageDisplayInfo.scaledHeight}px`,
                        left: `${(roiRegion.left / 100) * imageDisplayInfo.scaledWidth}px`,
                        width: `${(roiRegion.width / 100) * imageDisplayInfo.scaledWidth}px`,
                        height: `${(roiRegion.height / 100) * imageDisplayInfo.scaledHeight}px`,
                      }}
                      onMouseDown={handleROIDragStart}
                    >
                  <div className="absolute -top-6 left-0 bg-cyan-600 text-white text-[10px] px-2 py-1 rounded">
                    OCR识别区域
                  </div>

                  {/* 调整大小的控制点 */}
                  <>
                    {/* 四个角 */}
                    <div
                      className="absolute -top-1 -left-1 w-3 h-3 bg-cyan-500 border border-white rounded-full cursor-nwse-resize z-10"
                      onMouseDown={(e) => handleROIResizeStart(e, "nw")}
                    />
                    <div
                      className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-500 border border-white rounded-full cursor-nesw-resize z-10"
                      onMouseDown={(e) => handleROIResizeStart(e, "ne")}
                    />
                    <div
                      className="absolute -bottom-1 -left-1 w-3 h-3 bg-cyan-500 border border-white rounded-full cursor-nesw-resize z-10"
                      onMouseDown={(e) => handleROIResizeStart(e, "sw")}
                    />
                    <div
                      className="absolute -bottom-1 -right-1 w-3 h-3 bg-cyan-500 border border-white rounded-full cursor-nwse-resize z-10"
                      onMouseDown={(e) => handleROIResizeStart(e, "se")}
                    />
                    {/* 四个边 */}
                    <div
                      className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-cyan-500 border border-white rounded-full cursor-ns-resize z-10"
                      onMouseDown={(e) => handleROIResizeStart(e, "n")}
                    />
                    <div
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-cyan-500 border border-white rounded-full cursor-ns-resize z-10"
                      onMouseDown={(e) => handleROIResizeStart(e, "s")}
                    />
                    <div
                      className="absolute -left-1 top-1/2 -translate-y-1/2 w-3 h-3 bg-cyan-500 border border-white rounded-full cursor-ew-resize z-10"
                      onMouseDown={(e) => handleROIResizeStart(e, "w")}
                    />
                    <div
                      className="absolute -right-1 top-1/2 -translate-y-1/2 w-3 h-3 bg-cyan-500 border border-white rounded-full cursor-ew-resize z-10"
                      onMouseDown={(e) => handleROIResizeStart(e, "e")}
                      />
                    </>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400">
                <span className="material-symbols-outlined text-6xl mb-2">image_not_supported</span>
                <span className="text-sm">请先导入学生图片以预览ROI区域</span>
              </div>
            )}
          </div>

          {/* ROI数值显示 */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-slate-600">顶部: </span>
                <span className="font-mono font-bold">{roiRegion.top.toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-slate-600">左侧: </span>
                <span className="font-mono font-bold">{roiRegion.left.toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-slate-600">宽度: </span>
                <span className="font-mono font-bold">{roiRegion.width.toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-slate-600">高度: </span>
                <span className="font-mono font-bold">{roiRegion.height.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all text-sm font-medium"
          >
            重置为全图
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all text-sm font-medium"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              className="px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white transition-all text-sm font-bold"
            >
              确认保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
