import { Student, StudentStatus, AppConfig, GradingResult, ApiLogEntry } from "../types";
import { GradingService } from "./geminiService";

interface GradingTask {
  student: Student;
  file: File;
}

interface GradingProgress {
  studentId: string;
  result?: GradingResult;
  error?: Error;
  startTime?: number; // 开始处理时间（时间戳，毫秒）
  endTime?: number; // 结束处理时间（时间戳，毫秒）
  duration?: number; // 处理时长（毫秒）
}

interface BatchRunOptions {
  tasks: GradingTask[];
  config: AppConfig;
  onProgress: (progress: GradingProgress) => void;
  onLog?: (log: Omit<ApiLogEntry, "id" | "timestamp">) => void;
  shouldCancel?: () => boolean;
}

/**
 * 延迟函数
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 并发评分调度器
 */
export class GradingScheduler {
  private config: AppConfig;
  private onProgress: (progress: GradingProgress) => void;
  private isCancelled: boolean = false;

  constructor(config: AppConfig, onProgress: (progress: GradingProgress) => void) {
    this.config = config;
    this.onProgress = onProgress;
  }

  /**
   * 取消评分
   */
  cancel() {
    this.isCancelled = true;
  }

  /**
   * 批量评分（需要提供 File 映射）
   */
  async gradeBatch(
    students: Student[],
    fileMap?: Map<string, File>,
    studentIds?: string[],
    onLog?: (log: Omit<ApiLogEntry, "id" | "timestamp">) => void
  ): Promise<void> {
    this.isCancelled = false;
    if (!fileMap) {
      throw new Error("需要提供文件映射，请使用 gradeBatchWithFiles 或传入 fileMap");
    }

    const tasks = buildTasks(students, fileMap, studentIds);
    await runBatch({
      tasks,
      config: this.config,
      onProgress: this.onProgress,
      onLog,
      shouldCancel: () => this.isCancelled,
    });
  }
}

function buildTasks(
  students: Student[],
  fileMap: Map<string, File>,
  studentIds?: string[]
): GradingTask[] {
  return students
    .filter((s) => {
      // 如果指定了学生ID列表，只处理这些学生（无论状态）
      if (studentIds && studentIds.length > 0) {
        if (!studentIds.includes(s.id)) return false;
      } else {
        // 否则只处理 Pending 状态的学生
        if (s.status !== StudentStatus.Pending) return false;
      }
      // 必须有图片文件
      if (!fileMap.has(s.id)) return false;
      return true;
    })
    .map((student) => ({
      student,
      file: fileMap.get(student.id)!,
    }));
}

