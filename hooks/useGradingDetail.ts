import { useState, useEffect, useCallback } from "react";
import { Student, AppConfig, GradingResult } from "../types";
import { cropImageByROI } from "../utils/imageUtils";
import { GradingService } from "../services/geminiService";

interface UseGradingDetailProps {
  student: Student | undefined;
  config: AppConfig;
  fileMap: Map<string, File>;
  updateStudent: (id: string, updates: Partial<Student>) => void;
  updateStudentGradingResult: (id: string, result: GradingResult) => void;
}

export const useGradingDetail = ({
  student,
  config,
  fileMap,
  updateStudent,
  updateStudentGradingResult,
}: UseGradingDetailProps) => {
  const [ocrText, setOcrText] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null);

  // 初始化 OCR 文本
  useEffect(() => {
    if (student?.gradingResult) {
      setOcrText(student.gradingResult.ocrText);
    }
  }, [student]);

  // 使用全局ROI裁剪图片
  useEffect(() => {
    if (!student?.imageUrl) {
      if (croppedImageUrl && croppedImageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(croppedImageUrl);
        setCroppedImageUrl(null);
      }
      return;
    }

    const currentRoi = config.globalROI || { top: 20, left: 10, width: 80, height: 50 };

    let isCancelled = false;
    let currentCroppedUrl: string | null = null;

    cropImageByROI(student.imageUrl, currentRoi)
      .then((url) => {
        currentCroppedUrl = url;
        if (croppedImageUrl && croppedImageUrl.startsWith("blob:")) {
          URL.revokeObjectURL(croppedImageUrl);
        }
        if (!isCancelled) {
          setCroppedImageUrl(url);
        } else {
          URL.revokeObjectURL(url);
        }
      })
      .catch((error) => {
        console.error("图片裁剪失败:", error);
        if (!isCancelled) {
          setCroppedImageUrl(null);
        }
      });

    return () => {
      isCancelled = true;
      if (currentCroppedUrl && currentCroppedUrl.startsWith("blob:")) {
        URL.revokeObjectURL(currentCroppedUrl);
      }
      if (croppedImageUrl && croppedImageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(croppedImageUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.imageUrl, config.globalROI]);

  const handleOcrTextChange = useCallback((newText: string) => {
    setOcrText(newText);
    if (student?.gradingResult) {
      updateStudent(student.id, {
        gradingResult: {
          ...student.gradingResult,
          ocrText: newText,
        },
      });
    }
  }, [student, updateStudent]);

  const handleRegenerate = useCallback(async () => {
    if (!student || !fileMap.has(student.id)) {
      alert("该学生没有图片文件");
      return;
    }

    setIsRegenerating(true);
    const service = new GradingService(config);

    try {
      const file = fileMap.get(student.id)!;
      const result = await service.gradeImage(file);
      updateStudentGradingResult(student.id, result);
      setOcrText(result.ocrText);
      alert("重新评分成功");
    } catch (error: any) {
      alert(`重新评分失败: ${error.message}`);
    } finally {
      setIsRegenerating(false);
    }
  }, [student, fileMap, config, updateStudentGradingResult]);

  return {
    ocrText,
    setOcrText,
    isRegenerating,
    croppedImageUrl,
    handleOcrTextChange,
    handleRegenerate,
  };
};
