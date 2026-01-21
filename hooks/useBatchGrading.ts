import { useCallback } from "react";
import { Student, AppConfig, GradingResult, ApiLogEntry } from "../types";
import { gradeBatchWithFiles } from "../services/gradingScheduler";
import { GradingService } from "../services/geminiService";
import { StudentStatus } from "../types";

interface UseBatchGradingProps {
  students: Student[];
  fileMap: Map<string, File>;
  config: AppConfig;
  selectedStudentIds: Set<string>;
  startGrading: () => void;
  stopGrading: () => void;
  updateProgress: (current: number, total: number) => void;
  updateStudent: (id: string, updates: Partial<Student>) => void;
  updateStudentGradingResult: (id: string, result: GradingResult, processingTime?: { startTime?: number; endTime?: number; duration?: number }) => void;
  addApiLog: (log: Omit<ApiLogEntry, "id" | "timestamp">) => void;
  onClearSelection?: () => void;
}

export const useBatchGrading = ({
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
  onClearSelection,
}: UseBatchGradingProps) => {
  const handleBatchGrading = useCallback(async () => {
    // 根据 API Provider 检查对应的 API Key
    if (config.apiProvider === "gemini" && !config.apiKey) {
      alert("请先在 Configuration 中设置 Gemini API Key");
      return;
    }
    if (config.apiProvider === "poe" && !config.poeApiKey) {
      alert("请先在 Configuration 中设置 Poe API Key");
      return;
    }

    // 如果选中了学生，处理选中的学生（重新识别）
    let studentsToProcess: Student[] = [];
    let studentIds: string[] | undefined = undefined;
    
    if (selectedStudentIds.size > 0) {
      const selectedStudents = students.filter((s) => selectedStudentIds.has(s.id));
      
      // 排除缺考学生（缺考学生本来就不应该有图片文件，不应该报错）
      const selectedNonAbsentStudents = selectedStudents.filter(
        (s) => s.status !== StudentStatus.Absent
      );
      
      // 只检查非缺考学生是否有图片文件
      const studentsWithFiles = selectedNonAbsentStudents.filter((s) => fileMap.has(s.id));
      const studentsWithoutFiles = selectedNonAbsentStudents.filter((s) => !fileMap.has(s.id));

      // 只对非缺考学生中没有图片的情况报错
      if (studentsWithoutFiles.length > 0) {
        alert(`${studentsWithoutFiles.length} 名学生没有图片文件，无法处理`);
        return;
      }

      if (studentsWithFiles.length === 0) {
        // 检查是否所有选中的非缺考学生都没有图片
        if (selectedNonAbsentStudents.length > 0) {
          alert("选中的学生都没有图片文件");
        } else {
          // 如果所有选中的都是缺考学生，提示用户
          alert("选中的学生都是缺考状态，无需处理");
        }
        return;
      }

      const confirm = window.confirm(
        `确定要对 ${studentsWithFiles.length} 名学生进行批量处理吗？`
      );
      if (!confirm) return;

      studentsToProcess = studentsWithFiles;
      // 只传递有图片的非缺考学生的ID
      studentIds = studentsWithFiles.map((s) => s.id);
    } else {
      const pendingStudentsWithFiles = students.filter(
        (s) => s.status === StudentStatus.Pending && fileMap.has(s.id)
      );
      
      const pendingStudentsWithoutFiles = students.filter(
        (s) => s.status === StudentStatus.Pending && !fileMap.has(s.id)
      );

      if (pendingStudentsWithFiles.length === 0) {
        let errorMsg = "没有需要评分的学生。\n\n";
        if (pendingStudentsWithoutFiles.length > 0) {
          errorMsg += `发现 ${pendingStudentsWithoutFiles.length} 名待评分学生，但未映射图片文件。\n`;
          errorMsg += "请先通过侧边栏导入图片文件进行映射。";
        } else {
          const allPending = students.filter((s) => s.status === StudentStatus.Pending);
          if (allPending.length > 0) {
            errorMsg += `有 ${allPending.length} 名学生状态为待评分，但未映射图片文件。\n`;
            errorMsg += "请先通过侧边栏导入图片文件进行映射。";
          } else {
            errorMsg += "当前没有状态为待评分的学生。\n";
            errorMsg += "提示：可以选中学生后点击批量处理进行重新识别。";
          }
        }
        alert(errorMsg);
        return;
      }

      const confirm = window.confirm(
        `即将对 ${pendingStudentsWithFiles.length} 名学生进行批量评分，是否继续？`
      );
      if (!confirm) return;

      studentsToProcess = pendingStudentsWithFiles;
    }

    startGrading();
    updateProgress(0, studentsToProcess.length);

    try {
      const completedIds = new Set<string>();
      await gradeBatchWithFiles(
        students,
        fileMap,
        config,
        (progress) => {
          if (progress.result) {
            updateStudentGradingResult(progress.studentId, progress.result, {
              startTime: progress.startTime,
              endTime: progress.endTime,
              duration: progress.duration,
            });
            completedIds.add(progress.studentId);
          } else if (progress.error) {
            updateStudent(progress.studentId, {
              status: StudentStatus.Failed,
              processingStartTime: progress.startTime,
              processingEndTime: progress.endTime,
              processingDuration: progress.duration,
            });
            completedIds.add(progress.studentId);
          } else {
            updateStudent(progress.studentId, {
              status: StudentStatus.Processing,
              processingStartTime: progress.startTime,
            });
          }
          updateProgress(completedIds.size, studentsToProcess.length);
        },
        undefined,
        (log) => {
          const student = students.find((s) => s.id === log.studentId);
          addApiLog({
            ...log,
            studentId: student?.id,
            studentName: student?.name,
          });
        },
        studentIds
      );
      
      // 清空选择在外部处理，这里不需要调用 onClearSelection
    } catch (error: any) {
      // 如果是取消操作，不显示错误提示
      if (error.message !== "批量处理已取消" && error.message !== "评分已取消") {
        alert(`批量处理失败: ${error.message}`);
      }
    } finally {
      stopGrading();
    }
  }, [
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
    onClearSelection,
  ]);

  const handleRetry = useCallback(async (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    if (!student || !fileMap.has(studentId)) {
      alert("该学生没有图片文件");
      return;
    }

    const startTime = Date.now();
    updateStudent(studentId, { 
      status: StudentStatus.Processing,
      processingStartTime: startTime,
    });
    const service = new GradingService(config, (log) => {
      addApiLog({
        ...log,
        studentId: student.id,
        studentName: student.name,
      });
    });

    try {
      const file = fileMap.get(studentId)!;
      const result = await service.gradeImage(file);
      const endTime = Date.now();
      const duration = endTime - startTime;
      updateStudentGradingResult(studentId, result, {
        startTime,
        endTime,
        duration,
      });
    } catch (error: any) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      updateStudent(studentId, { 
        status: StudentStatus.Failed,
        processingStartTime: startTime,
        processingEndTime: endTime,
        processingDuration: duration,
      });
      alert(`评分失败: ${error.message}`);
    }
  }, [students, fileMap, config, updateStudent, updateStudentGradingResult, addApiLog]);

  return {
    handleBatchGrading,
    handleRetry,
  };
};
