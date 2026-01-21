import { useState, useCallback, RefObject } from "react";
import { Student, AppConfig } from "../types";
import { parseStudentList, generateStudentList } from "../utils/studentList";

interface UseStudentListImportProps {
  config: AppConfig;
  listInputRef: RefObject<HTMLInputElement>;
  onImport: (students: Student[]) => void;
  onSelectFirst: (id: string) => void;
}

export const useStudentListImport = ({
  config,
  listInputRef,
  onImport,
  onSelectFirst,
}: UseStudentListImportProps) => {
  const [showExcelImportDialog, setShowExcelImportDialog] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);

  const handleImportList = useCallback(() => {
    listInputRef.current?.click();
  }, [listInputRef]);

  const handleListFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    
    // 如果是Excel文件，显示映射对话框
    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      setExcelFile(file);
      setShowExcelImportDialog(true);
      return;
    }

    // CSV文件保持原有逻辑
    try {
      const newStudents = await parseStudentList(file, config);
      onImport(newStudents);
      if (newStudents.length > 0) {
        onSelectFirst(newStudents[0].id);
      }
      alert(`成功导入 ${newStudents.length} 名学生`);
    } catch (error: any) {
      alert(`导入失败: ${error.message}`);
    }

    if (listInputRef.current) {
      listInputRef.current.value = "";
    }
  }, [config, listInputRef, onImport, onSelectFirst]);

  const handleExcelImport = useCallback((students: Student[]) => {
    onImport(students);
    if (students.length > 0) {
      onSelectFirst(students[0].id);
    }
    alert(`成功导入 ${students.length} 名学生`);
    setExcelFile(null);
    if (listInputRef.current) {
      listInputRef.current.value = "";
    }
  }, [listInputRef, onImport, onSelectFirst]);

  const handleGenerateList = useCallback(() => {
    const startId = parseInt(prompt("请输入起始学号（数字）:") || "1");
    const endId = parseInt(prompt("请输入结束学号（数字）:") || "50");
    const prefix = prompt("请输入学号前缀（可选，直接回车跳过）:") || "";

    if (isNaN(startId) || isNaN(endId) || startId > endId) {
      alert("输入无效");
      return;
    }

    const newStudents = generateStudentList(startId, endId, prefix, config);
    onImport(newStudents);
    if (newStudents.length > 0) {
      onSelectFirst(newStudents[0].id);
    }
    alert(`成功生成 ${newStudents.length} 名学生`);
  }, [config, onImport, onSelectFirst]);

  const handleCloseExcelImport = useCallback(() => {
    setShowExcelImportDialog(false);
    setExcelFile(null);
  }, []);

  return {
    showExcelImportDialog,
    excelFile,
    handleImportList,
    handleListFileChange,
    handleExcelImport,
    handleGenerateList,
    handleCloseExcelImport,
  };
};
