import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Student, StudentStatus, AppConfig, GradingResult, ApiLogEntry } from "../types";
import { loadConfig, saveConfig, loadStudents, saveStudents } from "../utils/storage";
import { MOCK_STUDENTS } from "../constants";

interface AppContextType {
  // State
  students: Student[];
  config: AppConfig;
  isGrading: boolean;
  gradingProgress: { current: number; total: number };
  fileMap: Map<string, File>; // 存储学生ID到File对象的映射
  apiLogs: ApiLogEntry[]; // API对话日志

  // Actions
  updateStudent: (id: string, updates: Partial<Student>) => void;
  updateConfig: (updates: Partial<AppConfig>) => void;
  setStudents: (students: Student[]) => void;
  startGrading: () => void;
  stopGrading: () => void;
  updateProgress: (current: number, total: number) => void;
  updateStudentGradingResult: (id: string, result: GradingResult) => void;
  setFileMap: (fileMap: Map<string, File>) => void;
  setStudentFile: (studentId: string, file: File | null) => void;
  addApiLog: (log: Omit<ApiLogEntry, "id" | "timestamp">) => void;
  clearApiLogs: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [config, setConfigState] = useState<AppConfig>(loadConfig());
  const [students, setStudentsState] = useState<Student[]>(() => {
    const saved = loadStudents();
    return saved || MOCK_STUDENTS;
  });
  const [isGrading, setIsGrading] = useState(false);
  const [gradingProgress, setGradingProgress] = useState({ current: 0, total: 0 });
  const [fileMap, setFileMapState] = useState<Map<string, File>>(new Map());
  const [apiLogs, setApiLogs] = useState<ApiLogEntry[]>([]);

  const updateConfig = useCallback((updates: Partial<AppConfig>) => {
    setConfigState((prev) => {
      const newConfig = { ...prev, ...updates };
      saveConfig(newConfig);
      return newConfig;
    });
  }, []);

  const setStudents = useCallback((newStudents: Student[]) => {
    setStudentsState(newStudents);
    saveStudents(newStudents);
  }, []);

  const updateStudent = useCallback((id: string, updates: Partial<Student>) => {
    setStudentsState((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, ...updates } : s));
      saveStudents(updated);
      return updated;
    });
  }, []);

  const updateStudentGradingResult = useCallback((id: string, result: GradingResult, processingTime?: { startTime?: number; endTime?: number; duration?: number }) => {
    setStudentsState((prev) => {
      const updated = prev.map((s) => {
        if (s.id === id) {
          return {
            ...s,
            status: StudentStatus.Graded,
            score: result.totalScore,
            gradingResult: result,
            processingStartTime: processingTime?.startTime ?? s.processingStartTime,
            processingEndTime: processingTime?.endTime ?? s.processingEndTime,
            processingDuration: processingTime?.duration ?? s.processingDuration,
          };
        }
        return s;
      });
      saveStudents(updated);
      return updated;
    });
  }, []);

  const startGrading = useCallback(() => {
    setIsGrading(true);
  }, []);

  const stopGrading = useCallback(() => {
    // 调用取消函数来中止正在进行的处理
    if ((window as any).__gradingCancel) {
      (window as any).__gradingCancel();
    }
    setIsGrading(false);
    setGradingProgress({ current: 0, total: 0 });
    setStudentsState((prev) => {
      const updated = prev.map((student) => {
        if (student.status !== StudentStatus.Processing) return student;
        return {
          ...student,
          status: StudentStatus.Pending,
          processingStartTime: undefined,
          processingEndTime: undefined,
          processingDuration: undefined,
        };
      });
      saveStudents(updated);
      return updated;
    });
  }, []);

  const updateProgress = useCallback((current: number, total: number) => {
    setGradingProgress({ current, total });
  }, []);

  const setFileMap = useCallback((newFileMap: Map<string, File>) => {
    setFileMapState(newFileMap);
  }, []);

  const setStudentFile = useCallback((studentId: string, file: File | null) => {
    setFileMapState((prev) => {
      const newMap = new Map(prev);
      if (file) {
        newMap.set(studentId, file);
      } else {
        newMap.delete(studentId);
      }
      return newMap;
    });
  }, []);

  const addApiLog = useCallback((log: Omit<ApiLogEntry, "id" | "timestamp">) => {
    const newLog: ApiLogEntry = {
      ...log,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    setApiLogs((prev) => {
      // 限制最多保留1000条日志
      const updated = [newLog, ...prev].slice(0, 1000);
      return updated;
    });
  }, []);

  const clearApiLogs = useCallback(() => {
    setApiLogs([]);
  }, []);

  return (
    <AppContext.Provider
      value={{
        students,
        config,
        isGrading,
        gradingProgress,
        fileMap,
        apiLogs,
        updateStudent,
        updateConfig,
        setStudents,
        startGrading,
        stopGrading,
        updateProgress,
        updateStudentGradingResult,
        setFileMap,
        setStudentFile,
        addApiLog,
        clearApiLogs,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
