import { AppConfig, Student } from "../types";
import { DEFAULT_CONFIG } from "../constants";

const STORAGE_KEY_CONFIG = "grader_ai_config";
const STORAGE_KEY_STUDENTS = "grader_ai_students";

export const loadConfig = (): AppConfig => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (stored) {
      const config = JSON.parse(stored) as AppConfig;
      // 确保所有必需字段都存在
      return {
        ...DEFAULT_CONFIG,
        ...config,
      };
    }
  } catch (error) {
    console.error("Failed to load config from localStorage:", error);
  }
  return DEFAULT_CONFIG;
};

export const saveConfig = (config: AppConfig): void => {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  } catch (error) {
    console.error("Failed to save config to localStorage:", error);
  }
};

export const loadStudents = (): Student[] | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_STUDENTS);
    if (stored) {
      return JSON.parse(stored) as Student[];
    }
  } catch (error) {
    console.error("Failed to load students from localStorage:", error);
  }
  return null;
};

export const saveStudents = (students: Student[]): void => {
  try {
    // 清理 imageUrl（使用 URL.createObjectURL 创建的临时 URL 不能序列化）
    const serializableStudents = students.map((s) => {
      const { imageUrl, ...rest } = s;
      return rest;
    });
    localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(serializableStudents));
  } catch (error) {
    console.error("Failed to save students to localStorage:", error);
  }
};
