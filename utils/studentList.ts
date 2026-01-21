import { Student, StudentStatus, AppConfig } from "../types";
import * as XLSX from "xlsx";

/**
 * 从 CSV 文件解析学生列表
 * @param file CSV 文件
 * @param config 应用配置（用于计算 maxScore）
 * @returns 学生列表
 */
export const parseCSV = async (file: File, config?: AppConfig): Promise<Student[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter((line) => line.trim());
        const students: Student[] = [];

        // 跳过标题行（如果有）
        const startIndex = lines[0]?.includes("学号") || lines[0]?.includes("ID") ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const parts = line.split(",").map((p) => p.trim());
          if (parts.length >= 1) {
            const id = parts[0];
            const name = parts[1] || `Student ${id}`;
            const contentMax = config?.contentMax ?? 6;
            const languageMax = config?.languageMax ?? 9;
            students.push({
              id,
              name,
              status: StudentStatus.Pending,
              fileName: null,
              score: null,
              maxScore: contentMax + languageMax,
            });
          }
        }

        resolve(students);
      } catch (error) {
        reject(new Error(`CSV 解析失败: ${error}`));
      }
    };
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsText(file, "UTF-8");
  });
};

/**
 * 从 Excel 文件解析学生列表
 * @param file Excel 文件
 * @param config 应用配置（用于计算 maxScore）
 * @returns 学生列表
 */
export const parseExcel = async (file: File, config?: AppConfig): Promise<Student[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet) as any[];

        const students: Student[] = jsonData.map((row, index) => {
          // 尝试多种可能的列名
          const id =
            row["学号"] ||
            row["ID"] ||
            row["id"] ||
            row["Student ID"] ||
            row["student_id"] ||
            String(index + 1);
          const name =
            row["姓名"] ||
            row["Name"] ||
            row["name"] ||
            row["Student Name"] ||
            row["student_name"] ||
            `Student ${id}`;

          const contentMax = config?.contentMax ?? 6;
          const languageMax = config?.languageMax ?? 9;
          return {
            id: String(id),
            name: String(name),
            status: StudentStatus.Pending,
            fileName: null,
            score: null,
            maxScore: contentMax + languageMax,
          };
        });

        resolve(students);
      } catch (error) {
        reject(new Error(`Excel 解析失败: ${error}`));
      }
    };
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * 解析学生列表文件（自动识别 CSV 或 Excel）
 * @param file 学生列表文件
 * @param config 应用配置（用于计算 maxScore）
 */
export const parseStudentList = async (file: File, config?: AppConfig): Promise<Student[]> => {
  const fileName = file.name.toLowerCase();
  if (fileName.endsWith(".csv")) {
    return parseCSV(file, config);
  } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    return parseExcel(file, config);
  } else {
    throw new Error("不支持的文件格式，请使用 CSV 或 Excel 文件");
  }
};

/**
 * 根据学号范围生成学生列表
 * @param startId 起始学号（数字）
 * @param endId 结束学号（数字）
 * @param prefix 学号前缀（可选，如 "2023"）
 * @param config 应用配置（用于计算 maxScore）
 * @returns 学生列表
 */
export const generateStudentList = (
  startId: number,
  endId: number,
  prefix: string = "",
  config?: AppConfig
): Student[] => {
  const contentMax = config?.contentMax ?? 6;
  const languageMax = config?.languageMax ?? 9;
  const students: Student[] = [];
  for (let i = startId; i <= endId; i++) {
    const id = prefix ? `${prefix}${String(i).padStart(3, "0")}` : String(i);
    students.push({
      id,
      name: `Student ${id}`,
      status: StudentStatus.Pending,
      fileName: null,
      score: null,
      maxScore: contentMax + languageMax,
    });
  }
  return students;
};
