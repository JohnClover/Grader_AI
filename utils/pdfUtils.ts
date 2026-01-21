import * as pdfjsLib from "pdfjs-dist";
// 导入worker文件作为URL（Vite会自动处理）
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// 设置 worker - 使用本地worker文件而不是CDN
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
}

/**
 * 将PDF文件的每一页转换为图片
 * @param pdfFile PDF文件
 * @param scale 缩放比例（默认2，提高清晰度）
 * @returns 图片文件数组，按页面顺序排列
 */
export const convertPdfToImages = async (
  pdfFile: File,
  scale: number = 2
): Promise<File[]> => {
  try {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    const imageFiles: File[] = [];

    // 遍历每一页
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      // 创建canvas
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("无法创建canvas context");
      }

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // 渲染PDF页面到canvas
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };
      await page.render(renderContext).promise;

      // 将canvas转换为blob，然后转换为File
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Canvas转Blob失败"));
            }
          },
          "image/png",
          1.0
        );
      });

      // 创建File对象，文件名格式：原文件名_页码.png
      const baseName = pdfFile.name.replace(/\.pdf$/i, "");
      const fileName = `${baseName}_page${pageNum}.png`;
      const file = new File([blob], fileName, { type: "image/png" });
      imageFiles.push(file);
    }
    return imageFiles;
  } catch (error) {
    throw new Error(`PDF转换失败: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * 检查文件是否为PDF
 */
export const isPdfFile = (file: File): boolean => {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
};
