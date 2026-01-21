import { GoogleGenAI } from "@google/genai";
import { AppConfig, GradingResult, GradingResultAPI, ApiLogEntry, TokenUsage } from "../types";
import { compressImage, compressImageWithROI } from "../utils/imageUtils";
import { normalizeGradingResult } from "../utils/dataTransform";

const buildTokenUsage = (input: {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  provider: "gemini" | "poe";
  model: string;
}): TokenUsage | undefined => {
  const promptTokens = input.promptTokens;
  const completionTokens = input.completionTokens;
  let totalTokens = input.totalTokens;

  if (typeof totalTokens !== "number" && typeof promptTokens === "number" && typeof completionTokens === "number") {
    totalTokens = promptTokens + completionTokens;
  }

  if (typeof promptTokens !== "number" || typeof completionTokens !== "number" || typeof totalTokens !== "number") {
    return undefined;
  }

  return {
    promptTokens,
    completionTokens,
    totalTokens,
    provider: input.provider,
    model: input.model,
  };
};

const extractGeminiUsage = (response: any, model: string): TokenUsage | undefined => {
  const usage = response?.usageMetadata || response?.usage || response?.usage_metadata;
  return buildTokenUsage({
    promptTokens: usage?.promptTokenCount ?? usage?.prompt_tokens ?? usage?.promptTokens,
    completionTokens: usage?.candidatesTokenCount ?? usage?.completion_tokens ?? usage?.completionTokens,
    totalTokens: usage?.totalTokenCount ?? usage?.total_tokens ?? usage?.totalTokens,
    provider: "gemini",
    model,
  });
};

const extractOpenAIUsage = (
  usage: any,
  provider: "gemini" | "poe",
  model: string
): TokenUsage | undefined => {
  return buildTokenUsage({
    promptTokens: usage?.prompt_tokens,
    completionTokens: usage?.completion_tokens,
    totalTokens: usage?.total_tokens,
    provider,
    model,
  });
};

export class GradingService {
  private config: AppConfig;
  private onLog?: (log: Omit<ApiLogEntry, "id" | "timestamp">) => void;

  constructor(config: AppConfig, onLog?: (log: Omit<ApiLogEntry, "id" | "timestamp">) => void) {
    this.config = config;
    this.onLog = onLog;
  }

  /**
   * 评分图片（接收 File 对象，内部压缩）
   */
  async gradeImage(file: File): Promise<GradingResult> {
    if (this.config.apiProvider === "gemini" && !this.config.apiKey) {
      throw new Error("Gemini API Key is missing");
    }
    if (this.config.apiProvider === "poe" && !this.config.poeApiKey) {
      throw new Error("Poe API Key is missing");
    }

    const roiRegion = this.config.globalROI;
    const base64Image = roiRegion
      ? await compressImageWithROI(file, roiRegion)
      : await compressImage(file);

    return this.gradeImageBase64(base64Image);
  }

  /**
   * 评分图片（接收 base64 字符串）
   */
  async gradeImageBase64(base64Image: string): Promise<GradingResult> {
    if (this.config.apiProvider === "gemini") {
      return this.gradeImageWithGemini(base64Image);
    } else if (this.config.apiProvider === "poe") {
      return this.gradeImageWithPoe(base64Image);
    } else {
      throw new Error("Unknown API provider");
    }
  }

