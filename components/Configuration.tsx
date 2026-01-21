import React, { useState, useEffect } from "react";
import { DEFAULT_CONFIG } from "../constants";
import { AppConfig } from "../types";
import { useAppContext } from "../contexts/AppContext";
import { GoogleGenAI } from "@google/genai";

export const Configuration: React.FC = () => {
  const { config, updateConfig } = useAppContext();
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showPoeApiKey, setShowPoeApiKey] = useState(false);
  const [isTestingApiKey, setIsTestingApiKey] = useState(false);
  const [apiKeyTestResult, setApiKeyTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  // 当切换 API Provider 时清除测试结果
  useEffect(() => {
    setApiKeyTestResult(null);
  }, [localConfig.apiProvider]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setLocalConfig((prev) => ({ ...prev, [name]: value }));
  };

  const handlePointChange = (index: number, value: string) => {
    const newPoints = [...localConfig.contentPoints];
    newPoints[index] = value;
    setLocalConfig((prev) => ({ ...prev, contentPoints: newPoints }));
  };

  const handleSave = () => {
    updateConfig(localConfig);
    setTestResult({ success: true, message: "配置已保存" });
    setTimeout(() => setTestResult(null), 3000);
  };

  const handleTestApiKey = async () => {
    if (localConfig.apiProvider === "gemini") {
      if (!localConfig.apiKey) {
        setApiKeyTestResult({ success: false, message: "请先输入 Gemini API Key" });
        return;
      }

      setIsTestingApiKey(true);
      setApiKeyTestResult(null);

      try {
        const ai = new GoogleGenAI({ apiKey: localConfig.apiKey });
        await ai.models.generateContent({
          model: localConfig.model || "gemini-3-pro",
          contents: {
            parts: [{ text: "Hello" }],
          },
        });
        setApiKeyTestResult({ success: true, message: "✓ API Key 有效" });
      } catch (error: any) {
        setApiKeyTestResult({
          success: false,
          message: error.message || "API Key 无效，请检查",
        });
      } finally {
        setIsTestingApiKey(false);
      }
    } else if (localConfig.apiProvider === "poe") {
      if (!localConfig.poeApiKey) {
        setApiKeyTestResult({ success: false, message: "请先输入 Poe API Key" });
        return;
      }

      setIsTestingApiKey(true);
      setApiKeyTestResult(null);

      try {
        const requestBody: any = {
          model: localConfig.poeModel || "gemini-3-pro",
          messages: [
            {
              role: "user",
              content: "Hello",
            },
          ],
        };

        // low 是默认值，不需要 extra_body；minimal 和 high 需要显式设置
        // 注意：flash 模型（如 gemini-3-flash）支持 minimal 选项，这是 flash 模型特有的
        if (localConfig.poeThinkingLevel === "minimal" || localConfig.poeThinkingLevel === "high") {
          requestBody.extra_body = { thinking_level: localConfig.poeThinkingLevel };
        }

        // 在开发环境中，优先使用 Vite 代理以避免 CORS 问题
        const apiUrl = import.meta.env.DEV 
          ? "/api/poe/chat/completions" 
          : "https://api.poe.com/v1/chat/completions";
        
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localConfig.poeApiKey}`,
          },
          body: JSON.stringify(requestBody),
          mode: "cors",
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `API 请求失败: ${response.status}`);
        }

        setApiKeyTestResult({ success: true, message: "✓ API Key 有效" });
      } catch (error: any) {
        setApiKeyTestResult({
          success: false,
          message: error.message || "API Key 无效，请检查",
        });
      } finally {
        setIsTestingApiKey(false);
      }
    }
  };

  const handleTestConnection = async () => {
    if (localConfig.apiProvider === "gemini" && !localConfig.apiKey) {
      setTestResult({ success: false, message: "请先输入 Gemini API Key" });
      return;
    }
    if (localConfig.apiProvider === "poe" && !localConfig.poeApiKey) {
      setTestResult({ success: false, message: "请先输入 Poe API Key" });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      if (localConfig.apiProvider === "gemini") {
        const ai = new GoogleGenAI({ apiKey: localConfig.apiKey });
        // 简单的测试调用，使用一个简单的文本生成请求
        await ai.models.generateContent({
          model: localConfig.model || "gemini-3-pro",
          contents: {
            parts: [{ text: "Hello" }],
          },
        });
        setTestResult({ success: true, message: "连接成功！Gemini API Key 有效" });
      } else if (localConfig.apiProvider === "poe") {
        // 测试 Poe API
        const requestBody: any = {
          model: localConfig.poeModel || "gemini-3-pro",
          messages: [
            {
              role: "user",
              content: "Hello",
            },
          ],
        };

        // 如果设置了 thinking_level，添加 extra_body
        // low 是默认值，不需要 extra_body；minimal 和 high 需要显式设置
        // 注意：flash 模型（如 gemini-3-flash）支持 minimal 选项，这是 flash 模型特有的
        if (localConfig.poeThinkingLevel === "minimal" || localConfig.poeThinkingLevel === "high") {
          requestBody.extra_body = { thinking_level: localConfig.poeThinkingLevel };
        }

        // 在开发环境中，优先使用 Vite 代理以避免 CORS 问题
        const apiUrl = import.meta.env.DEV 
          ? "/api/poe/chat/completions" 
          : "https://api.poe.com/v1/chat/completions";
        
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localConfig.poeApiKey}`,
          },
          body: JSON.stringify(requestBody),
          mode: "cors",
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `API 请求失败: ${response.status}`);
        }

        setTestResult({ success: true, message: "连接成功！Poe API Key 有效" });
      }
      handleSave();
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || "连接失败，请检查 API Key",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleReset = () => {
    setLocalConfig(DEFAULT_CONFIG);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto relative scroll-smooth bg-gray-50/50">
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-200 px-8 py-6 shadow-sm">
        <div className="max-w-5xl mx-auto w-full flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-slate-900 text-3xl font-black tracking-tight">
              AI Scoring Configuration
            </h2>
            <p className="text-slate-500 text-sm md:text-base font-normal max-w-2xl">
              Configure Gemini Pro API connection and grading rubric for the
              Guangdong High School Entrance Exam.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-primary bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            SYSTEM: ONLINE
          </div>
        </div>
      </div>

      <div className="flex-1 px-8 py-8 w-full max-w-5xl mx-auto flex flex-col gap-8 pb-32">
        {/* Connection Settings */}
        <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">api</span>
              Connection Settings
            </h3>
            <span
              className="material-symbols-outlined text-slate-400 cursor-help text-[20px] hover:text-slate-600 transition-colors"
              title="Configure your Gemini API endpoint"
            >
              help
            </span>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* API Provider Selection */}
            <div className="md:col-span-2">
              <label className="block text-slate-600 text-sm font-bold mb-2">
                API Provider
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="apiProvider"
                    value="gemini"
                    checked={localConfig.apiProvider === "gemini"}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <span className="text-slate-700 font-medium">Gemini</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="apiProvider"
                    value="poe"
                    checked={localConfig.apiProvider === "poe"}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <span className="text-slate-700 font-medium">Poe</span>
                </label>
              </div>
            </div>

            {/* Gemini Configuration */}
            {localConfig.apiProvider === "gemini" && (
              <>
                <div className="md:col-span-1">
                  <label className="block text-slate-600 text-sm font-bold mb-2">
                    Gemini API Key
                  </label>
                  <div className="flex w-full relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">
                      key
                    </span>
                    <input
                      name="apiKey"
                      className="w-full pl-10 pr-10 py-3 bg-white border border-gray-300 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono text-sm shadow-sm"
                      type={showApiKey ? "text" : "password"}
                      value={localConfig.apiKey}
                      onChange={handleInputChange}
                      placeholder="Paste your Google GenAI API Key"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showApiKey ? "visibility" : "visibility_off"}
                      </span>
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTestApiKey}
                      disabled={isTestingApiKey || !localConfig.apiKey}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isTestingApiKey ? (
                        <>
                          <span className="material-symbols-outlined text-[16px] animate-spin">
                            progress_activity
                          </span>
                          <span>测试中...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[16px]">
                            check_circle
                          </span>
                          <span>测试 API Key</span>
                        </>
                      )}
                    </button>
                    {apiKeyTestResult && localConfig.apiProvider === "gemini" && (
                      <span
                        className={`text-xs font-medium ${
                          apiKeyTestResult.success
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {apiKeyTestResult.message}
                      </span>
                    )}
                  </div>
                </div>
                <div className="md:col-span-1">
                  <label className="block text-slate-600 text-sm font-bold mb-2">
                    Model
                  </label>
                  <div className="flex w-full relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">
                      smart_toy
                    </span>
                    <select
                      name="model"
                      className="w-full pl-10 pr-3 py-3 bg-white border border-gray-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono text-sm shadow-sm appearance-none cursor-pointer"
                      value={localConfig.model}
                      onChange={handleInputChange}
                    >
                      <option value="gemini-3-pro">gemini-3-pro</option>
                      <option value="gemini-3-flash">gemini-3-flash</option>
                    </select>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none material-symbols-outlined text-[20px]">
                      arrow_drop_down
                    </span>
                  </div>
                </div>
                <div className="md:col-span-1">
                  <label className="block text-slate-600 text-sm font-bold mb-2">
                    Base URL
                  </label>
                  <div className="flex w-full relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">
                      link
                    </span>
                    <input
                      name="baseUrl"
                      className="w-full pl-10 pr-3 py-3 bg-white border border-gray-300 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono text-sm shadow-sm"
                      type="text"
                      value={localConfig.baseUrl}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Poe Configuration */}
            {localConfig.apiProvider === "poe" && (
              <>
                <div className="md:col-span-1">
                  <label className="block text-slate-600 text-sm font-bold mb-2">
                    Poe API Key
                  </label>
                  <div className="flex w-full relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">
                      key
                    </span>
                    <input
                      name="poeApiKey"
                      className="w-full pl-10 pr-10 py-3 bg-white border border-gray-300 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono text-sm shadow-sm"
                      type={showPoeApiKey ? "text" : "password"}
                      value={localConfig.poeApiKey}
                      onChange={handleInputChange}
                      placeholder="Paste your Poe API Key"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPoeApiKey(!showPoeApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showPoeApiKey ? "visibility" : "visibility_off"}
                      </span>
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTestApiKey}
                      disabled={isTestingApiKey || !localConfig.poeApiKey}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isTestingApiKey ? (
                        <>
                          <span className="material-symbols-outlined text-[16px] animate-spin">
                            progress_activity
                          </span>
                          <span>测试中...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[16px]">
                            check_circle
                          </span>
                          <span>测试 API Key</span>
                        </>
                      )}
                    </button>
                    {apiKeyTestResult && localConfig.apiProvider === "poe" && (
                      <span
                        className={`text-xs font-medium ${
                          apiKeyTestResult.success
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {apiKeyTestResult.message}
                      </span>
                    )}
                  </div>
                </div>
                <div className="md:col-span-1">
                  <label className="block text-slate-600 text-sm font-bold mb-2">
                    Model
                  </label>
                  <div className="flex w-full relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">
                      smart_toy
                    </span>
                    <select
                      name="poeModel"
                      className="w-full pl-10 pr-3 py-3 bg-white border border-gray-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono text-sm shadow-sm appearance-none cursor-pointer"
                      value={localConfig.poeModel}
                      onChange={handleInputChange}
                    >
                      <option value="gemini-3-pro">gemini-3-pro</option>
                      <option value="gemini-3-flash">gemini-3-flash</option>
                    </select>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none material-symbols-outlined text-[20px]">
                      arrow_drop_down
                    </span>
                  </div>
                </div>
                <div className="md:col-span-1">
                  <label className="block text-slate-600 text-sm font-bold mb-2">
                    Thinking Level
                  </label>
                  <div className="flex w-full relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">
                      psychology
                    </span>
                    <select
                      name="poeThinkingLevel"
                      className="w-full pl-10 pr-3 py-3 bg-white border border-gray-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono text-sm shadow-sm appearance-none cursor-pointer"
                      value={localConfig.poeThinkingLevel}
                      onChange={handleInputChange}
                    >
                      <option value="low">low (默认)</option>
                      <option value="minimal">minimal</option>
                      <option value="high">high</option>
                    </select>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none material-symbols-outlined text-[20px]">
                      arrow_drop_down
                    </span>
                  </div>
                </div>
              </>
            )}
            <div className="md:col-span-2 pt-2">
              <div className="flex justify-between items-center mb-3">
                <label className="text-slate-600 text-sm font-bold flex items-center gap-2">
                  Concurrent Requests
                  <span className="bg-slate-100 border border-slate-200 text-xs px-1.5 py-0.5 rounded text-slate-600 font-mono">
                    Rate Limit Safe
                  </span>
                </label>
                <span className="text-primary font-bold text-lg font-mono">
                  {config.concurrency}
                </span>
              </div>
              <input
                name="concurrency"
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                max="10"
                min="1"
                type="range"
                value={localConfig.concurrency}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, concurrency: parseInt(e.target.value) })
                }
              />
              <div className="flex justify-between text-xs text-slate-400 mt-2 font-mono">
                <span>1 (Conservative)</span>
                <span>10 (Aggressive)</span>
              </div>
            </div>
          </div>
        </section>

        {/* Task Definition */}
        <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                assignment
              </span>
              Task Definition & Criteria
            </h3>
          </div>
          <div className="p-6 flex flex-col gap-6">
            <div>
              <label className="block text-slate-600 text-sm font-bold mb-2">
                Essay Task Prompt
              </label>
              <textarea
                name="taskPrompt"
                className="w-full h-32 p-4 bg-white border border-gray-300 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-y text-sm leading-relaxed shadow-sm"
                placeholder="Enter the essay topic here..."
                value={localConfig.taskPrompt}
                onChange={handleInputChange}
              ></textarea>
              <p className="text-xs text-slate-400 mt-2 text-right">
                {localConfig.taskPrompt.length} / 500 characters
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-slate-600 text-sm font-bold">
                  Content Scoring Criteria ({localConfig.contentMax ?? 6} points)
                </label>
                <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => {
                      // 确保 contentPoints 有6个元素
                      const points = [...localConfig.contentPoints];
                      while (points.length < 6) points.push("");
                      setLocalConfig((prev) => ({
                        ...prev,
                        contentPointsMode: "points",
                        contentPoints: points.slice(0, 6),
                      }));
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                      (localConfig.contentPointsMode || "points") === "points"
                        ? "bg-white text-primary shadow-sm"
                        : "text-slate-600 hover:text-slate-800"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px] align-middle mr-1">
                      list
                    </span>
                    6 Points
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLocalConfig((prev) => ({
                        ...prev,
                        contentPointsMode: "text",
                        contentPointsText: prev.contentPointsText || "",
                      }));
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                      localConfig.contentPointsMode === "text"
                        ? "bg-white text-primary shadow-sm"
                        : "text-slate-600 hover:text-slate-800"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px] align-middle mr-1">
                      article
                    </span>
                    Text
                  </button>
                </div>
              </div>
              
              {(localConfig.contentPointsMode || "points") === "points" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[0, 1, 2, 3, 4, 5].map((idx) => (
                    <div key={idx} className="relative group">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-mono text-xs font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                        0{idx + 1}
                      </span>
                      <input
                        className="w-full pl-12 pr-3 py-3 bg-white border border-gray-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all shadow-sm"
                        placeholder={`Requirement ${idx + 1} (1 point each)`}
                        type="text"
                        value={localConfig.contentPoints[idx] || ""}
                        onChange={(e) => handlePointChange(idx, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <textarea
                  name="contentPointsText"
                  rows={8}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all shadow-sm resize-y"
                  placeholder="Enter the content scoring criteria as a single text block..."
                  value={localConfig.contentPointsText || ""}
                  onChange={handleInputChange}
                ></textarea>
              )}
            </div>
            
            {/* 评分满分设置 */}
            <div className="border-t border-gray-200 pt-6">
              <label className="block text-slate-600 text-sm font-bold mb-4">
                评分满分设置
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-slate-600 text-sm font-medium mb-2">
                    内容分满分
                  </label>
                  <div className="flex w-full relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">
                      score
                    </span>
                    <input
                      name="contentMax"
                      type="number"
                      min="1"
                      max="20"
                      className="w-full pl-10 pr-3 py-3 bg-white border border-gray-300 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono text-sm shadow-sm"
                      value={localConfig.contentMax ?? 6}
                      onChange={(e) =>
                        setLocalConfig({
                          ...localConfig,
                          contentMax: parseInt(e.target.value) || 6,
                        })
                      }
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    内容评分项的满分值（默认：6分）
                  </p>
                </div>
                <div>
                  <label className="block text-slate-600 text-sm font-medium mb-2">
                    语言分满分
                  </label>
                  <div className="flex w-full relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">
                      score
                    </span>
                    <input
                      name="languageMax"
                      type="number"
                      min="1"
                      max="20"
                      className="w-full pl-10 pr-3 py-3 bg-white border border-gray-300 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono text-sm shadow-sm"
                      value={localConfig.languageMax ?? 9}
                      onChange={(e) =>
                        setLocalConfig({
                          ...localConfig,
                          languageMax: parseInt(e.target.value) || 9,
                        })
                      }
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    语言评分项的满分值（默认：9分）
                  </p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700 font-medium">
                  总分：{localConfig.contentMax ?? 6} + {localConfig.languageMax ?? 9} = {(localConfig.contentMax ?? 6) + (localConfig.languageMax ?? 9)} 分
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Prompt Preview */}
        <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden opacity-90 hover:opacity-100 transition-opacity">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                terminal
              </span>
              System Prompt Preview
            </h3>
            <span className="text-xs text-slate-500 font-mono font-medium">
              READ ONLY
            </span>
          </div>
          <div className="bg-[#1e293b] p-6 overflow-x-auto shadow-inner">
            <pre className="font-mono text-xs md:text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">
              <span className="text-purple-400">ROLE:</span> You are an English
              teacher grading Guangdong High School Entrance Exam essays.
              {"\n"}
              <span className="text-blue-400">TASK:</span> {localConfig.taskPrompt.substring(0, 50)}...
              {"\n"}
              <span className="text-yellow-400">
                CRITERIA ({(localConfig.contentMax ?? 6) + (localConfig.languageMax ?? 9)} Points Total):
              </span>
              {"\n"}1. Content (0-{localConfig.contentMax ?? 6} pts):
              {(localConfig.contentPointsMode || "points") === "points" ? (
                localConfig.contentPoints
                  .filter((pt) => pt.trim())
                  .map((pt, i) => `\n   - [POINT_${i+1}]: <span class="text-white italic">${pt}</span>`)
                  .join("")
              ) : (
                `\n   ${(localConfig.contentPointsText || "").replace(/\n/g, "\n   ")}`
              )}
              {"\n"}2. Language (0-{localConfig.languageMax ?? 9} pts): Grammar, vocabulary, coherence.
              {"\n"}
              <span className="text-green-400">OUTPUT FORMAT:</span> JSON{" "}
              {"{ 'recognized_text': string, 'content_score': number, 'language_score': number, 'total_score': number, 'content_comment': string, 'language_comment': string, 'general_comment': string }"}
            </pre>
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 lg:left-64 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200 p-4 z-30 shadow-[0_-4px_24px_-12px_rgba(0,0,0,0.1)]">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={handleReset}
            className="px-6 py-3 rounded-lg text-sm font-bold text-slate-500 hover:text-slate-900 border border-transparent hover:border-gray-200 transition-all hover:bg-gray-50"
          >
            Reset to Defaults
          </button>
          <div className="flex items-center gap-4">
            {testResult && (
              <span
                className={`text-xs font-medium px-3 py-1.5 rounded ${
                  testResult.success
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {testResult.message}
              </span>
            )}
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-8 py-3 rounded-lg text-sm font-bold shadow-lg shadow-blue-500/30 transition-all hover:translate-y-[-1px] active:translate-y-[1px] border border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTesting ? (
                <>
                  <span className="material-symbols-outlined text-[20px] animate-spin">
                    progress_activity
                  </span>
                  Testing...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">
                    check_circle
                  </span>
                  Save & Test Connection
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
