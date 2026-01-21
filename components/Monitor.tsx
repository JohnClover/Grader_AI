import React, { useState, useMemo } from "react";
import { useAppContext } from "../contexts/AppContext";
import { ApiLogEntry } from "../types";

export const Monitor: React.FC = () => {
  const { apiLogs, clearApiLogs } = useAppContext();
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"logs" | "usage">("logs");
  const [filter, setFilter] = useState<{
    direction?: "request" | "response";
    provider?: "gemini" | "poe";
    search?: string;
  }>({});

  const filteredLogs = useMemo(() => {
    return apiLogs.filter((log) => {
      if (filter.direction && log.direction !== filter.direction) return false;
      if (filter.provider && log.provider !== filter.provider) return false;
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        const matchesSearch =
          log.studentId?.toLowerCase().includes(searchLower) ||
          log.studentName?.toLowerCase().includes(searchLower) ||
          log.url?.toLowerCase().includes(searchLower) ||
          JSON.stringify(log.body || log.response || {}).toLowerCase().includes(searchLower) ||
          log.error?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      return true;
    });
  }, [apiLogs, filter]);

  const usageEntries = useMemo(() => {
    return apiLogs
      .filter((log) => log.direction === "response" && log.usage)
      .map((log) => ({
        id: log.id,
        timestamp: log.timestamp,
        studentId: log.studentId,
        studentName: log.studentName,
        provider: log.usage!.provider || log.provider,
        model: log.usage!.model,
        promptTokens: log.usage!.promptTokens,
        completionTokens: log.usage!.completionTokens,
        totalTokens: log.usage!.totalTokens,
      }));
  }, [apiLogs]);

  const usageEntriesWithCost = useMemo(() => {
    return usageEntries.map((entry) => {
      const pricing = getPricing(entry.provider, entry.model);
      const promptCost = pricing ? (entry.promptTokens * pricing.input) / 1_000_000 : undefined;
      const completionCost = pricing ? (entry.completionTokens * pricing.output) / 1_000_000 : undefined;
      const totalCost = pricing && promptCost !== undefined && completionCost !== undefined
        ? promptCost + completionCost
        : undefined;

      return {
        ...entry,
        promptCost,
        completionCost,
        totalCost,
      };
    });
  }, [usageEntries]);

  const usageTotals = useMemo(() => {
    return usageEntriesWithCost.reduce(
      (acc, entry) => {
        acc.promptTokens += entry.promptTokens;
        acc.completionTokens += entry.completionTokens;
        acc.totalTokens += entry.totalTokens;
        if (typeof entry.promptCost === "number") {
          acc.promptCost = (acc.promptCost ?? 0) + entry.promptCost;
        }
        if (typeof entry.completionCost === "number") {
          acc.completionCost = (acc.completionCost ?? 0) + entry.completionCost;
        }
        if (typeof entry.totalCost === "number") {
          acc.totalCost = (acc.totalCost ?? 0) + entry.totalCost;
        }
        return acc;
      },
      {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        promptCost: undefined as number | undefined,
        completionCost: undefined as number | undefined,
        totalCost: undefined as number | undefined,
      }
    );
  }, [usageEntriesWithCost]);

  const usageByStudent = useMemo(() => {
    const map = new Map<string, {
      studentId: string;
      studentName?: string;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      promptCost?: number;
      completionCost?: number;
      totalCost?: number;
      requests: number;
    }>();

    usageEntriesWithCost.forEach((entry) => {
      const studentId = entry.studentId || "unknown";
      const existing = map.get(studentId) || {
        studentId,
        studentName: entry.studentName,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        promptCost: undefined as number | undefined,
        completionCost: undefined as number | undefined,
        totalCost: undefined as number | undefined,
        requests: 0,
      };

      existing.promptTokens += entry.promptTokens;
      existing.completionTokens += entry.completionTokens;
      existing.totalTokens += entry.totalTokens;
      if (typeof entry.promptCost === "number") {
        existing.promptCost = (existing.promptCost ?? 0) + entry.promptCost;
      }
      if (typeof entry.completionCost === "number") {
        existing.completionCost = (existing.completionCost ?? 0) + entry.completionCost;
      }
      if (typeof entry.totalCost === "number") {
        existing.totalCost = (existing.totalCost ?? 0) + entry.totalCost;
      }
      existing.requests += 1;
      if (!existing.studentName && entry.studentName) {
        existing.studentName = entry.studentName;
      }

      map.set(studentId, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.totalTokens - a.totalTokens);
  }, [usageEntriesWithCost]);

  const usageByModel = useMemo(() => {
    const map = new Map<string, {
      provider: string;
      model: string;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      promptCost?: number;
      completionCost?: number;
      totalCost?: number;
      requests: number;
    }>();

    usageEntriesWithCost.forEach((entry) => {
      const key = `${entry.provider}:${entry.model}`;
      const existing = map.get(key) || {
        provider: entry.provider,
        model: entry.model,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        promptCost: undefined as number | undefined,
        completionCost: undefined as number | undefined,
        totalCost: undefined as number | undefined,
        requests: 0,
      };

      existing.promptTokens += entry.promptTokens;
      existing.completionTokens += entry.completionTokens;
      existing.totalTokens += entry.totalTokens;
      if (typeof entry.promptCost === "number") {
        existing.promptCost = (existing.promptCost ?? 0) + entry.promptCost;
      }
      if (typeof entry.completionCost === "number") {
        existing.completionCost = (existing.completionCost ?? 0) + entry.completionCost;
      }
      if (typeof entry.totalCost === "number") {
        existing.totalCost = (existing.totalCost ?? 0) + entry.totalCost;
      }
      existing.requests += 1;
      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.totalTokens - a.totalTokens);
  }, [usageEntriesWithCost]);

  const toggleExpand = (logId: string) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return "-";
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  const formatTokens = (value?: number) => {
    if (typeof value !== "number") return "-";
    return value.toLocaleString();
  };

  const formatCost = (value?: number) => {
    if (typeof value !== "number") return "-";
    if (value === 0) return "$0.00";
    const decimals = value < 0.01 ? 6 : 4;
    return `$${value.toFixed(decimals)}`;
  };

  const renderTokensWithCost = (tokens: number, cost?: number) => {
    return (
      <span className="inline-flex items-baseline gap-1">
        <span className="font-mono">{formatTokens(tokens)}</span>
        {typeof cost === "number" && (
          <span className="text-xs text-text-secondary">({formatCost(cost)})</span>
        )}
      </span>
    );
  };

  function getPricing(provider: string, model: string) {
    const key = model.toLowerCase();
    const normalized = key.replace(/\s+/g, "");
    const isPoe = provider.toLowerCase() === "poe";

    const pricingTable: Record<string, { official: { input: number; output: number }; poe?: { input: number; output: number } }> = {
      "gemini-3-pro": {
        official: { input: 2.0, output: 12.0 },
        poe: { input: 1.6, output: 9.6 },
      },
      "gemini-3-flash": {
        official: { input: 0.5, output: 3.0 },
        poe: { input: 0.4, output: 2.4 },
      },
      "gpt-5.2": {
        official: { input: 1.58, output: 12.6 },
      },
    };

    const matchKey = Object.keys(pricingTable).find((modelKey) => normalized.includes(modelKey));
    if (!matchKey) return undefined;

    const pricing = pricingTable[matchKey];
    if (isPoe && pricing.poe) return pricing.poe;
    return pricing.official;
  }

  const getProviderBadgeStyle = (provider: string) => {
    const key = provider.toLowerCase();
    if (key === "gemini") {
      return {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
        dot: "bg-emerald-500",
        dotBorder: "border-emerald-300",
      };
    }
    if (key === "poe") {
      return {
        bg: "bg-orange-50",
        text: "text-orange-700",
        border: "border-orange-200",
        dot: "bg-orange-500",
        dotBorder: "border-orange-300",
      };
    }
    return {
      bg: "bg-slate-50",
      text: "text-slate-700",
      border: "border-slate-200",
      dot: "bg-slate-500",
      dotBorder: "border-slate-300",
    };
  };

  const getModelBadgeStyle = (model: string) => {
    const key = model.toLowerCase();
    const palette = [
      {
        test: /flash/,
        classes: {
          bg: "bg-amber-50",
          text: "text-amber-700",
          border: "border-amber-200",
          dot: "bg-amber-500",
          dotBorder: "border-amber-300",
        },
      },
      {
        test: /pro/,
        classes: {
          bg: "bg-sky-50",
          text: "text-sky-700",
          border: "border-sky-200",
          dot: "bg-sky-500",
          dotBorder: "border-sky-300",
        },
      },
      {
        test: /ultra|max/,
        classes: {
          bg: "bg-indigo-50",
          text: "text-indigo-700",
          border: "border-indigo-200",
          dot: "bg-indigo-500",
          dotBorder: "border-indigo-300",
        },
      },
      {
        test: /lite|mini/,
        classes: {
          bg: "bg-teal-50",
          text: "text-teal-700",
          border: "border-teal-200",
          dot: "bg-teal-500",
          dotBorder: "border-teal-300",
        },
      },
      {
        test: /preview|beta|exp/,
        classes: {
          bg: "bg-rose-50",
          text: "text-rose-700",
          border: "border-rose-200",
          dot: "bg-rose-500",
          dotBorder: "border-rose-300",
        },
      },
    ];

    const matched = palette.find((item) => item.test.test(key));
    if (matched) return matched.classes;

    return {
      bg: "bg-slate-50",
      text: "text-slate-700",
      border: "border-slate-200",
      dot: "bg-slate-500",
      dotBorder: "border-slate-300",
    };
  };

  const renderProviderBadge = (provider: string, model: string) => {
    const style = getProviderBadgeStyle(provider);
    return (
      <span className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border}`}>
        <span className={`h-2.5 w-2.5 rounded-full border ${style.dot} ${style.dotBorder}`} />
        <span className="uppercase text-xs font-semibold">{provider}</span>
      </span>
    );
  };

  const renderModelBadge = (provider: string, model: string) => {
    const style = getModelBadgeStyle(model);
    return (
      <span className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border}`}>
        <span className={`h-2 w-2 rounded-full border ${style.dot} ${style.dotBorder}`} />
        <span className="text-xs font-semibold">{model}</span>
      </span>
    );
  };

  const getStatusColor = (status?: number) => {
    if (!status) return "text-slate-500";
    if (status >= 200 && status < 300) return "text-green-600";
    if (status >= 400 && status < 500) return "text-red-600";
    if (status >= 500) return "text-red-800";
    return "text-amber-600";
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-bg-main">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border-subtle bg-white flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <span className="material-symbols-outlined text-xl">monitoring</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">API Monitor</h1>
              <p className="text-xs text-text-secondary">查看发送和接收的原始对话日志</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">
              共 {apiLogs.length} 条日志
            </span>
            {apiLogs.length > 0 && (
              <button
                onClick={clearApiLogs}
                className="px-4 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium transition-colors border border-red-200"
              >
                清除日志
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
              activeTab === "logs"
                ? "bg-primary text-white border-primary"
                : "bg-white text-slate-700 border-border-subtle hover:bg-slate-50"
            }`}
          >
            Logs
          </button>
          <button
            onClick={() => setActiveTab("usage")}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
              activeTab === "usage"
                ? "bg-primary text-white border-primary"
                : "bg-white text-slate-700 border-border-subtle hover:bg-slate-50"
            }`}
          >
            Usage
          </button>
        </div>

        {/* Filters */}
        {activeTab === "logs" && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-secondary font-medium">方向:</label>
              <select
                value={filter.direction || ""}
                onChange={(e) =>
                  setFilter({ ...filter, direction: e.target.value as any || undefined })
                }
                className="px-3 py-1.5 rounded-lg border border-border-subtle text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">全部</option>
                <option value="request">请求</option>
                <option value="response">响应</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-secondary font-medium">提供商:</label>
              <select
                value={filter.provider || ""}
                onChange={(e) =>
                  setFilter({ ...filter, provider: e.target.value as any || undefined })
                }
                className="px-3 py-1.5 rounded-lg border border-border-subtle text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">全部</option>
                <option value="gemini">Gemini</option>
                <option value="poe">Poe</option>
              </select>
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <div className="flex items-center flex-1 bg-white rounded-lg h-9 border border-border-subtle focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
                <div className="pl-3 text-slate-400">
                  <span className="material-symbols-outlined text-sm">search</span>
                </div>
                <input
                  type="text"
                  placeholder="搜索学生ID、姓名、URL或内容..."
                  value={filter.search || ""}
                  onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                  className="bg-transparent border-none text-slate-800 placeholder-slate-400 w-full h-full focus:ring-0 text-sm px-2 outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Logs List */}
      <div className="flex-1 min-h-0 overflow-auto px-6 py-4 flex flex-col">
        {activeTab === "logs" && filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary">
            <span className="material-symbols-outlined text-6xl mb-4 opacity-50">
              description
            </span>
            <p className="text-lg font-medium">暂无日志</p>
            <p className="text-sm mt-2">
              {apiLogs.length === 0
                ? "开始评分后，API调用日志将显示在这里"
                : "没有匹配的日志"}
            </p>
          </div>
        ) : null}
        {activeTab === "logs" && filteredLogs.length > 0 ? (
          <div className="space-y-3">
            {filteredLogs.map((log) => {
              const isExpanded = expandedLogs.has(log.id);
              const isRequest = log.direction === "request";
              const hasError = !!log.error;

              return (
                <div
                  key={log.id}
                  className={`bg-white rounded-lg border ${
                    hasError
                      ? "border-red-200 bg-red-50/30"
                      : isRequest
                      ? "border-blue-200 bg-blue-50/30"
                      : "border-border-subtle"
                  } shadow-sm hover:shadow-md transition-shadow`}
                >
                  {/* Log Header */}
                  <div
                    className="px-4 py-3 cursor-pointer flex items-center justify-between"
                    onClick={() => toggleExpand(log.id)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isRequest
                            ? "bg-blue-100 text-blue-700"
                            : hasError
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        <span className="material-symbols-outlined text-lg">
                          {isRequest ? "arrow_upward" : hasError ? "error" : "arrow_downward"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded ${
                              log.provider === "gemini"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {log.provider.toUpperCase()}
                          </span>
                          <span className="text-xs text-text-secondary">
                            {formatTimestamp(log.timestamp)}
                          </span>
                          {log.duration && (
                            <span className="text-xs text-text-secondary">
                              {formatDuration(log.duration)}
                            </span>
                          )}
                          {log.status && (
                            <span className={`text-xs font-mono font-semibold ${getStatusColor(log.status)}`}>
                              {log.status}
                            </span>
                          )}
                          {log.studentId && (
                            <span className="text-xs text-text-secondary">
                              {log.studentName || log.studentId}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-slate-700 truncate">
                          {log.method} {log.url || "N/A"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {hasError && (
                        <span className="text-xs text-red-600 font-medium">错误</span>
                      )}
                      <span className="material-symbols-outlined text-text-secondary">
                        {isExpanded ? "expand_less" : "expand_more"}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-border-subtle pt-4 space-y-3">
                      {/* Student Info */}
                      {log.studentId && (
                        <div>
                          <h4 className="text-xs font-semibold text-text-secondary mb-1">
                            学生信息
                          </h4>
                          <div className="text-sm text-slate-700">
                            <span className="font-mono">{log.studentId}</span>
                            {log.studentName && (
                              <>
                                {" - "}
                                <span>{log.studentName}</span>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Request Details */}
                      {isRequest && log.body && (
                        <div>
                          <h4 className="text-xs font-semibold text-text-secondary mb-2">
                            请求体
                          </h4>
                          <pre className="bg-slate-50 rounded-lg p-3 text-xs overflow-auto max-h-96 border border-border-subtle">
                            {JSON.stringify(log.body, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Headers */}
                      {log.headers && Object.keys(log.headers).length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-text-secondary mb-2">
                            请求头
                          </h4>
                          <pre className="bg-slate-50 rounded-lg p-3 text-xs overflow-auto max-h-48 border border-border-subtle">
                            {JSON.stringify(log.headers, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Response Details */}
                      {!isRequest && log.response && (
                        <div>
                          <h4 className="text-xs font-semibold text-text-secondary mb-2">
                            响应体
                          </h4>
                          <pre className="bg-slate-50 rounded-lg p-3 text-xs overflow-auto max-h-96 border border-border-subtle">
                            {JSON.stringify(log.response, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Error */}
                      {hasError && (
                        <div>
                          <h4 className="text-xs font-semibold text-red-600 mb-2">错误信息</h4>
                          <div className="bg-red-50 rounded-lg p-3 text-sm text-red-800 border border-red-200">
                            {log.error}
                          </div>
                        </div>
                      )}

                      {/* Raw JSON */}
                      <div>
                        <h4 className="text-xs font-semibold text-text-secondary mb-2">
                          原始数据 (JSON)
                        </h4>
                        <pre className="bg-slate-50 rounded-lg p-3 text-xs overflow-auto max-h-96 border border-border-subtle">
                          {JSON.stringify(log, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}

        {activeTab === "usage" && usageEntriesWithCost.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary">
            <span className="material-symbols-outlined text-6xl mb-4 opacity-50">
              data_usage
            </span>
            <p className="text-lg font-medium">暂无 Usage 记录</p>
            <p className="text-sm mt-2">
              需要从响应中解析到 usage 字段后才会统计
            </p>
          </div>
        ) : null}

        {activeTab === "usage" && usageEntriesWithCost.length > 0 ? (
          <div className="flex-1 min-h-0 flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-shrink-0">
              <div className="bg-white rounded-lg border border-border-subtle p-4">
                <div className="text-xs text-text-secondary font-semibold mb-2">整次总计</div>
                <div className="text-2xl font-bold text-slate-800">
                  {renderTokensWithCost(usageTotals.totalTokens, usageTotals.totalCost)}
                </div>
                <div className="mt-2 text-xs text-text-secondary">
                  Prompt {renderTokensWithCost(usageTotals.promptTokens, usageTotals.promptCost)} / Completion {renderTokensWithCost(usageTotals.completionTokens, usageTotals.completionCost)}
                </div>
              </div>
              <div className="bg-white rounded-lg border border-border-subtle p-4">
                <div className="text-xs text-text-secondary font-semibold mb-2">请求次数</div>
                <div className="text-2xl font-bold text-slate-800">
                  {formatTokens(usageEntriesWithCost.length)}
                </div>
                <div className="mt-2 text-xs text-text-secondary">
                  仅统计响应中包含 usage 的请求
                </div>
              </div>
              <div className="bg-white rounded-lg border border-border-subtle p-4">
                <div className="text-xs text-text-secondary font-semibold mb-2">学生累计</div>
                <div className="text-2xl font-bold text-slate-800">
                  {formatTokens(usageByStudent.length)}
                </div>
                <div className="mt-2 text-xs text-text-secondary">
                  按学生ID汇总
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-border-subtle flex flex-col min-h-0 flex-1">
              <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between flex-shrink-0">
                <h3 className="text-sm font-semibold text-slate-800">每次请求 Usage</h3>
                <span className="text-xs text-text-secondary">共 {usageEntriesWithCost.length} 条</span>
              </div>
              <div className="overflow-auto flex-1 min-h-0">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-text-secondary">
                    <tr>
                      <th className="text-left px-4 py-2 font-semibold">时间</th>
                      <th className="text-left px-4 py-2 font-semibold">学生</th>
                      <th className="text-left px-4 py-2 font-semibold">Provider</th>
                      <th className="text-left px-4 py-2 font-semibold">Model</th>
                      <th className="text-right px-4 py-2 font-semibold">Prompt</th>
                      <th className="text-right px-4 py-2 font-semibold">Completion</th>
                      <th className="text-right px-4 py-2 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageEntriesWithCost.map((entry) => (
                      <tr key={entry.id} className="border-t border-border-subtle">
                        <td className="px-4 py-2 text-xs text-text-secondary">
                          {formatTimestamp(entry.timestamp)}
                        </td>
                        <td className="px-4 py-2 text-slate-700">
                          {entry.studentName || entry.studentId || "-"}
                        </td>
                        <td className="px-4 py-2 text-slate-700">
                          {renderProviderBadge(entry.provider, entry.model)}
                        </td>
                        <td className="px-4 py-2 text-slate-700">
                          {renderModelBadge(entry.provider, entry.model)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {renderTokensWithCost(entry.promptTokens, entry.promptCost)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {renderTokensWithCost(entry.completionTokens, entry.completionCost)}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold">
                          {renderTokensWithCost(entry.totalTokens, entry.totalCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0 flex-1">
              <div className="bg-white rounded-lg border border-border-subtle flex flex-col min-h-0">
                <div className="px-4 py-3 border-b border-border-subtle flex-shrink-0">
                  <h3 className="text-sm font-semibold text-slate-800">按学生累计</h3>
                </div>
                <div className="overflow-auto flex-1 min-h-0">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-text-secondary">
                      <tr>
                        <th className="text-left px-4 py-2 font-semibold">学生</th>
                        <th className="text-right px-4 py-2 font-semibold">请求数</th>
                        <th className="text-right px-4 py-2 font-semibold">Prompt</th>
                        <th className="text-right px-4 py-2 font-semibold">Completion</th>
                        <th className="text-right px-4 py-2 font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usageByStudent.map((entry) => (
                        <tr key={entry.studentId} className="border-t border-border-subtle">
                          <td className="px-4 py-2 text-slate-700">
                            {entry.studentName || entry.studentId}
                          </td>
                          <td className="px-4 py-2 text-right font-mono">
                            {formatTokens(entry.requests)}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {renderTokensWithCost(entry.promptTokens, entry.promptCost)}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {renderTokensWithCost(entry.completionTokens, entry.completionCost)}
                          </td>
                          <td className="px-4 py-2 text-right font-semibold">
                            {renderTokensWithCost(entry.totalTokens, entry.totalCost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-border-subtle flex flex-col min-h-0">
                <div className="px-4 py-3 border-b border-border-subtle flex-shrink-0">
                  <h3 className="text-sm font-semibold text-slate-800">按 Provider/Model 汇总</h3>
                </div>
                <div className="overflow-auto flex-1 min-h-0">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-text-secondary">
                      <tr>
                        <th className="text-left px-4 py-2 font-semibold">Provider</th>
                        <th className="text-left px-4 py-2 font-semibold">Model</th>
                        <th className="text-right px-4 py-2 font-semibold">请求数</th>
                        <th className="text-right px-4 py-2 font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usageByModel.map((entry) => (
                        <tr key={`${entry.provider}-${entry.model}`} className="border-t border-border-subtle">
                          <td className="px-4 py-2 text-slate-700">
                            {renderProviderBadge(entry.provider, entry.model)}
                          </td>
                          <td className="px-4 py-2 text-slate-700">
                            {renderModelBadge(entry.provider, entry.model)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono">
                            {formatTokens(entry.requests)}
                          </td>
                          <td className="px-4 py-2 text-right font-semibold">
                            {renderTokensWithCost(entry.totalTokens, entry.totalCost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