  /**
   * 使用 Gemini API 评分
   */
  private async gradeImageWithGemini(base64Image: string): Promise<GradingResult> {
    if (!this.config.apiKey) {
      throw new Error("API Key is missing");
    }

    // 构建 Gemini API 客户端
    const aiConfig: any = { apiKey: this.config.apiKey };
    const ai = new GoogleGenAI(aiConfig);

    // 构建符合 PRD 要求的 Prompt
    const contentPointsMode = this.config.contentPointsMode || "points";
    let contentPointsList: string;
    
    if (contentPointsMode === "text" && this.config.contentPointsText) {
      // 文本模式：直接使用文本内容
      contentPointsList = this.config.contentPointsText;
    } else {
      // 点模式：将6个点格式化为列表
      contentPointsList = this.config.contentPoints
        .filter((p) => p.trim())
        .map((p, i) => `${i + 1}. ${p}`)
        .join("\n");
    }

    const contentMax = this.config.contentMax ?? 6;
    const languageMax = this.config.languageMax ?? 9;
    const totalMax = contentMax + languageMax;

    const promptText = `You are a strict English teacher grading for the Guangdong High School Entrance Exam.

Task Prompt: ${this.config.taskPrompt}

Grading Criteria (Guangdong High School Entrance Exam ${totalMax}-Point System):

1. Content (0-${contentMax} points): Evaluate based on these required points:
${contentPointsList}

2. Language (0-${languageMax} points): Detailed grading criteria:
   - Error deduction: Every 3 minor errors deduct 1 point. The same error type should NOT be counted multiple times.
   - Tense requirement: If the task is about "从事某一爱好的经历" (experience of engaging in a hobby), failure to use simple past tense deducts 0.5 points.
   - Word count (60 words as baseline):
     * For every 10 words below 60, deduct 2 points.
     * Exceeding word count does NOT deduct points in this round.
     * However, if the text is excessively long (e.g., tiny handwriting filling the entire page densely), deduct 1 point.
   - Content completeness: If content is missing, the language score should also be reduced/downgraded.
   - Handwriting and corrections: Handwriting quality and corrections affect the score. If there are more than 3 corrections, full marks (${languageMax} points) cannot be given. (Note: Official exam standard requires no full marks if more than 2 corrections.)
   - Full marks (${languageMax} points) conditions:
     * Without complex sentences: No grammar errors, logical and reasonable.
     * With complex sentences: Has advanced sentence structures and vocabulary, but allows ONE non-communicative language error (e.g., singular/plural, spelling), still gives full marks.

Instructions:
- Recognize: Read the handwritten text from the image carefully. Transcribe all text accurately.
- Grade: Evaluate the essay based on the criteria above.
- Be strict but fair. Follow the Guangdong High School Entrance Exam grading standards.
- IMPORTANT: All comments (content_comment, language_comment, general_comment) MUST be written primarily in Chinese. Use Chinese for at least 80% of the comment content. You may include English terms or phrases only when necessary for technical accuracy (e.g., grammar terms, specific vocabulary).

Output: Return ONLY a valid JSON object with the following exact structure (use these exact field names):
{
  "recognized_text": "The full transcribed text from the image...",
  "content_score": <number between 0 and ${contentMax}>,
  "language_score": <number between 0 and ${languageMax}>,
  "total_score": <sum of content_score and language_score>,
  "content_comment": "内容方面的具体反馈，说明哪些要点已覆盖或缺失（必须主要使用中文）...",
  "language_comment": "语法、词汇和语言使用方面的具体反馈（必须主要使用中文）...",
  "general_comment": "整体评估和改进建议（必须主要使用中文）..."
}`;

    const requestBody = {
      model: this.config.model || "gemini-3-pro",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.substring(0, 100) + "...[truncated for display]", // 只显示前100个字符用于日志
            },
          },
          {
            text: promptText,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
      },
    };

    const startTime = Date.now();

    // 记录请求日志
    this.onLog?.({
      direction: "request",
      provider: "gemini",
      method: "POST",
      url: "https://generativelanguage.googleapis.com/v1beta/models/generateContent",
      body: requestBody,
    });

    try {
      const response = await ai.models.generateContent({
        model: this.config.model || "gemini-3-pro",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image,
              },
            },
            {
              text: promptText,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
        },
      });

      const duration = Date.now() - startTime;
      const text = response.text;
      if (!text) throw new Error("No response from Gemini");

      const resolvedModel = (response as any)?.modelVersion || this.config.model || "gemini-3-pro";
      const usage = extractGeminiUsage(response, resolvedModel);

      // 记录响应日志
      this.onLog?.({
        direction: "response",
        provider: "gemini",
        status: 200,
        usage,
        response: {
          text: text.substring(0, 500) + (text.length > 500 ? "...[truncated]" : ""), // 限制日志长度
          fullLength: text.length,
        },
        duration,
      });

      // 解析 JSON（可能包含 markdown 代码块）
      let jsonText = text.trim();
      if (jsonText.startsWith("```")) {
        // 移除 markdown 代码块标记
        jsonText = jsonText.replace(/^```json\n?/, "").replace(/^```\n?/, "").replace(/\n?```$/, "");
      }

      const apiResult = JSON.parse(jsonText) as GradingResultAPI;

      // 转换为内部格式
      return normalizeGradingResult(
        apiResult,
        this.config.contentMax ?? 6,
        this.config.languageMax ?? 9
      );
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error("Gemini Grading Error:", error);
      
      // 记录错误日志
      this.onLog?.({
        direction: "response",
        provider: "gemini",
        status: error.status || 500,
        error: error.message || String(error),
        duration,
      });

      // 提供更友好的错误信息
      if (error.message?.includes("API_KEY")) {
        throw new Error("API Key 无效，请检查配置");
      } else if (error.message?.includes("429") || error.status === 429) {
        throw new Error("Rate Limit 超出，请稍后重试");
      } else if (error.message?.includes("parse") || error.message?.includes("JSON")) {
        throw new Error("API 返回格式错误，请重试");
      }
      throw error;
    }
  }

  /**
   * 使用 Poe API 评分
   */
  private async gradeImageWithPoe(base64Image: string): Promise<GradingResult> {
    if (!this.config.poeApiKey) {
      throw new Error("Poe API Key is missing");
    }

    // 构建符合 PRD 要求的 Prompt
    const contentPointsMode = this.config.contentPointsMode || "points";
    let contentPointsList: string;
    
    if (contentPointsMode === "text" && this.config.contentPointsText) {
      // 文本模式：直接使用文本内容
      contentPointsList = this.config.contentPointsText;
    } else {
      // 点模式：将6个点格式化为列表
      contentPointsList = this.config.contentPoints
        .filter((p) => p.trim())
        .map((p, i) => `${i + 1}. ${p}`)
        .join("\n");
    }

    const contentMax = this.config.contentMax ?? 6;
    const languageMax = this.config.languageMax ?? 9;
    const totalMax = contentMax + languageMax;

    const promptText = `You are a strict English teacher grading for the Guangdong High School Entrance Exam.

Task Prompt: ${this.config.taskPrompt}

Grading Criteria (Guangdong High School Entrance Exam ${totalMax}-Point System):

1. Content (0-${contentMax} points): Evaluate based on these required points:
${contentPointsList}

2. Language (0-${languageMax} points): Detailed grading criteria:
   - Error deduction: Every 3 minor errors deduct 1 point. The same error type should NOT be counted multiple times.
   - Tense requirement: If the task is about "从事某一爱好的经历" (experience of engaging in a hobby), failure to use simple past tense deducts 0.5 points.
   - Word count (60 words as baseline):
     * For every 10 words below 60, deduct 2 points.
     * Exceeding word count does NOT deduct points in this round.
     * However, if the text is excessively long (e.g., tiny handwriting filling the entire page densely), deduct 1 point.
   - Content completeness: If content is missing, the language score should also be reduced/downgraded.
   - Handwriting and corrections: Handwriting quality and corrections affect the score. If there are more than 3 corrections, full marks (${languageMax} points) cannot be given. (Note: Official exam standard requires no full marks if more than 2 corrections.)
   - Full marks (${languageMax} points) conditions:
     * Without complex sentences: No grammar errors, logical and reasonable.
     * With complex sentences: Has advanced sentence structures and vocabulary, but allows ONE non-communicative language error (e.g., singular/plural, spelling), still gives full marks.

Instructions:
- Recognize: Read the handwritten text from the image carefully. Transcribe all text accurately.
- Grade: Evaluate the essay based on the criteria above.
- Be strict but fair. Follow the Guangdong High School Entrance Exam grading standards.
- IMPORTANT: All comments (content_comment, language_comment, general_comment) MUST be written primarily in Chinese. Use Chinese for at least 80% of the comment content. You may include English terms or phrases only when necessary for technical accuracy (e.g., grammar terms, specific vocabulary).

Output: Return ONLY a valid JSON object with the following exact structure (use these exact field names):
{
  "recognized_text": "The full transcribed text from the image...",
  "content_score": <number between 0 and ${contentMax}>,
  "language_score": <number between 0 and ${languageMax}>,
  "total_score": <sum of content_score and language_score>,
  "content_comment": "内容方面的具体反馈，说明哪些要点已覆盖或缺失（必须主要使用中文）...",
  "language_comment": "语法、词汇和语言使用方面的具体反馈（必须主要使用中文）...",
  "general_comment": "整体评估和改进建议（必须主要使用中文）..."
}`;

    const startTime = Date.now();

    try {
      // 构建请求体
      const requestBody: any = {
        model: this.config.poeModel || "gemini-3-pro",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image.substring(0, 50)}...[truncated]`,
                },
              },
              {
                type: "text",
                text: promptText,
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
      };

      // 如果设置了 thinking_level，添加 extra_body
      // low 是默认值，不需要 extra_body；minimal 和 high 需要显式设置
      // 注意：flash 模型（如 gemini-3-flash）支持 minimal 选项，这是 flash 模型特有的
      if (this.config.poeThinkingLevel === "minimal" || this.config.poeThinkingLevel === "high") {
        requestBody.extra_body = { thinking_level: this.config.poeThinkingLevel };
      }

      // 使用 fetch 调用 Poe API
      // 在开发环境中，优先使用 Vite 代理以避免 CORS 问题
      const apiUrl = import.meta.env.DEV 
        ? "/api/poe/chat/completions" 
        : "https://api.poe.com/v1/chat/completions";
      
      // 记录请求日志
      this.onLog?.({
        direction: "request",
        provider: "poe",
        method: "POST",
        url: apiUrl,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.config.poeApiKey.substring(0, 10)}...[hidden]`,
        },
        body: requestBody,
      });

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.config.poeApiKey}`,
        },
        body: JSON.stringify({
          ...requestBody,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`,
                  },
                },
                {
                  type: "text",
                  text: promptText,
                },
              ],
            },
          ],
        }),
        mode: "cors",
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // 记录错误日志
        this.onLog?.({
          direction: "response",
          provider: "poe",
          status: response.status,
          error: errorData.error?.message || `API 请求失败: ${response.status}`,
          response: errorData,
          duration,
        });

        if (response.status === 401) {
          throw new Error("Poe API Key 无效，请检查配置");
        } else if (response.status === 429) {
          throw new Error("Rate Limit 超出，请稍后重试");
        }
        throw new Error(errorData.error?.message || `API 请求失败: ${response.status}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error("No response from Poe API");

      const resolvedModel = data.model || this.config.poeModel || "unknown";
      const usage = extractOpenAIUsage(data.usage, "poe", resolvedModel);

      // 记录响应日志
      this.onLog?.({
        direction: "response",
        provider: "poe",
        status: response.status,
        usage,
        response: {
          ...data,
          choices: data.choices?.map((choice: any) => ({
            ...choice,
            message: {
              ...choice.message,
              content: choice.message?.content?.substring(0, 500) + (choice.message?.content?.length > 500 ? "...[truncated]" : ""),
            },
          })),
        },
        duration,
      });

      // 解析 JSON（可能包含 markdown 代码块或思考过程）
      let jsonText = text.trim();
      
      // 方法1: 如果包含 ```json 代码块，提取代码块内容
      const jsonCodeBlockMatch = jsonText.match(/```json\s*\n([\s\S]*?)\n?```/);
      if (jsonCodeBlockMatch) {
        jsonText = jsonCodeBlockMatch[1].trim();
      } else if (jsonText.startsWith("```")) {
        // 方法2: 如果以 ``` 开头（可能是 ``` 或 ```json），移除代码块标记
        jsonText = jsonText.replace(/^```json\s*\n?/, "").replace(/^```\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
      } else {
        // 方法3: 尝试查找第一个 { 和最后一个 } 之间的内容（处理包含思考过程的情况）
        const firstBrace = jsonText.indexOf('{');
        const lastBrace = jsonText.lastIndexOf('}');
        if (firstBrace >= 0 && lastBrace > firstBrace) {
          jsonText = jsonText.substring(firstBrace, lastBrace + 1);
        }
      }

      const apiResult = JSON.parse(jsonText) as GradingResultAPI;

      // 转换为内部格式
      return normalizeGradingResult(
        apiResult,
        this.config.contentMax ?? 6,
        this.config.languageMax ?? 9
      );
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error("Poe Grading Error:", error);
      
      // 记录错误日志（如果还没有记录过）
      if (!error.logged) {
        this.onLog?.({
          direction: "response",
          provider: "poe",
          status: error.status || 500,
          error: error.message || String(error),
          duration,
        });
      }

      // 提供更友好的错误信息
      if (error.message?.includes("API_KEY") || error.message?.includes("无效")) {
        throw new Error("Poe API Key 无效，请检查配置");
      } else if (error.message?.includes("429") || error.message?.includes("Rate Limit")) {
        throw new Error("Rate Limit 超出，请稍后重试");
      } else if (error.message?.includes("parse") || error.message?.includes("JSON")) {
        throw new Error("API 返回格式错误，请重试");
      } else if (error.message?.includes("CORS") || error.message?.includes("Failed to fetch") || error.message?.includes("Access-Control")) {
        throw new Error("CORS 错误：Poe API 不允许从浏览器直接访问。请使用后端代理或联系管理员配置代理服务器。");
      }
      throw error;
    }
  }
}
