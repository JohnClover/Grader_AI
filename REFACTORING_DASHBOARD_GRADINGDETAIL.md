## Dashboard & GradingDetail 重构记录（2026-01）

本文档记录本次对 Dashboard 与 GradingDetail 的结构性重构，方便后续回顾与回归测试。业务行为目标是**保持功能与交互不变，只做结构拆分与职责下沉**。

---

### 一、整体变更概览

- **新增目录**
  - `components/dashboard/`：Dashboard 页相关展示组件
  - `components/grading/`：GradingDetail 页相关展示组件
  - `hooks/`：跨页面可复用的业务 hooks

- **旧入口文件改为别名导出**（保证外部引用不变）
  - `components/Dashboard.tsx`
    - 现在仅包含：`export { DashboardPage as Dashboard } from "./dashboard/DashboardPage";`
  - `components/GradingDetail.tsx`
    - 现在仅包含：`export { GradingDetailPage as GradingDetail } from "./grading/GradingDetailPage";`

> 路由与外部 import 不需要修改：仍然从 `components/Dashboard` 与 `components/GradingDetail` 引用即可。

---

### 二、Dashboard 重构

#### 2.1 新的容器组件

- **文件**：`components/dashboard/DashboardPage.tsx`
- **职责**：
  - 从 `useAppContext()` 读取全局状态与 action
  - 组合下列 hooks 和展示组件：
    - 选择 & 搜索：`useDashboardSelection`
    - 批量评分：`useBatchGrading`
    - 名单导入/生成：`useStudentListImport`
    - 图片缩放：`useImageZoomDashboard`
    - 统计头部：`StudentStatsHeader` + `DashboardHeaderControls`
    - 主体区域：`StudentTable` + `ImagePreviewPanel`
    - 对话框：`DashboardDialogs`

#### 2.2 新增的展示组件

- **`StudentStatsHeader.tsx`**
  - 展示：
    - 学生总数 / 已评分 / Pending / Absent/Error 卡片
    - 总处理时间、平均处理时间
    - 平均总分、内容分、语言分
  - 输入：`students` + 三个开关状态/回调：
    - `showStudentCountStats`, `showPerformanceStats`, `showScoreStats`

- **`DashboardHeaderControls.tsx`**
  - 展示 Provider/Model/Thinking 选择区
  - 输入：`config`，输出：通过 `onUpdateConfig` 回调更新配置

- **`DashboardControlBar.tsx`**
  - 左侧：搜索输入框
  - 右侧：导入名单 / 生成名单 / 设置 ROI / 批量评分按钮
  - 不再直接操作 context，只通过 props 调用：
    - `onImportList`, `onGenerateList`, `onShowROISettings`, `onBatchGrading`

- **`StudentTable.tsx`**
  - 纯表格展示组件：
    - 负责渲染学生列表、选中行高亮、多选复选框、状态 Tag、分数与重试按钮
  - 所有交互通过 props 回调：
    - `onSelectStudent`, `onToggleSelect`, `onSelectAll`, `onRetry`

- **`ImagePreviewPanel.tsx`**
  - 右侧预览区域：
    - 显示当前选中学生的图片
    - 显示「Detailed View」按钮（已评分时可点入 `/grade/:id`）
    - 覆盖状态：Processing 时显示 Analyzing Mask
    - 图片缩放条：百分比输入 + +/- 按钮 + 滚轮缩放
    - 底部操作：缺考勾选、清除图片、更换图片

- **`DashboardDialogs.tsx`**
  - 同时承载：
    - `ROISettingsDialog`
    - `ExcelImportDialog`
  - 通过 props 控制开关、Excel 文件与导入回调

#### 2.3 新增的 hooks

- **`hooks/useDashboardSelection.ts`**
  - 状态：
    - `selectedStudentId`（当前行）
    - `selectedStudentIds`（多选集合）
    - `searchTerm`（搜索关键字）
  - 行为：
    - 初始化选中第一行
    - 根据 `searchTerm` 过滤得到 `filteredStudents`
    - `handleToggleSelect`：单个学生勾选/取消
    - `handleSelectAll`：全选/取消
    - 键盘快捷键：
      - `ArrowUp/Down` 切换学生
      - `Space` 切换当前学生缺考状态（通过回调 `onStatusToggle`）

- **`hooks/useBatchGrading.ts`**
  - 封装原 `handleBatchGrading` 与 `handleRetry`：
    - 检查 API Key 是否配置
    - 根据是否有选中行决定处理：
      - 有选中：仅处理选中学生
      - 无选中：处理所有 Pending 且有图片的学生
    - 调用 `gradeBatchWithFiles`，并回调：
      - `updateStudent` / `updateStudentGradingResult`
      - `updateProgress`
      - `addApiLog`

- **`hooks/useStudentListImport.ts`**
  - 封装原 `handleImportList` / `handleListFileChange` / `handleExcelImport` / `handleGenerateList`
  - 内部管理：`showExcelImportDialog`, `excelFile`
  - 对外通过 props 调用：
    - `onImport`（设置学生列表）
    - `onSelectFirst`（导入/生成后选中第一名学生）

- **`hooks/useImageZoomDashboard.ts`**
  - 状态：`zoomLevel`（基于 `BASE_ZOOM = 84`）
  - 行为：
    - `handleZoomIn/Out/Reset/Change`
    - `handleWheel`（滚轮缩放，阻止默认页缩放）
  - 提供 `displayZoom`（用于显示与输入的百分比）