async function runBatch(options: BatchRunOptions): Promise<void> {
  const { tasks, config, onProgress, onLog, shouldCancel } = options;

  if (tasks.length === 0) {
    throw new Error("没有需要评分的学生");
  }

  const concurrency = Math.max(1, config.concurrency || 5);
  const requestInterval = 500;
  let nextIndex = 0;
  let lastStartAt = 0;
  let isCancelled = false;

  const waitForSlot = async () => {
    if (requestInterval <= 0) return;
    const now = Date.now();
    const waitMs = Math.max(0, lastStartAt + requestInterval - now);
    lastStartAt = now + waitMs;
    if (waitMs > 0) {
      // 在等待期间也检查取消状态
      const checkInterval = 100; // 每100ms检查一次
      let remaining = waitMs;
      while (remaining > 0 && !isCancelled) {
        const chunk = Math.min(checkInterval, remaining);
        await delay(chunk);
        remaining -= chunk;
        if (shouldCancel?.()) {
          isCancelled = true;
          break;
        }
      }
    }
  };

  const worker = async () => {
    while (true) {
      if (shouldCancel?.() || isCancelled) {
        isCancelled = true;
        return;
      }
      const index = nextIndex++;
      if (index >= tasks.length || isCancelled) return;

      const task = tasks[index];

      await waitForSlot();
      if (shouldCancel?.() || isCancelled) {
        isCancelled = true;
        return;
      }

      const startTime = Date.now();
      onProgress({ studentId: task.student.id, startTime });

      const service = new GradingService(config, (log) => {
        onLog?.({
          ...log,
          studentId: task.student.id,
          studentName: task.student.name,
        });
      });

      try {
        const result = await gradeWithRetry(
          service,
          task.file,
          task.student.id,
          3,
          () => shouldCancel?.() || isCancelled
        );
        if (isCancelled) return; // 如果已取消，不再更新进度
        const endTime = Date.now();
        onProgress({
          studentId: task.student.id,
          result,
          startTime,
          endTime,
          duration: endTime - startTime,
        });
      } catch (error: any) {
        if (isCancelled && error.message === "评分已取消") {
          return; // 取消时不再更新进度
        }
        const endTime = Date.now();
        onProgress({
          studentId: task.student.id,
          error: error as Error,
          startTime,
          endTime,
          duration: endTime - startTime,
        });
      }
    }
  };

  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    () => worker()
  );
  
  // 使用 Promise.allSettled 而不是 Promise.all，这样即使有 worker 被取消也不会导致整个 Promise 失败
  await Promise.allSettled(workers);
  
  // 如果被取消，抛出取消错误
  if (shouldCancel?.() || isCancelled) {
    throw new Error("批量处理已取消");
  }
}

/**
 * 批量评分的简化接口（接收 File 映射）
 * @param studentIds 可选：指定要处理的学生ID列表。如果提供，将处理这些学生（无论状态）；否则处理所有Pending状态的学生
 */
export async function gradeBatchWithFiles(
  students: Student[],
  fileMap: Map<string, File>,
  config: AppConfig,
  onProgress: (progress: GradingProgress) => void,
  onCancel?: () => void,
  onLog?: (log: Omit<ApiLogEntry, "id" | "timestamp">) => void,
  studentIds?: string[]
): Promise<void> {
  let isCancelled = false;
  const cancel = () => {
    isCancelled = true;
    onCancel?.();
  };

  // 允许外部取消
  (window as any).__gradingCancel = cancel;

  const tasks = buildTasks(students, fileMap, studentIds);
  try {
    await runBatch({
      tasks,
      config,
      onProgress,
      onLog,
      shouldCancel: () => isCancelled,
    });
  } finally {
    if ((window as any).__gradingCancel === cancel) {
      delete (window as any).__gradingCancel;
    }
  }
}

/**
 * 带重试的评分（独立函数版本）
 */
async function gradeWithRetry(
  service: GradingService,
  file: File,
  studentId: string,
  maxRetries: number = 3,
  shouldCancel?: () => boolean
): Promise<GradingResult> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (shouldCancel?.()) {
      throw new Error("评分已取消");
    }

    try {
      return await service.gradeImage(file);
    } catch (error: any) {
      // 如果已取消，立即抛出取消错误
      if (shouldCancel?.()) {
        throw new Error("评分已取消");
      }
      
      lastError = error;

      if (error.message?.includes("429") || error.message?.includes("Rate Limit")) {
        // 在等待期间也检查取消状态
        let remaining = 2000;
        const checkInterval = 200;
        while (remaining > 0) {
          if (shouldCancel?.()) {
            throw new Error("评分已取消");
          }
          const chunk = Math.min(checkInterval, remaining);
          await delay(chunk);
          remaining -= chunk;
        }
        continue;
      }

      if (attempt === maxRetries - 1) {
        throw error;
      }

      // 在重试延迟期间也检查取消状态
      let remaining = 500;
      const checkInterval = 100;
      while (remaining > 0) {
        if (shouldCancel?.()) {
          throw new Error("评分已取消");
        }
        const chunk = Math.min(checkInterval, remaining);
        await delay(chunk);
        remaining -= chunk;
      }
    }
  }

  throw lastError || new Error("评分失败");
}
