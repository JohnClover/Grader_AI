import React, { useState, useRef, useCallback } from "react";
import { StudentStatus } from "../../types";
import { useAppContext } from "../../contexts/AppContext";
import { useDashboardSelection } from "../../hooks/useDashboardSelection";
import { useBatchGrading } from "../../hooks/useBatchGrading";
import { useStudentListImport } from "../../hooks/useStudentListImport";
import { useImageZoomDashboard } from "../../hooks/useImageZoomDashboard";
import { StudentStatsHeader } from "./StudentStatsHeader";
import { DashboardHeaderControls } from "./DashboardHeaderControls";
import { DashboardControlBar } from "./DashboardControlBar";
import { StudentTable } from "./StudentTable";
import { ImagePreviewPanel } from "./ImagePreviewPanel";
import { DashboardDialogs } from "./DashboardDialogs";

export const DashboardPage: React.FC = () => {
  const {
    students,
    config,
    isGrading,
    gradingProgress,
    fileMap,
    updateStudent,
    updateConfig,
    setStudents,
    setFileMap,
    startGrading,
    stopGrading,
    updateProgress,
    updateStudentGradingResult,
    setStudentFile,
    addApiLog,
  } = useAppContext();

  const listInputRef = useRef<HTMLInputElement>(null);
  const imageViewerRef = useRef<HTMLDivElement>(null);
  
  const [showROISettings, setShowROISettings] = useState(false);
  const [showPerformanceStats, setShowPerformanceStats] = useState(false);
  const [showScoreStats, setShowScoreStats] = useState(false);
  const [showStudentCountStats, setShowStudentCountStats] = useState(false);

  // 处理状态切换（缺考时清除图片）
  const handleStatusToggle = useCallback(
    (id: string, newStatus: StudentStatus) => {
      if (newStatus === StudentStatus.Absent) {
        updateStudent(id, {
          status: StudentStatus.Absent,
          fileName: null,
          imageUrl: undefined,
          score: 0,
        });
        setStudentFile(id, null);
        const student = students.find((s) => s.id === id);
        if (student?.imageUrl && student.imageUrl.startsWith("blob:")) {
          URL.revokeObjectURL(student.imageUrl);
        }
      } else {
        updateStudent(id, { status: newStatus });
      }
    },
    [updateStudent, setStudentFile, students]
  );

  // 使用选择相关的 hook
  const {
    selectedStudentId,
    setSelectedStudentId,
    selectedStudentIds,
    selectedStudent,
    searchTerm,
    setSearchTerm,
    filteredStudents,
    handleToggleSelect,
    handleSelectAll,
  } = useDashboardSelection({
    students,
    onStatusToggle: handleStatusToggle,
  });

  // 使用批量评分 hook
  const { handleBatchGrading, handleRetry } = useBatchGrading({
    students,
    fileMap,
    config,
    selectedStudentIds,
    startGrading,
    stopGrading,
    updateProgress,
    updateStudent,
    updateStudentGradingResult,
    addApiLog,
  });

  // 使用名单导入 hook
  const {
    showExcelImportDialog,
    excelFile,
    handleImportList,
    handleListFileChange,
    handleExcelImport,
    handleGenerateList,
    handleCloseExcelImport,
  } = useStudentListImport({
    config,
    listInputRef,
    onImport: setStudents,
    onSelectFirst: setSelectedStudentId,
  });

  // 使用缩放 hook
  const {
    zoomLevel,
    displayZoom,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    handleZoomChange,
    handleWheel,
  } = useImageZoomDashboard();

  const handleClearGrades = useCallback(() => {
    const confirm = window.confirm("确定要清除所有成绩与评分结果吗？该操作不可撤销。");
    if (!confirm) return;

    const updatedStudents = students.map((student) => {
      const isAbsent = student.status === StudentStatus.Absent;
      return {
        ...student,
        status: isAbsent ? student.status : StudentStatus.Pending,
        score: isAbsent ? student.score : null,
        gradingResult: undefined,
        processingStartTime: undefined,
        processingEndTime: undefined,
        processingDuration: undefined,
      };
    });

    setStudents(updatedStudents);
  }, [students, setStudents]);

  const handleClearImageMappings = useCallback(() => {
    const confirm = window.confirm("确定要清除所有图片映射吗？学生的图片预览将被移除。");
    if (!confirm) return;

    students.forEach((student) => {
      if (student.imageUrl && student.imageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(student.imageUrl);
      }
    });

    const updatedStudents = students.map((student) => ({
      ...student,
      fileName: null,
      imageUrl: undefined,
    }));

    setFileMap(new Map());
    setStudents(updatedStudents);
  }, [students, setFileMap, setStudents]);

  // 清除图片
  const handleClearImage = useCallback((studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    if (student?.imageUrl && student.imageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(student.imageUrl);
    }
    updateStudent(studentId, {
      fileName: null,
      imageUrl: undefined,
    });
    setStudentFile(studentId, null);
  }, [students, updateStudent, setStudentFile]);

  // 更换图片
  const handleReplaceImage = useCallback((studentId: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const imageUrl = URL.createObjectURL(file);
        const student = students.find((s) => s.id === studentId);
        if (student?.imageUrl && student.imageUrl.startsWith("blob:")) {
          URL.revokeObjectURL(student.imageUrl);
        }
        updateStudent(studentId, {
          fileName: file.name,
          imageUrl,
        });
        setStudentFile(studentId, file);
      }
    };
    input.click();
  }, [students, updateStudent, setStudentFile]);

  // 计算进度条分段
  const stats = {
    total: students.length,
    graded: students.filter((s) => s.status === StudentStatus.Graded).length,
    failed: students.filter((s) => s.status === StudentStatus.Failed).length,
    absent: students.filter((s) => s.status === StudentStatus.Absent).length,
  };

  const progressSegments = {
    graded: stats.total > 0 ? (stats.graded / stats.total) * 100 : 0,
    failed: stats.total > 0 ? (stats.failed / stats.total) * 100 : 0,
    absent: stats.total > 0 ? (stats.absent / stats.total) * 100 : 0,
  };

  return (
    <div className="flex flex-col h-full bg-bg-main relative">
      {/* Header / Stats */}
      <header className="px-6 py-6 pb-2 flex-shrink-0">
        <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
          <StudentStatsHeader
            students={students}
            showStudentCountStats={showStudentCountStats}
            showPerformanceStats={showPerformanceStats}
            showScoreStats={showScoreStats}
            onToggleStudentCountStats={() => setShowStudentCountStats(!showStudentCountStats)}
            onTogglePerformanceStats={() => setShowPerformanceStats(!showPerformanceStats)}
            onToggleScoreStats={() => setShowScoreStats(!showScoreStats)}
          />
          <DashboardHeaderControls
            config={config}
            onUpdateConfig={updateConfig}
          />
        </div>

        <DashboardControlBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          listInputRef={listInputRef}
          onImportList={handleImportList}
          onGenerateList={handleGenerateList}
          onShowROISettings={() => setShowROISettings(true)}
          onClearGrades={handleClearGrades}
          onClearImageMappings={handleClearImageMappings}
          onBatchGrading={handleBatchGrading}
          onStopGrading={stopGrading}
          isGrading={isGrading}
          selectedCount={selectedStudentIds.size}
          config={config}
        />
      </header>

      {/* Main Content Area: Split View */}
      <div className="flex flex-1 min-h-0 overflow-hidden px-6 pb-2 gap-6">
        <StudentTable
          students={filteredStudents}
          selectedStudentId={selectedStudentId}
          selectedStudentIds={selectedStudentIds}
          onSelectStudent={setSelectedStudentId}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
          onRetry={handleRetry}
        />

        <ImagePreviewPanel
          student={selectedStudent}
          zoomLevel={zoomLevel}
          displayZoom={displayZoom}
          imageViewerRef={imageViewerRef}
          onWheel={handleWheel}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleZoomReset}
          onZoomChange={handleZoomChange}
          onStatusToggle={handleStatusToggle}
          onClearImage={handleClearImage}
          onReplaceImage={handleReplaceImage}
          onRetry={handleRetry}
        />
      </div>

      {/* Footer / Status Bar */}
      {isGrading && (
        <footer className="h-10 bg-white border-t border-border-subtle flex items-center px-6 gap-4 z-20 shadow-sm shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm animate-spin">
              progress_activity
            </span>
            <span className="text-xs font-medium text-slate-700">
              Batch Processing Active
            </span>
          </div>
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-100 relative">
            {/* 分段进度条 */}
            <div
              className="h-full bg-green-500 absolute left-0"
              style={{ width: `${progressSegments.graded}%` }}
            ></div>
            <div
              className="h-full bg-red-500 absolute"
              style={{
                left: `${progressSegments.graded}%`,
                width: `${progressSegments.failed}%`,
              }}
            ></div>
            <div
              className="h-full bg-slate-400 absolute"
              style={{
                left: `${progressSegments.graded + progressSegments.failed}%`,
                width: `${progressSegments.absent}%`,
              }}
            ></div>
          </div>
          <span className="text-xs font-mono text-text-secondary">
            {gradingProgress.current} / {gradingProgress.total}
          </span>
        </footer>
      )}

      {/* Dialogs */}
      <DashboardDialogs
        showROISettings={showROISettings}
        showExcelImportDialog={showExcelImportDialog}
        excelFile={excelFile}
        selectedStudent={selectedStudent}
        listInputRef={listInputRef}
        config={config}
        onCloseROISettings={() => setShowROISettings(false)}
        onCloseExcelImport={handleCloseExcelImport}
        onExcelImport={handleExcelImport}
      />

      {/* Hidden file input for list import */}
      <input
        ref={listInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={handleListFileChange}
      />
    </div>
  );
};
