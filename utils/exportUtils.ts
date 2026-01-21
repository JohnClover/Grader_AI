import * as XLSX from "xlsx";
import { Student, StudentStatus } from "../types";

/**
 * 导出评分结果到 Excel
 */
export const exportToExcel = (students: Student[]): void => {
  // 准备数据
  const data = students.map((student) => {
    const result = student.gradingResult;
    return {
      学号: student.id,
      姓名: student.name,
      班级: student.class || "--",
      状态:
        student.status === StudentStatus.Graded
          ? "已评分"
          : student.status === StudentStatus.Absent
          ? "缺考"
          : student.status === StudentStatus.Failed
          ? "失败"
          : student.status === StudentStatus.Processing
          ? "处理中"
          : "待评分",
      文件名: student.fileName || "--",
      识别出的作文文本: result?.ocrText || "--",
      内容分: result?.contentScore ?? "--",
      语言分: result?.languageScore ?? "--",
      总分: result?.totalScore ?? student.score ?? "--",
      内容评语: result?.comments?.content || "--",
      语言评语: result?.comments?.language || "--",
      总评语: result?.comments?.general || "--",
    };
  });

  // 创建工作簿
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // 设置列宽
  const colWidths = [
    { wch: 12 }, // 学号
    { wch: 15 }, // 姓名
    { wch: 12 }, // 班级
    { wch: 10 }, // 状态
    { wch: 20 }, // 文件名
    { wch: 50 }, // 识别出的作文文本
    { wch: 8 },  // 内容分
    { wch: 8 },  // 语言分
    { wch: 8 },  // 总分
    { wch: 40 }, // 内容评语
    { wch: 40 }, // 语言评语
    { wch: 40 }, // 总评语
  ];
  ws["!cols"] = colWidths;

  // 添加工作表
  XLSX.utils.book_append_sheet(wb, ws, "作文评分");

  // 生成文件名
  const now = new Date();
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  const fileName = `作文评分_${timestamp}.xlsx`;

  // 导出文件
  XLSX.writeFile(wb, fileName);
};
