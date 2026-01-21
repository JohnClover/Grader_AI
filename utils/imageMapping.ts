import { Student, StudentStatus, ImageMappingResult } from "../types";

/**
 * 从文件名中提取数字
 * @param fileName 文件名（如 "22.jpg", "img_003.jpg", "student-5.png"）
 * @returns 提取到的数字，如果未找到则返回 null
 */
export const extractNumberFromFileName = (fileName: string): number | null => {
  // 匹配文件名中的第一个连续数字序列
  const match = fileName.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    return isNaN(num) ? null : num;
  }
  return null;
};

/**
 * 检查文件是否为PDF页面（从PDF转换而来的图片）
 * @param fileName 文件名
 * @returns 如果是PDF页面，返回页码；否则返回null
 */
export const isPdfPage = (fileName: string): number | null => {
  // 匹配格式：xxx_page1.png, xxx_page2.png 等
  const match = fileName.match(/_page(\d+)\./i);
  if (match) {
    const pageNum = parseInt(match[1], 10);
    return isNaN(pageNum) ? null : pageNum;
  }
  return null;
};

/**
 * 将图片映射到学生列表
 * @param images 图片文件数组
 * @param students 学生列表
 * @param useSequentialOrder 是否使用顺序映射（true: 顺序映射/正序，false: 倒序映射）
 * @returns 映射结果数组
 */
export const mapImagesToStudents = (
  images: File[],
  students: Student[],
  useSequentialOrder: boolean = true
): ImageMappingResult[] => {
  const results: ImageMappingResult[] = [];
  const usedImages = new Set<number>(); // 已使用的图片索引
  const mappedStudentIds = new Set<string>(); // 已映射的学生ID

  // 步骤 1: 精确匹配（优先级 1）
  // 遍历所有图片，尝试通过文件名数字匹配到对应学号
  images.forEach((image, imageIndex) => {
    const number = extractNumberFromFileName(image.name);
    if (number !== null) {
      // 查找学号匹配的学生（学号可能是字符串，需要转换比较）
      const student = students.find((s) => {
        // 尝试将学号转换为数字进行比较
        const studentIdNum = parseInt(s.id, 10);
        if (!isNaN(studentIdNum) && studentIdNum === number) {
          // 检查学生是否已缺考或已映射
          return s.status !== StudentStatus.Absent && !mappedStudentIds.has(s.id);
        }
        return false;
      });

      if (student) {
        results.push({
          studentId: student.id,
          file: image,
          fileName: image.name,
          mappingMethod: "exact",
        });
        usedImages.add(imageIndex);
        mappedStudentIds.add(student.id);
      }
    }
  });

  // 步骤 2: 顺位填充（优先级 2）
  // 对未使用的图片进行排序：PDF页面按页码排序，其他按文件名排序
  const unusedImages = images
    .map((img, idx) => ({ file: img, index: idx }))
    .filter((item) => !usedImages.has(item.index))
    .sort((a, b) => {
      const pageA = isPdfPage(a.file.name);
      const pageB = isPdfPage(b.file.name);
      
      // 如果都是PDF页面，按页码排序
      if (pageA !== null && pageB !== null) {
        return pageA - pageB;
      }
      // 如果只有一个是PDF页面，PDF页面优先
      if (pageA !== null) return -1;
      if (pageB !== null) return 1;
      // 都不是PDF页面，按文件名排序
      return a.file.name.localeCompare(b.file.name);
    });

  // 找到所有未映射且未缺考的学生
  let unmappedStudents = students.filter(
    (s) => s.status !== StudentStatus.Absent && !mappedStudentIds.has(s.id)
  );

  // 根据映射方式排序学生
  if (useSequentialOrder) {
    // 顺序映射（正序）：按学号从小到大排序
    unmappedStudents = unmappedStudents.sort((a, b) => {
      const idA = parseInt(a.id, 10);
      const idB = parseInt(b.id, 10);
      if (!isNaN(idA) && !isNaN(idB)) {
        return idA - idB;
      }
      // 如果学号不是纯数字，按字符串排序
      return a.id.localeCompare(b.id);
    });
  } else {
    // 倒序映射：按学号从大到小排序
    unmappedStudents = unmappedStudents.sort((a, b) => {
      const idA = parseInt(a.id, 10);
      const idB = parseInt(b.id, 10);
      if (!isNaN(idA) && !isNaN(idB)) {
        return idB - idA; // 倒序：从大到小
      }
      // 如果学号不是纯数字，按字符串倒序排序
      return b.id.localeCompare(a.id);
    });
  }

  // 依次填充
  unusedImages.forEach((item, idx) => {
    if (idx < unmappedStudents.length) {
      const student = unmappedStudents[idx];
      results.push({
        studentId: student.id,
        file: item.file,
        fileName: item.file.name,
        mappingMethod: useSequentialOrder ? "sequential" : "ordered",
      });
      mappedStudentIds.add(student.id);
    }
  });

  return results;
};

/**
 * 检查映射冲突（多个图片匹配到同一学号）
 */
export const checkMappingConflicts = (
  mappingResults: ImageMappingResult[]
): Map<string, ImageMappingResult[]> => {
  const conflicts = new Map<string, ImageMappingResult[]>();
  const studentMap = new Map<string, ImageMappingResult[]>();

  // 按学生ID分组
  mappingResults.forEach((result) => {
    const existing = studentMap.get(result.studentId) || [];
    existing.push(result);
    studentMap.set(result.studentId, existing);
  });

  // 找出有冲突的（同一学生有多个图片）
  studentMap.forEach((results, studentId) => {
    if (results.length > 1) {
      conflicts.set(studentId, results);
    }
  });

  return conflicts;
};
