import React from "react";
import { Student, StudentStatus } from "../../types";
import { formatDuration, getScoreColor } from "./utils";

interface StudentStatsHeaderProps {
  students: Student[];
  showStudentCountStats: boolean;
  showPerformanceStats: boolean;
  showScoreStats: boolean;
  onToggleStudentCountStats: () => void;
  onTogglePerformanceStats: () => void;
  onToggleScoreStats: () => void;
}

export const StudentStatsHeader: React.FC<StudentStatsHeaderProps> = ({
  students,
  showStudentCountStats,
  showPerformanceStats,
  showScoreStats,
  onToggleStudentCountStats,
  onTogglePerformanceStats,
  onToggleScoreStats,
}) => {
  const stats = {
    total: students.length,
    graded: students.filter((s) => s.status === StudentStatus.Graded).length,
    pending: students.filter((s) => s.status === StudentStatus.Pending).length,
    absent: students.filter((s) => s.status === StudentStatus.Absent).length,
    failed: students.filter((s) => s.status === StudentStatus.Failed).length,
  };

  const completionRate = Math.round((stats.graded / stats.total) * 100 || 0);

  // 计算处理时间统计
  const studentsWithDuration = students.filter((s) => s.processingDuration && s.processingDuration > 0);
  
  const allStartTimes = students
    .filter((s) => s.processingStartTime)
    .map((s) => s.processingStartTime!)
    .sort((a, b) => a - b);
  const allEndTimes = students
    .filter((s) => s.processingEndTime)
    .map((s) => s.processingEndTime!)
    .sort((a, b) => b - a);
  
  const firstStartTime = allStartTimes.length > 0 ? allStartTimes[0] : null;
  const lastEndTime = allEndTimes.length > 0 ? allEndTimes[0] : null;
  
  const totalProcessingTime = firstStartTime && lastEndTime
    ? lastEndTime - firstStartTime
    : 0;
  
  const averageProcessingTime = studentsWithDuration.length > 0 
    ? Math.round(studentsWithDuration.reduce((sum, s) => sum + (s.processingDuration || 0), 0) / studentsWithDuration.length) 
    : 0;

  // 计算平均分统计
  const gradedStudents = students.filter((s) => s.status === StudentStatus.Graded && s.gradingResult);
  const averageStats = {
    totalScore: 0,
    contentScore: 0,
    languageScore: 0,
  };

  if (gradedStudents.length > 0) {
    const totalScoreSum = gradedStudents.reduce((sum, s) => sum + (s.gradingResult?.totalScore || 0), 0);
    const contentScoreSum = gradedStudents.reduce((sum, s) => sum + (s.gradingResult?.contentScore || 0), 0);
    const languageScoreSum = gradedStudents.reduce((sum, s) => sum + (s.gradingResult?.languageScore || 0), 0);
    
    averageStats.totalScore = totalScoreSum / gradedStudents.length;
    averageStats.contentScore = contentScoreSum / gradedStudents.length;
    averageStats.languageScore = languageScoreSum / gradedStudents.length;
  }

  const totalScoreColor = getScoreColor(averageStats.totalScore, 15);
  const contentScoreColor = getScoreColor(averageStats.contentScore, 6);
  const languageScoreColor = getScoreColor(averageStats.languageScore, 9);

  return (
    <>
      {/* 统计区域切换按钮组 */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onToggleStudentCountStats}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            showStudentCountStats
              ? 'bg-slate-100 text-slate-800 border border-slate-300 shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <span className="material-symbols-outlined text-base">
            {showStudentCountStats ? 'expand_less' : 'expand_more'}
          </span>
          人数统计
        </button>

        {totalProcessingTime > 0 && (
          <button
            onClick={onTogglePerformanceStats}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              showPerformanceStats
                ? 'bg-slate-100 text-slate-800 border border-slate-300 shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <span className="material-symbols-outlined text-base">
              {showPerformanceStats ? 'expand_less' : 'expand_more'}
            </span>
            性能统计
          </button>
        )}

        {gradedStudents.length > 0 && (
          <button
            onClick={onToggleScoreStats}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              showScoreStats
                ? 'bg-slate-100 text-slate-800 border border-slate-300 shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <span className="material-symbols-outlined text-base">
              {showScoreStats ? 'expand_less' : 'expand_more'}
            </span>
            得分统计
          </button>
        )}
      </div>

      {/* 人数统计 */}
      {showStudentCountStats && (
        <div className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface-card p-4 rounded-xl border border-border-subtle shadow-sm flex flex-col justify-between h-28 relative overflow-hidden group hover:border-slate-300 transition-colors">
              <div className="absolute right-0 top-0 p-3 opacity-[0.05] group-hover:opacity-[0.08] transition-opacity">
                <span className="material-symbols-outlined text-6xl text-slate-900">
                  groups
                </span>
              </div>
              <p className="text-text-secondary text-sm font-medium">
                Total Students
              </p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
              </div>
            </div>

            <div className="bg-surface-card p-4 rounded-xl border border-border-subtle shadow-sm flex flex-col justify-between h-28 relative overflow-hidden group hover:border-slate-300 transition-colors">
              <div className="absolute right-0 top-0 p-3 opacity-[0.05] group-hover:opacity-[0.08] transition-opacity">
                <span className="material-symbols-outlined text-6xl text-slate-900">
                  check_circle
                </span>
              </div>
              <p className="text-text-secondary text-sm font-medium">Graded</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold text-slate-800">
                  {stats.graded}
                </p>
                <span className="text-xs text-text-secondary mb-1.5">
                  {completionRate}% done
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1 mt-2 rounded-full overflow-hidden">
                <div
                  className="bg-green-500 h-full"
                  style={{ width: `${completionRate}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-surface-card p-4 rounded-xl border border-border-subtle shadow-sm flex flex-col justify-between h-28 relative overflow-hidden group hover:border-slate-300 transition-colors">
              <div className="absolute right-0 top-0 p-3 opacity-[0.05] group-hover:opacity-[0.08] transition-opacity">
                <span className="material-symbols-outlined text-6xl text-slate-900">
                  pending
                </span>
              </div>
              <p className="text-text-secondary text-sm font-medium">Pending</p>
              <p className="text-3xl font-bold text-slate-800">{stats.pending}</p>
              <div className="w-full bg-slate-100 h-1 mt-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full"
                  style={{ width: "30%" }}
                ></div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm flex flex-col justify-between h-28 relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-3 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity text-red-600">
                <span className="material-symbols-outlined text-6xl">warning</span>
              </div>
              <p className="text-red-600 text-sm font-medium">Absent / Error</p>
              <p className="text-3xl font-bold text-slate-800">{stats.absent}</p>
              <span className="text-xs text-red-500 mt-2">
                Requires manual review
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 性能统计区域（可展开/收起） */}
      {showPerformanceStats && totalProcessingTime > 0 && (
        <div className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface-card p-4 rounded-xl border border-border-subtle shadow-sm flex flex-col justify-between h-28 relative overflow-hidden group hover:border-slate-300 transition-colors">
              <div className="absolute right-0 top-0 p-3 opacity-[0.05] group-hover:opacity-[0.08] transition-opacity">
                <span className="material-symbols-outlined text-6xl text-slate-900">
                  timer
                </span>
              </div>
              <p className="text-text-secondary text-sm font-medium">总处理时间</p>
              <p className="text-3xl font-bold text-slate-800">
                {formatDuration(totalProcessingTime)}
              </p>
              <span className="text-xs text-text-secondary mt-2">
                {studentsWithDuration.length} 名学生已处理
              </span>
            </div>

            <div className="bg-surface-card p-4 rounded-xl border border-border-subtle shadow-sm flex flex-col justify-between h-28 relative overflow-hidden group hover:border-slate-300 transition-colors">
              <div className="absolute right-0 top-0 p-3 opacity-[0.05] group-hover:opacity-[0.08] transition-opacity">
                <span className="material-symbols-outlined text-6xl text-slate-900">
                  schedule
                </span>
              </div>
              <p className="text-text-secondary text-sm font-medium">平均每人处理时间</p>
              <p className="text-3xl font-bold text-slate-800">
                {formatDuration(averageProcessingTime)}
              </p>
              <span className="text-xs text-text-secondary mt-2">
                基于已处理学生计算
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 得分统计区域（可展开/收起） */}
      {showScoreStats && gradedStudents.length > 0 && (
        <div className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface-card p-4 rounded-xl border border-border-subtle shadow-sm flex flex-col justify-between h-28 relative overflow-hidden group hover:border-slate-300 transition-colors">
              <div className="absolute right-0 top-0 p-3 opacity-[0.05] group-hover:opacity-[0.08] transition-opacity">
                <span className="material-symbols-outlined text-6xl text-slate-900">
                  star
                </span>
              </div>
              <p className="text-text-secondary text-sm font-medium">总分平均分</p>
              <p className="text-3xl font-bold" style={{ color: totalScoreColor }}>
                {averageStats.totalScore.toFixed(1)}
              </p>
              <span className="text-xs text-text-secondary mt-2">
                基于 {gradedStudents.length} 名已评分学生
              </span>
            </div>

            <div className="bg-surface-card p-4 rounded-xl border border-border-subtle shadow-sm flex flex-col justify-between h-28 relative overflow-hidden group hover:border-slate-300 transition-colors">
              <div className="absolute right-0 top-0 p-3 opacity-[0.05] group-hover:opacity-[0.08] transition-opacity">
                <span className="material-symbols-outlined text-6xl text-slate-900">
                  description
                </span>
              </div>
              <p className="text-text-secondary text-sm font-medium">内容分平均分</p>
              <p className="text-3xl font-bold" style={{ color: contentScoreColor }}>
                {averageStats.contentScore.toFixed(1)}
              </p>
              <span className="text-xs text-text-secondary mt-2">
                基于 {gradedStudents.length} 名已评分学生
              </span>
            </div>

            <div className="bg-surface-card p-4 rounded-xl border border-border-subtle shadow-sm flex flex-col justify-between h-28 relative overflow-hidden group hover:border-slate-300 transition-colors">
              <div className="absolute right-0 top-0 p-3 opacity-[0.05] group-hover:opacity-[0.08] transition-opacity">
                <span className="material-symbols-outlined text-6xl text-slate-900">
                  grammar
                </span>
              </div>
              <p className="text-text-secondary text-sm font-medium">语法分平均分</p>
              <p className="text-3xl font-bold" style={{ color: languageScoreColor }}>
                {averageStats.languageScore.toFixed(1)}
              </p>
              <span className="text-xs text-text-secondary mt-2">
                基于 {gradedStudents.length} 名已评分学生
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
