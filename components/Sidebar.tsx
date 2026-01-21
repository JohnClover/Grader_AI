import React, { useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAppContext } from "../contexts/AppContext";
import { mapImagesToStudents, checkMappingConflicts } from "../utils/imageMapping";
import { exportToExcel } from "../utils/exportUtils";
import { convertPdfToImages, isPdfFile } from "../utils/pdfUtils";
import { StudentStatus, Student } from "../types";
import { ROISettingsDialog } from "./ROISettingsDialog";

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { students, setStudents, setFileMap, setStudentFile } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [useSequentialOrder, setUseSequentialOrder] = useState(true); // true: 顺序映射（正序）, false: 倒序映射
  const [showLoadOrderDialog, setShowLoadOrderDialog] = useState(false);
  const [showAbsentConfirmDialog, setShowAbsentConfirmDialog] = useState(false);
  const [pendingMappingResults, setPendingMappingResults] = useState<any>(null);
  const [pendingPdfCount, setPendingPdfCount] = useState(0);
  const [showROISettings, setShowROISettings] = useState(false);
  const [roiSampleImageUrl, setRoiSampleImageUrl] = useState<string | undefined>(undefined);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleLoadImages = () => {
    setShowLoadOrderDialog(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    // 分离PDF文件和图片文件
    const pdfFiles = fileArray.filter((file) => isPdfFile(file));
    const imageFiles = fileArray.filter((file) =>
      file.type.startsWith("image/")
    );

    if (pdfFiles.length === 0 && imageFiles.length === 0) {
      alert("请选择图片文件或PDF文件");
      return;
    }

    const shouldShowPdfLoading = pdfFiles.length > 0;
    if (shouldShowPdfLoading) {
      setIsProcessingPdf(true);
    }

    try {
      let allImageFiles: File[] = [...imageFiles];

      // 处理PDF文件：转换为图片并按学号顺序映射
      if (pdfFiles.length > 0) {
        for (const pdfFile of pdfFiles) {
          const pdfImages = await convertPdfToImages(pdfFile);
          allImageFiles.push(...pdfImages);
        }
      }

      // 执行映射（使用选择的映射方式）
      const mappingResults = mapImagesToStudents(allImageFiles, students, useSequentialOrder);

      // 检查冲突
      const conflicts = checkMappingConflicts(mappingResults);
      if (conflicts.size > 0) {
        const conflictList = Array.from(conflicts.entries())
          .map(([id, results]) => `学号 ${id}: ${results.map((r) => r.fileName).join(", ")}`)
          .join("\n");
        const confirm = window.confirm(
          `检测到映射冲突：\n${conflictList}\n\n是否继续？冲突的图片将使用第一个匹配的结果。`
        );
        if (!confirm) return;
      }

      // 检查缺考学生：找出所有缺考的学生
      const absentStudents = students.filter((s) => s.status === StudentStatus.Absent);
      
      // 如果有缺考学生，强制让用户确认缺考名单
      if (absentStudents.length > 0) {
        // 保存映射结果和PDF数量，等待用户确认缺考名单后再应用
        setPendingMappingResults(mappingResults);
        setPendingPdfCount(pdfFiles.length);
        setShowAbsentConfirmDialog(true);
        return;
      }

      // 如果没有缺考学生，直接应用映射结果
      applyMappingResults(mappingResults, pdfFiles.length);
    } catch (error: any) {
      alert(`文件映射失败: ${error.message}`);
      // 重置 input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } finally {
      if (shouldShowPdfLoading) {
        setIsProcessingPdf(false);
      }
    }
  };

  // 应用映射结果的函数
  const applyMappingResults = (mappingResults: any[], pdfCount: number = 0) => {
    // 更新学生列表和文件映射
    const newFileMap = new Map<string, File>();
    const updatedStudents = students.map((student) => {
      const mapping = mappingResults.find((m) => m.studentId === student.id);
      if (mapping) {
        newFileMap.set(student.id, mapping.file);
        // 创建预览 URL
        const imageUrl = URL.createObjectURL(mapping.file);
        // 清理旧的 URL
        if (student.imageUrl && student.imageUrl.startsWith("blob:")) {
          URL.revokeObjectURL(student.imageUrl);
        }
        return {
          ...student,
          fileName: mapping.fileName,
          imageUrl,
        };
      }
      // 对于缺考学生，如果没有映射结果（这是正确的，因为缺考学生应该被跳过），
      // 需要清除他们的图片信息，确保不会显示"无图片"的错误提示
      if (student.status === StudentStatus.Absent) {
        // 清理旧的 URL
        if (student.imageUrl && student.imageUrl.startsWith("blob:")) {
          URL.revokeObjectURL(student.imageUrl);
        }
        // 清除图片信息
        return {
          ...student,
          fileName: null,
          imageUrl: undefined,
        };
      }
      return student;
    });

    // 确保 fileMap 中不包含缺考学生的文件（从旧的 fileMap 中清除）
    students.forEach((student) => {
      if (student.status === StudentStatus.Absent && newFileMap.has(student.id)) {
        newFileMap.delete(student.id);
      }
    });

    setFileMap(newFileMap);
    setStudents(updatedStudents);
    
    // 显示成功消息
    const pdfCountText = pdfCount > 0 ? `（包含 ${pdfCount} 个PDF文件）` : "";
    alert(`成功映射 ${mappingResults.length} 张图片${pdfCountText}`);
    
    // 找到第一个有图片的学生作为ROI设置的示例图片
    const firstStudentWithImage = updatedStudents.find((s) => s.imageUrl);
    if (firstStudentWithImage?.imageUrl) {
      setRoiSampleImageUrl(firstStudentWithImage.imageUrl);
      // 强制弹出ROI设置窗口
      setShowROISettings(true);
    }
    
    // 重置 input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 处理缺考确认对话框的确认
  const handleAbsentConfirm = () => {
    if (pendingMappingResults) {
      applyMappingResults(pendingMappingResults, pendingPdfCount);
      // applyMappingResults 内部会处理ROI设置窗口的弹出
    }
    setShowAbsentConfirmDialog(false);
    setPendingMappingResults(null);
    
    // 重置 input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 处理缺考确认对话框的取消
  const handleAbsentCancel = () => {
    setShowAbsentConfirmDialog(false);
    setPendingMappingResults(null);
    
    // 重置 input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleExport = () => {
    try {
      exportToExcel(students);
    } catch (error: any) {
      alert(`导出失败: ${error.message}`);
    }
  };

  return (
    <aside className="w-64 bg-bg-sidebar flex flex-col border-r border-border-subtle h-full flex-shrink-0 z-20">
      <div className="p-6 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
          <span className="material-symbols-outlined text-white text-[20px]">
            school
          </span>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-800">
          GradeAI
        </h1>
      </div>
      <nav className="flex-1 px-3 py-4 flex flex-col gap-2">
        <Link
          to="/"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
            isActive("/")
              ? "bg-white border-border-subtle shadow-sm text-primary"
              : "border-transparent text-text-secondary hover:bg-white hover:border-border-subtle hover:text-text-main"
          }`}
        >
          <span
            className={`material-symbols-outlined ${
              isActive("/") ? "fill-1" : ""
            }`}
          >
            dashboard
          </span>
          <span className="text-sm font-semibold">Dashboard</span>
        </Link>
        <Link
          to="/config"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
            isActive("/config")
              ? "bg-white border-border-subtle shadow-sm text-primary"
              : "border-transparent text-text-secondary hover:bg-white hover:border-border-subtle hover:text-text-main"
          }`}
        >
          <span
            className={`material-symbols-outlined ${
              isActive("/config") ? "fill-1" : ""
            }`}
          >
            tune
          </span>
          <span className="text-sm font-semibold">Configuration</span>
        </Link>
        <Link
          to="/monitor"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
            isActive("/monitor")
              ? "bg-white border-border-subtle shadow-sm text-primary"
              : "border-transparent text-text-secondary hover:bg-white hover:border-border-subtle hover:text-text-main"
          }`}
        >
          <span
            className={`material-symbols-outlined ${
              isActive("/monitor") ? "fill-1" : ""
            }`}
          >
            monitoring
          </span>
          <span className="text-sm font-semibold">Monitor</span>
        </Link>
        <div className="px-3 py-2">
            <div className="h-px bg-slate-200"></div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          onClick={handleLoadImages}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:bg-white hover:border hover:border-border-subtle hover:text-text-main transition-all border border-transparent"
        >
          <span className="material-symbols-outlined">folder_open</span>
          <span className="text-sm font-semibold flex-1 text-left">Load Images</span>
          <span className="material-symbols-outlined text-base">tune</span>
        </button>
        <button
          onClick={handleExport}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:bg-white hover:border hover:border-border-subtle hover:text-text-main transition-all border border-transparent"
        >
          <span className="material-symbols-outlined">ios_share</span>
          <span className="text-sm font-medium">Export Results</span>
        </button>
      </nav>
      <div className="p-4 border-t border-border-subtle">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white hover:shadow-sm cursor-pointer transition-all border border-transparent hover:border-border-subtle">
          <div
            className="h-9 w-9 rounded-full bg-cover bg-center border border-slate-200"
            style={{
              backgroundImage:
                "url('https://picsum.photos/200/200')",
            }}
          ></div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-800">
              Dr. Sarah Lin
            </span>
            <span className="text-xs text-text-secondary">Lead Grader</span>
          </div>
        </div>
      </div>

      {/* 缺考确认对话框 */}
      {showAbsentConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex-shrink-0">
              <h2 className="text-lg font-bold text-slate-800">确认缺考名单</h2>
              <p className="text-sm text-text-secondary mt-1">
                请确认以下学生是否缺考。缺考学生将不会被分配图片文件。
              </p>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1">
              <div className="space-y-2">
                {students
                  .filter((s) => s.status === StudentStatus.Absent)
                  .map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-800">
                          {student.name}
                        </div>
                        <div className="text-xs text-text-secondary">
                          学号: {student.id}
                          {student.class && ` | 班级: ${student.class}`}
                        </div>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded">
                        缺考
                      </span>
                    </div>
                  ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3 flex-shrink-0">
              <button
                onClick={handleAbsentCancel}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all text-sm font-medium"
              >
                取消
              </button>
              <button
                onClick={handleAbsentConfirm}
                className="px-6 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white transition-all text-sm font-bold"
              >
                确认并继续
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 加载顺序选择对话框 */}
      {showLoadOrderDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">选择导入顺序</h2>
              <p className="text-sm text-text-secondary mt-1">
                请选择图片映射方式，确认后将打开文件选择窗口。
              </p>
            </div>
            <div className="px-6 py-5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setUseSequentialOrder(true);
                    setShowLoadOrderDialog(false);
                    fileInputRef.current?.click();
                  }}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all text-sm font-semibold"
                >
                  顺序导入
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUseSequentialOrder(false);
                    setShowLoadOrderDialog(false);
                    fileInputRef.current?.click();
                  }}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all text-sm font-semibold"
                >
                  倒序导入
                </button>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end">
              <button
                onClick={() => setShowLoadOrderDialog(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all text-sm font-medium"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF处理提示 */}
      {isProcessingPdf && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 px-6 py-5 flex items-center gap-3">
            <span className="material-symbols-outlined animate-spin text-primary">
              progress_activity
            </span>
            <div>
              <div className="text-sm font-semibold text-slate-800">正在处理PDF</div>
              <div className="text-xs text-text-secondary">请稍候，正在转换为图片…</div>
            </div>
          </div>
        </div>
      )}

      {/* ROI设置对话框 - 图片载入后强制确认 */}
      <ROISettingsDialog
        isOpen={showROISettings}
        onClose={() => setShowROISettings(false)}
        sampleImageUrl={roiSampleImageUrl}
        requireConfirm={true}
      />
    </aside>
  );
};
