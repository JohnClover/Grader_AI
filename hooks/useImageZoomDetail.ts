import { useState, useCallback } from "react";

const BASE_ZOOM = 135; // GradingDetail基准缩放比例（实际135%对应显示100%）

export const useImageZoomDetail = () => {
  const [zoomLevel, setZoomLevel] = useState(BASE_ZOOM);

  // 将实际缩放比例转换为显示比例（相对于BASE_ZOOM）
  const getDisplayZoom = (actualZoom: number) => Math.round((actualZoom / BASE_ZOOM) * 100);
  
  // 将显示比例转换为实际缩放比例
  const getActualZoom = (displayZoom: number) => Math.round((displayZoom / 100) * BASE_ZOOM);

  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev + Math.round(BASE_ZOOM * 0.1), 500));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev - Math.round(BASE_ZOOM * 0.1), Math.round(BASE_ZOOM * 0.25)));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(BASE_ZOOM);
  }, []);

  const handleZoomChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const displayValue = parseInt(e.target.value);
    if (!isNaN(displayValue) && displayValue >= 25 && displayValue <= 370) {
      const actualZoom = getActualZoom(displayValue);
      setZoomLevel(actualZoom);
    }
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      return;
    }
    
    e.preventDefault();
    const delta = e.deltaY > 0 ? -Math.round(BASE_ZOOM * 0.05) : Math.round(BASE_ZOOM * 0.05);
    setZoomLevel((prev) => {
      const minZoom = Math.round(BASE_ZOOM * 0.25);
      const maxZoom = 500;
      const newZoom = Math.max(minZoom, Math.min(maxZoom, prev + delta));
      return newZoom;
    });
  }, []);

  return {
    zoomLevel,
    displayZoom: getDisplayZoom(zoomLevel),
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    handleZoomChange,
    handleWheel,
    getDisplayZoom,
    getActualZoom,
  };
};