- **工具函数 `components/dashboard/utils.ts`**
  - `getStatusColor`：将 `StudentStatus` 映射为 Tailwind 类
  - `getScoreColor`：根据分数占比返回渐变色（红→黄→绿）
  - `formatDuration`：将毫秒格式化成 `ms/s/m s` 文本

---

### 三、GradingDetail 重构

#### 3.1 新的容器组件

- **文件**：`components/grading/GradingDetailPage.tsx`
- **职责**：
  - 读取 `:id` 参数与 context 中的 `students/config/fileMap`
  - 调用 hooks：
    - `useGradingDetail`：OCR 文本、ROI 裁剪、重新评分
    - `useImageZoomDetail`：评分详情页的缩放逻辑（基准 135%）
  - 负责早期 return 分支：
    - 学生不存在 / 无评分结果
  - 组合子组件：
    - 左侧：`EssayImagePanel`
    - 右侧：`OcrEditor` + `ScoreSummary` + `ScoreSectionContent` + `ScoreSectionLanguage`
    - 底部：`GradingDetailFooter`

#### 3.2 新增的展示组件

- **`EssayImagePanel.tsx`**
  - 接收：`student`, `croppedImageUrl`, `zoomLevel`, `displayZoom`, 滚轮/按钮事件回调
  - 职责：
    - 显示 ROI 裁剪后的作文图（没有裁剪时退回原图）
    - 展示左上角学生信息卡、右上角扫描时间 tag
    - 展示底部缩放条（与 Dashboard 的交互风格一致）

- **`OcrEditor.tsx`**
  - 简单 textarea 包裹，专注于：
    - 标签头部「Digitized Text / Editable」
    - OCR 文本编辑

- **`ScoreSummary.tsx`**
  - 渲染总分卡片，进度条宽度按 `totalScore / 15` 计算

- **`ScoreSectionContent.tsx` / `ScoreSectionLanguage.tsx`**
  - 分别负责内容分与语言分卡片 + markdown 渲染
  - 使用 `ReactMarkdown` 自定义 `p/strong/ul/ol/li/code/h1-h3` 渲染

- **`GradingDetailFooter.tsx`**
  - 尾部操作区：
    - 重新评分（显示 loading 状态）
    - Back to List
    - Confirm & Next
  - 完全通过 props 与容器交互

#### 3.3 新增的 hooks

- **`hooks/useGradingDetail.ts`**
  - 输入：`student`, `config`, `fileMap`, `updateStudent`, `updateStudentGradingResult`
  - 状态：`ocrText`, `isRegenerating`, `croppedImageUrl`
  - 行为：
    - `useEffect` 初始化 OCR 文本
    - `useEffect` 基于 `config.globalROI` + `student.imageUrl` 生成 ROI 裁剪图
      - 内部负责旧 blob URL 的清理（避免内存泄露）
    - `handleOcrTextChange`：更新本地 OCR 文本并回写到 `student.gradingResult.ocrText`
    - `handleRegenerate`：调用 `GradingService` 重新评分并更新结果

- **`hooks/useImageZoomDetail.ts`**
  - 跟 Dashboard 缩放逻辑类似，但基准为 `BASE_ZOOM = 135`
  - 状态：`zoomLevel`
  - 输出：`displayZoom` + 缩放/滚轮事件回调

---

### 四、兼容性与注意事项

1. **路由与导出保持不变**
   - `App.tsx` 中仍然引用：
     - `Dashboard` 来自 `components/Dashboard`
     - `GradingDetail` 来自 `components/GradingDetail`
   - 这两个旧文件现在仅做 re-export，不再承载实际逻辑。

2. **行为层面预期保持不变**（回归重点）
   - Dashboard：
     - 学生列表渲染、搜索、键盘上下/空格快捷键
     - 批量处理逻辑、失败重试、进度条与统计卡片
     - 图片预览、缩放、清除/更换图片
     - ROI 设置与 Excel 导入
   - GradingDetail：
     - ROI 裁剪效果
     - OCR 文本编辑与回写
     - Markdown 渲染内容
     - 重新评分逻辑
     - Confirm & Next 跳转顺序

3. **blob URL 清理**
   - Dashboard 与 GradingDetail 都在清除/替换图片时显式 `URL.revokeObjectURL`，避免多次导入导致的内存增长。

4. **测试建议（明天回归时可按此走一遍）**
   - 导入或生成学生名单
   - 导入图片并映射到学生
   - 在 Dashboard 上：
     - 使用搜索/多选/批量评分
     - 验证统计卡片数值是否正确
     - 验证图片缩放和缺考标记
   - 在 GradingDetail 上：
     - 检查 ROI 裁剪区域是否与 Dashboard 中设置一致
     - 修改 OCR 文本，看 Dashboard 列表里的评分结果是否保持不变
     - 测试重新评分、Back to List、Confirm & Next

---

### 五、后续可选优化

- 将 `hooks` 中与评分无关的通用逻辑（缩放、选择）提取为更通用的 UI hooks（如 `useZoom`、`useSelection`）。
- 为关键 hooks/组件补充轻量级单测或 Storybook 以锁定行为。
- 进一步将评分 Provider（Gemini / Poe）拆成独立服务模块，配合 `ARCHITECTURE_OPTIMIZATION.md` 中的规划。

