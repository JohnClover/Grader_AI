import React from "react";
import { Student, StudentStatus } from "../../types";
import { getStatusColor, getScoreColor } from "./utils";

interface StudentTableProps {
  students: Student[];
  selectedStudentId: string;
  selectedStudentIds: Set<string>;
  onSelectStudent: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
  onRetry: (id: string) => void;
}

export const StudentTable: React.FC<StudentTableProps> = ({
  students,
  selectedStudentId,
  selectedStudentIds,
  onSelectStudent,
  onToggleSelect,
  onSelectAll,
  onRetry,
}) => {
  const isAllSelected = students.length > 0 && students.every((s) => selectedStudentIds.has(s.id));
  const isIndeterminate = students.some((s) => selectedStudentIds.has(s.id)) && !isAllSelected;

  return (
    <div className="flex-1 bg-surface-card rounded-xl border border-border-subtle flex flex-col overflow-hidden shadow-sm">
      <div className="overflow-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase text-text-secondary tracking-wider border-b border-border-subtle">
            <tr>
              <th className="px-5 py-4 font-semibold w-12">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = isIndeterminate;
                  }}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary cursor-pointer"
                />
              </th>
              <th className="px-5 py-4 font-semibold w-32 text-center">ID</th>
              <th className="px-5 py-4 font-semibold w-28 text-center">Name</th>
              <th className="px-5 py-4 font-semibold w-24 text-center">Class</th>
              <th className="px-5 py-4 font-semibold w-32 text-center">Status</th>
              <th className="px-3 py-4 font-semibold w-16 text-center">File Name</th>
              <th className="px-5 py-4 font-semibold text-center w-24">Score</th>
              <th className="px-5 py-4 font-semibold text-center w-24">Content</th>
              <th className="px-5 py-4 font-semibold text-center w-24">Language</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-border-subtle">
            {students.map((student) => (
              <tr
                key={student.id}
                onClick={() => onSelectStudent(student.id)}
                className={`cursor-pointer transition-colors border-l-4 ${
                  selectedStudentId === student.id
                    ? "bg-blue-50/60 border-l-primary"
                    : "border-l-transparent hover:bg-slate-50 hover:border-l-slate-300"
                } ${
                  student.status === StudentStatus.Absent
                    ? "opacity-60 grayscale"
                    : ""
                }`}
              >
                <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.has(student.id)}
                    onChange={() => onToggleSelect(student.id)}
                    className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary cursor-pointer"
                  />
                </td>
                <td className="px-5 py-4 text-slate-900 font-bold text-center">
                  {student.id}
                </td>
                <td className="px-5 py-4 text-slate-900 font-medium text-center w-32 whitespace-nowrap">
                  {student.name}
                </td>
                <td className="px-5 py-4 text-slate-600 text-center">
                  {student.class || <span className="text-slate-400 italic">--</span>}
                </td>
                <td className="px-5 py-4 text-center">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                      student.status
                    )}`}
                  >
                    {student.status === StudentStatus.Processing && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                    )}
                    {student.status}
                  </span>
                </td>
                <td 
                  className="px-3 py-4 text-slate-500 w-16 text-center max-w-16"
                >
                  <div
                    className="truncate overflow-hidden text-ellipsis whitespace-nowrap"
                    {...(student.fileName ? { title: student.fileName } : {})}
                  >
                    {student.fileName || (
                      <span className="text-slate-400 italic">无图片</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {student.status === StudentStatus.Failed && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRetry(student.id);
                        }}
                        className="text-xs text-red-600 hover:text-red-800 underline"
                      >
                        重试
                      </button>
                    )}
                    {student.score !== null ? (
                      <span 
                        className="font-bold font-mono"
                        style={{ color: getScoreColor(student.score, student.maxScore) }}
                      >
                        {student.score}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-mono">--</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4 text-center">
                  {student.gradingResult ? (
                    <span 
                      className="font-mono"
                      style={{ color: getScoreColor(student.gradingResult.contentScore, student.gradingResult.contentMax) }}
                    >
                      {student.gradingResult.contentScore}
                    </span>
                  ) : (
                    <span className="text-slate-400 font-mono">--</span>
                  )}
                </td>
                <td className="px-5 py-4 text-center">
                  {student.gradingResult ? (
                    <span 
                      className="font-mono"
                      style={{ color: getScoreColor(student.gradingResult.languageScore, student.gradingResult.languageMax) }}
                    >
                      {student.gradingResult.languageScore}
                    </span>
                  ) : (
                    <span className="text-slate-400 font-mono">--</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
