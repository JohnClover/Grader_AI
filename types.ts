export enum StudentStatus {
  Processing = "Processing",
  Graded = "Graded",
  Pending = "Pending",
  Absent = "Absent",
  Failed = "Failed",
}

// ROI区域定义（相对于图片的百分比）
export interface ROIRegion {
  top: number;    // 顶部位置百分比 (0-100)
  left: number;   // 左侧位置百分比 (0-100)
  width: number;  // 宽度百分比 (0-100)
  height: number; // 高度百分比 (0-100)
}

export interface Student {
  id: string;
  name: string;
  class?: string; // 班级
  status: StudentStatus;
  fileName: string | null;
  score: number | null;
  maxScore: number;
  imageUrl?: string;
  gradingResult?: GradingResult;
  // 处理时间统计
  processingStartTime?: number; // 开始处理时间（时间戳，毫秒）
  processingEndTime?: number; // 结束处理时间（时间戳，毫秒）
  processingDuration?: number; // 处理时长（毫秒）
}

// API 返回的原始格式（与 PRD JSON 示例对齐）
export interface GradingResultAPI {
  recognized_text: string;
  content_score: number;
  language_score: number;
  total_score: number;
  content_comment: string;
  language_comment: string;
  general_comment?: string;
}

// 内部使用的格式
export interface GradingResult {
  totalScore: number;
  contentScore: number;
  contentMax: number;
  languageScore: number;
  languageMax: number;
  ocrText: string;
  comments: {
    content: string;
    language: string;
    general?: string;
  };
}

// 图片映射结果
export interface ImageMappingResult {
  studentId: string;
  file: File;
  fileName: string;
  mappingMethod: "exact" | "sequential" | "ordered";
}

export interface AppConfig {
  apiProvider: "gemini" | "poe";
  apiKey: string;
  model: string;
  baseUrl: string;
  concurrency: number;
  taskPrompt: string;
  contentPoints: string[];
  // 内容评分模式：points（6个独立点）或 text（整体文本）
  contentPointsMode?: "points" | "text";
  // 文本模式下的内容评分标准
  contentPointsText?: string;
  // 内容分满分（默认6）
  contentMax?: number;
  // 语言分满分（默认9）
  languageMax?: number;
  // Poe API 配置
  poeApiKey: string;
  poeModel: string;
  poeThinkingLevel: "low" | "minimal" | "high";
  // 全局ROI设置（应用到所有学生）
  globalROI?: ROIRegion;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  provider: "gemini" | "poe";
  model: string;
}

// API 对话日志
export interface ApiLogEntry {
  id: string;
  timestamp: number;
  studentId?: string;
  studentName?: string;
  direction: "request" | "response";
  provider: "gemini" | "poe";
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: any;
  response?: any;
  status?: number;
  error?: string;
  duration?: number; // 毫秒
  usage?: TokenUsage;
}
