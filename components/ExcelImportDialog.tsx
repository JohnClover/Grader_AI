import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { Student, StudentStatus, AppConfig } from "../types";

interface ExcelImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (students: Student[]) => void;
  file: File | null;
  config?: AppConfig;
}

interface FieldMapping {
  id: string; // Excel列名 -> 学号
  name: string; // Excel列名 -> 姓名
  class: string; // Excel列名 -> 班级
  classManualInput: string; // 手动输入的班级名称
  useManualClass: boolean; // 是否使用手动输入的班级
}

export const ExcelImportDialog: React.FC<ExcelImportDialogProps> = ({
  isOpen,
  onClose,
  onImport,
  file,
  config,
}) => {
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<FieldMapping>({
    id: "",
    name: "",
    class: "",
    classManualInput: "",
    useManualClass: false,
  });
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");

  // 读取Excel文件，获取所有sheet名称
  useEffect(() => {
    if (!isOpen || !file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheets = workbook.SheetNames;
        setSheetNames(sheets);
        if (sheets.length > 0) {
          setSelectedSheet(sheets[0]);
        }
      } catch (error) {
        alert(`读取Excel文件失败: ${error}`);
        onClose();
      }
    };
    reader.onerror = () => {
      alert("文件读取失败");
      onClose();
    };
    reader.readAsArrayBuffer(file);
  }, [isOpen, file, onClose]);

  // 当选择sheet时，读取列名和预览数据
  useEffect(() => {
    if (!isOpen || !file || !selectedSheet) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[selectedSheet];
        
        // 使用 range 选项确保读取所有数据
        const jsonData = XLSX.utils.sheet_to_json(sheet, { 
          header: 1,
          defval: "", // 空单元格默认值
          raw: false // 返回格式化后的字符串
        }) as any[][];

        if (jsonData.length === 0) {
          setColumns([]);
          setPreviewData([]);
          setMapping({ id: "", name: "", class: "", classManualInput: "", useManualClass: false });
          setDebugInfo("Sheet为空");
          return;
        }

        // 找到第一个非空行作为列名行（最多检查前10行）
        let headerRowIndex = -1;
        let headers: string[] = [];
        
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;
          
          // 尝试将这一行作为列名
          const potentialHeaders = row
            .map((h: any) => {
              const str = String(h || "").trim();
              return str;
            })
            .filter((h: string) => h.length > 0);
          
          // 如果这一行有至少2个非空单元格，认为是列名行
          if (potentialHeaders.length >= 2) {
            headerRowIndex = i;
            headers = potentialHeaders;
            break;
          }
        }

        // 如果没找到合适的列名行，使用第一行
        if (headerRowIndex === -1 && jsonData.length > 0) {
          headerRowIndex = 0;
          headers = jsonData[0]
            .map((h: any) => String(h || "").trim())
            .filter((h: string) => h.length > 0);
        }

        // 如果还是没有列名，使用默认列名
        if (headers.length === 0) {
          headers = Array.from({ length: Math.max(...jsonData.map(r => r?.length || 0)) }, (_, i) => `列${i + 1}`);
        }

        setColumns(headers);

        // 预览数据（从列名行的下一行开始，最多5行）
        const dataStartIndex = headerRowIndex + 1;
        const preview = jsonData
          .slice(dataStartIndex, dataStartIndex + 5)
          .filter((row) => row && row.length > 0) // 过滤空行
          .map((row) => {
            const obj: any = {};
            headers.forEach((header, index) => {
              const value = row[index];
              obj[header] = value !== undefined && value !== null ? String(value).trim() : "";
            });
            return obj;
          })
          .filter((obj) => {
            // 至少有一个非空字段才显示
            return Object.values(obj).some((v) => String(v).trim().length > 0);
          });
        
        setPreviewData(preview);

        // 自动尝试匹配列名
        const autoMapping: FieldMapping = {
          id: "",
          name: "",
          class: "",
          classManualInput: mapping.classManualInput || "",
          useManualClass: mapping.useManualClass || false,
        };

        headers.forEach((col) => {
          const colLower = col.toLowerCase();
          if (!autoMapping.id && (colLower.includes("学号") || colLower.includes("id") || colLower.includes("student_id") || colLower === "id")) {
            autoMapping.id = col;
          }
          if (!autoMapping.name && (colLower.includes("姓名") || colLower.includes("name") || colLower.includes("student_name") || colLower === "name")) {
            autoMapping.name = col;
          }
          if (!autoMapping.class && (colLower.includes("班级") || colLower.includes("class") || colLower.includes("grade") || colLower === "class")) {
            autoMapping.class = col;
          }
        });

        setMapping(autoMapping);
        
        // 设置调试信息
        setDebugInfo(
          `找到 ${headers.length} 个列，数据从第 ${headerRowIndex + 2} 行开始（第 ${headerRowIndex + 1} 行为列名）`
        );
      } catch (error) {
        console.error("读取Sheet失败:", error);
        alert(`读取Sheet失败: ${error}`);
        setColumns([]);
        setPreviewData([]);
        setMapping({ id: "", name: "", class: "", classManualInput: "", useManualClass: false });
        setDebugInfo(`读取失败: ${error}`);
      }
    };
    reader.onerror = () => {
      alert("文件读取失败");
      setColumns([]);
      setPreviewData([]);
      setMapping({ id: "", name: "", class: "", classManualInput: "", useManualClass: false });
    };
    reader.readAsArrayBuffer(file);
  }, [isOpen, file, selectedSheet]);

  const handleImport = () => {
    if (!mapping.id || !mapping.name) {
      alert("请至少映射学号和姓名字段");
      return;
    }

    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[selectedSheet];
        
        // 使用与预览相同的读取方式
        const jsonData = XLSX.utils.sheet_to_json(sheet, { 
          header: 1,
          defval: "",
          raw: false
        }) as any[][];

        if (jsonData.length === 0) {
          alert("Excel文件为空");
          setLoading(false);
          return;
        }

        // 找到列名行（与预览逻辑一致）
        let headerRowIndex = -1;
        let headers: string[] = [];
        
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;
          
          const potentialHeaders = row
            .map((h: any) => String(h || "").trim())
            .filter((h: string) => h.length > 0);
          
          if (potentialHeaders.length >= 2) {
            headerRowIndex = i;
            headers = potentialHeaders;
            break;
          }
        }

        if (headerRowIndex === -1 && jsonData.length > 0) {
          headerRowIndex = 0;
          headers = jsonData[0]
            .map((h: any) => String(h || "").trim())
            .filter((h: string) => h.length > 0);
        }

        // 检查映射的列是否存在
        if (!headers.includes(mapping.id)) {
          alert(`错误：找不到列"${mapping.id}"，请检查字段映射`);
          setLoading(false);
          return;
        }
        if (!headers.includes(mapping.name)) {
          alert(`错误：找不到列"${mapping.name}"，请检查字段映射`);
          setLoading(false);
          return;
        }
        // 只有在使用Excel列选择班级时才检查列是否存在
        if (!mapping.useManualClass && mapping.class && !headers.includes(mapping.class)) {
          alert(`错误：找不到列"${mapping.class}"，请检查字段映射`);
          setLoading(false);
          return;
        }

        const contentMax = config?.contentMax ?? 6;
        const languageMax = config?.languageMax ?? 9;

        // 从数据行开始读取（列名行的下一行）
        const dataStartIndex = headerRowIndex + 1;
        const students: Student[] = [];

        for (let i = dataStartIndex; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;

          // 根据列名获取对应的值
          const idIndex = headers.indexOf(mapping.id);
          const nameIndex = headers.indexOf(mapping.name);
          const classIndex = !mapping.useManualClass && mapping.class ? headers.indexOf(mapping.class) : -1;

          const id = idIndex >= 0 && row[idIndex] !== undefined 
            ? String(row[idIndex]).trim() 
            : "";
          const name = nameIndex >= 0 && row[nameIndex] !== undefined
            ? String(row[nameIndex]).trim()
            : "";
          
          // 如果使用手动输入的班级，使用手动输入的值；否则从Excel列读取
          let classValue: string | undefined;
          if (mapping.useManualClass && mapping.classManualInput.trim()) {
            classValue = mapping.classManualInput.trim();
          } else if (classIndex >= 0 && row[classIndex] !== undefined) {
            const classFromExcel = String(row[classIndex]).trim();
            classValue = classFromExcel || undefined;
          }

          // 跳过空行（至少需要学号）
          if (!id) continue;

          students.push({
            id,
            name: name || `Student ${id}`,
            class: classValue,
            status: StudentStatus.Pending,
            fileName: null,
            score: null,
            maxScore: contentMax + languageMax,
          });
        }

        if (students.length === 0) {
          alert("没有找到有效的学生数据，请检查Excel文件格式和字段映射");
          setLoading(false);
          return;
        }

        onImport(students);
        onClose();
      } catch (error) {
        console.error("导入失败:", error);
        alert(`导入失败: ${error}`);
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      alert("文件读取失败");
      setLoading(false);
    };
    reader.readAsArrayBuffer(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-[90vw] max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Excel导入 - 字段映射</h2>
            <p className="text-sm text-slate-600 mt-1">
              请选择Sheet并映射字段到Excel列
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-slate-600">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Sheet选择 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              选择Sheet
            </label>
            <select
              value={selectedSheet}
              onChange={(e) => setSelectedSheet(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            >
              {sheetNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* 字段映射 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              字段映射 <span className="text-red-500">*</span>表示必填
            </label>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <label className="w-20 text-sm text-slate-600">
                  学号 <span className="text-red-500">*</span>
                </label>
                <select
                  value={mapping.id}
                  onChange={(e) => setMapping({ ...mapping, id: e.target.value })}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                >
                  <option value="">-- 请选择列 --</option>
                  {columns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-4">
                <label className="w-20 text-sm text-slate-600">
                  姓名 <span className="text-red-500">*</span>
                </label>
                <select
                  value={mapping.name}
                  onChange={(e) => setMapping({ ...mapping, name: e.target.value })}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                >
                  <option value="">-- 请选择列 --</option>
                  {columns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <label className="w-20 text-sm text-slate-600">班级</label>
                  <div className="flex-1 flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="classMode"
                        checked={!mapping.useManualClass}
                        onChange={() => setMapping({ ...mapping, useManualClass: false })}
                        className="w-4 h-4 text-primary border-slate-300 focus:ring-primary"
                      />
                      <span className="text-sm text-slate-600">从Excel列选择</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="classMode"
                        checked={mapping.useManualClass}
                        onChange={() => setMapping({ ...mapping, useManualClass: true })}
                        className="w-4 h-4 text-primary border-slate-300 focus:ring-primary"
                      />
                      <span className="text-sm text-slate-600">手动输入</span>
                    </label>
                  </div>
                </div>
                {!mapping.useManualClass ? (
                  <div className="flex items-center gap-4">
                    <div className="w-20"></div>
                    <select
                      value={mapping.class}
                      onChange={(e) => setMapping({ ...mapping, class: e.target.value })}
                      className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    >
                      <option value="">-- 请选择列（可选）--</option>
                      {columns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="w-20"></div>
                    <input
                      type="text"
                      value={mapping.classManualInput}
                      onChange={(e) => setMapping({ ...mapping, classManualInput: e.target.value })}
                      placeholder="请输入班级名称（如：702班）"
                      className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 调试信息 */}
          {debugInfo && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700">{debugInfo}</p>
            </div>
          )}

          {/* 列名显示 */}
          {columns.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                检测到的列名 ({columns.length} 个)
              </label>
              <div className="flex flex-wrap gap-2">
                {columns.map((col) => (
                  <span
                    key={col}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      mapping.id === col || mapping.name === col || (!mapping.useManualClass && mapping.class === col)
                        ? "bg-blue-100 text-blue-700 border border-blue-300"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {col}
                    {mapping.id === col && " (学号)"}
                    {mapping.name === col && " (姓名)"}
                    {!mapping.useManualClass && mapping.class === col && " (班级)"}
                  </span>
                ))}
              </div>
              {mapping.useManualClass && mapping.classManualInput && (
                <div className="mt-2">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-300">
                    手动输入班级: {mapping.classManualInput}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 数据预览 */}
          {previewData.length > 0 ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                数据预览（前5行）
              </label>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        {columns.map((col) => (
                          <th
                            key={col}
                            className={`px-3 py-2 text-left font-medium text-slate-700 border-b border-slate-200 ${
                              mapping.id === col || mapping.name === col || (!mapping.useManualClass && mapping.class === col)
                                ? "bg-blue-50"
                                : ""
                            }`}
                          >
                            {col}
                            {mapping.id === col && (
                              <span className="ml-1 text-xs text-blue-600">(学号)</span>
                            )}
                            {mapping.name === col && (
                              <span className="ml-1 text-xs text-blue-600">(姓名)</span>
                            )}
                            {!mapping.useManualClass && mapping.class === col && (
                              <span className="ml-1 text-xs text-blue-600">(班级)</span>
                            )}
                          </th>
                        ))}
                        {mapping.useManualClass && (
                          <th className="px-3 py-2 text-left font-medium text-slate-700 border-b border-slate-200 bg-green-50">
                            班级（手动输入）
                            <span className="ml-1 text-xs text-green-600">({mapping.classManualInput || "未输入"})</span>
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {previewData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          {columns.map((col) => (
                            <td
                              key={col}
                              className="px-3 py-2 text-slate-600"
                            >
                              {String(row[col] || "")}
                            </td>
                          ))}
                          {mapping.useManualClass && (
                            <td className="px-3 py-2 text-slate-600 bg-green-50 font-medium">
                              {mapping.classManualInput || "--"}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : columns.length > 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-700">
                未找到数据行，请检查Excel文件格式。确保数据从列名行的下一行开始。
              </p>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all text-sm font-medium"
            disabled={loading}
          >
            取消
          </button>
          <button
            onClick={handleImport}
            disabled={loading || !mapping.id || !mapping.name}
            className="px-6 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white transition-all text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && (
              <span className="material-symbols-outlined text-[18px] animate-spin">
                progress_activity
              </span>
            )}
            确认导入
          </button>
        </div>
      </div>
    </div>
  );
};
