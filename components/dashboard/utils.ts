import { StudentStatus } from "../../types";

/**
 * 获取学生状态对应的 CSS 类名
 */
export const getStatusColor = (status: StudentStatus): string => {
  switch (status) {
    case StudentStatus.Processing:
      return "bg-amber-100 text-amber-800 border-amber-200";
    case StudentStatus.Graded:
      return "bg-green-100 text-green-800 border-green-200";
    case StudentStatus.Absent:
      return "bg-red-100 text-red-800 border-red-200";
    case StudentStatus.Failed:
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
};

/**
 * 根据分数百分比计算颜色（0%红色，100%绿色，渐变色）
 */
export const getScoreColor = (score: number, maxScore: number): string => {
  if (maxScore === 0) return "#6b7280"; // 灰色，如果满分为0
  
  const percentage = (score / maxScore) * 100;
  
  // 颜色定义
  // 红色: rgb(220, 38, 38) - #dc2626 (0%)
  // 黄色: rgb(234, 179, 8) - #eab308 (50%)
  // 绿色: rgb(34, 197, 94) - #22c55e (100%)
  
  let r: number, g: number, b: number;
  
  if (percentage <= 50) {
    // 0% - 50%: 红色到黄色
    const ratio = percentage / 50;
    r = Math.round(220 + (234 - 220) * ratio);
    g = Math.round(38 + (179 - 38) * ratio);
    b = Math.round(38 + (8 - 38) * ratio);
  } else {
    // 50% - 100%: 黄色到绿色
    const ratio = (percentage - 50) / 50;
    r = Math.round(234 + (34 - 234) * ratio);
    g = Math.round(179 + (197 - 179) * ratio);
    b = Math.round(8 + (94 - 8) * ratio);
  }
  
  return `rgb(${r}, ${g}, ${b})`;
};

/**
 * 格式化时间显示（毫秒转换为可读格式）
 */
export const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
};
