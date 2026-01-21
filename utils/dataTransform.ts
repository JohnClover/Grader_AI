import { GradingResult, GradingResultAPI } from "../types";

/**
 * 将 API 返回的字段名转换为内部使用的格式
 * @param apiResponse API 返回的原始数据
 * @param contentMax 内容分满分（默认6）
 * @param languageMax 语言分满分（默认9）
 */
export const normalizeGradingResult = (
  apiResponse: GradingResultAPI,
  contentMax: number = 6,
  languageMax: number = 9
): GradingResult => {
  return {
    totalScore: apiResponse.total_score,
    contentScore: apiResponse.content_score,
    contentMax,
    languageScore: apiResponse.language_score,
    languageMax,
    ocrText: apiResponse.recognized_text,
    comments: {
      content: apiResponse.content_comment,
      language: apiResponse.language_comment,
      general: apiResponse.general_comment,
    },
  };
};
