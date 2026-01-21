/**
 * 压缩图片为 base64 字符串
 * @param file 图片文件
 * @param maxWidth 最大宽度（默认 1024px）
 * @param quality JPEG 质量（0-1，默认 0.8）
 * @returns base64 字符串（不含 data:image/jpeg;base64, 前缀）
 */
export const compressImage = async (
  file: File,
  maxWidth: number = 1024,
  quality: number = 0.8
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // 计算新尺寸
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          } else {
            width = (width * maxWidth) / height;
            height = maxWidth;
          }
        }

        // 创建 canvas 并绘制
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("无法创建 canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // 转换为 base64
        const base64 = canvas.toDataURL("image/jpeg", quality);
        // 移除 data:image/jpeg;base64, 前缀
        const base64Data = base64.split(",")[1];
        resolve(base64Data);
      };
      img.onerror = () => reject(new Error("图片加载失败"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
};

/**
 * 裁剪后压缩图片为 base64 字符串
 * @param file 图片文件
 * @param roiRegion ROI区域（百分比）
 * @param maxWidth 最大宽度（默认 1024px）
 * @param quality JPEG 质量（0-1，默认 0.8）
 * @returns base64 字符串（不含 data:image/jpeg;base64, 前缀）
 */
export const compressImageWithROI = async (
  file: File,
  roiRegion: { top: number; left: number; width: number; height: number },
  maxWidth: number = 1024,
  quality: number = 0.8
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const clamp = (value: number, min: number, max: number) =>
          Math.min(Math.max(value, min), max);

        const normalized = {
          top: clamp(roiRegion.top, 0, 100),
          left: clamp(roiRegion.left, 0, 100),
          width: clamp(roiRegion.width, 0, 100),
          height: clamp(roiRegion.height, 0, 100),
        };

        let sourceX = (img.width * normalized.left) / 100;
        let sourceY = (img.height * normalized.top) / 100;
        let sourceWidth = (img.width * normalized.width) / 100;
        let sourceHeight = (img.height * normalized.height) / 100;

        if (sourceWidth <= 0 || sourceHeight <= 0) {
          sourceX = 0;
          sourceY = 0;
          sourceWidth = img.width;
          sourceHeight = img.height;
        }

        if (sourceX + sourceWidth > img.width) {
          sourceWidth = img.width - sourceX;
        }
        if (sourceY + sourceHeight > img.height) {
          sourceHeight = img.height - sourceY;
        }

        // 计算新尺寸（基于裁剪区域）
        let width = sourceWidth;
        let height = sourceHeight;

        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          } else {
            width = (width * maxWidth) / height;
            height = maxWidth;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(width));
        canvas.height = Math.max(1, Math.round(height));
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("无法创建 canvas context"));
          return;
        }

        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          canvas.width,
          canvas.height
        );

        const base64 = canvas.toDataURL("image/jpeg", quality);
        const base64Data = base64.split(",")[1];
        resolve(base64Data);
      };
      img.onerror = () => reject(new Error("图片加载失败"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
};

/**
 * 裁剪图片，只保留ROI区域
 * @param imageUrl 图片URL
 * @param roiRegion ROI区域（百分比）
 * @returns 裁剪后的图片URL（blob URL）
 */
export const cropImageByROI = async (
  imageUrl: string,
  roiRegion: { top: number; left: number; width: number; height: number }
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // 如果是 blob URL 或 data URL，不需要设置 crossOrigin
    if (!imageUrl.startsWith("blob:") && !imageUrl.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    
    img.onload = () => {
      try {
        // 计算实际像素坐标
        const sourceX = (img.width * roiRegion.left) / 100;
        const sourceY = (img.height * roiRegion.top) / 100;
        const sourceWidth = (img.width * roiRegion.width) / 100;
        const sourceHeight = (img.height * roiRegion.height) / 100;

        // 创建canvas并裁剪
        const canvas = document.createElement("canvas");
        canvas.width = sourceWidth;
        canvas.height = sourceHeight;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("无法创建 canvas context"));
          return;
        }

        // 绘制裁剪后的图片
        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          sourceWidth,
          sourceHeight
        );

        // 转换为blob URL
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              resolve(url);
            } else {
              reject(new Error("图片裁剪失败"));
            }
          },
          "image/jpeg",
          0.95
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error("图片加载失败"));
    };

    img.src = imageUrl;
  });
};

/**
 * 将文件转换为 base64 字符串（不压缩）
 * @param file 文件
 * @returns base64 字符串（不含前缀）
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      // 移除 data:image/...;base64, 前缀
      const base64Data = base64.split(",")[1];
      resolve(base64Data);
    };
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
};
