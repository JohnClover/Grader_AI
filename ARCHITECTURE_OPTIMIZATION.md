# 架构待优化清单（初稿）

## 概述
本文件记录当前代码库中影响稳定性、可维护性与扩展性的架构问题，并给出分阶段优化方向。重点来自快速静态扫描与关键路径抽查。

## 发现的问题（按优先级）

### P0/P1
1. ROI 组件存在调试上报残留，渲染与 useEffect 会触发本地网络请求，带来性能噪音与潜在数据泄露风险。
   - 证据：`components/ROISettingsDialog.tsx`
2. 旧的批量调度接口仍保留占位 file，并且并发队列清理逻辑无效；一旦误调用会直接失败或并发失控。
   - 证据：`services/gradingScheduler.ts`

### P2
3. ROI 设置提示“应用到识别”，但实际评分请求未裁剪图片，仅在详情页显示时裁剪，造成预期不一致与 token 浪费。
   - 证据：`components/ROISettingsDialog.tsx` `components/GradingDetail.tsx` `services/geminiService.ts`
4. 批处理进度统计基于学生快照而非实时状态更新，可能长期显示 0 或不准确。
   - 证据：`components/Dashboard.tsx`
5. API Key 明文存储在 localStorage 且前端直连第三方接口，安全边界弱，难以用于生产/多人环境。
   - 证据：`utils/storage.ts` `components/Configuration.tsx`

### P3
6. 无自动化测试，核心流程（映射、批处理、JSON 解析）缺少回归保护。
   - 证据：`package.json`

## 影响评估
- 稳定性：批处理调度存在潜在崩溃点；进度统计不可靠影响操作信心。
- 性能/成本：ROI 不参与识别会导致图片冗余传输与 token 消耗。
- 安全：API Key 明文持久化与前端直连不符合生产安全标准。

## 建议优化方向（架构层）

### 1) 评分域模块化（Priority: P1）
- 抽象 Provider 接口（Gemini/Poe），统一请求、解析与错误规范化。
- 建立 PromptBuilder 层，集中管理模板与版本。
- 引入 AbortController 统一取消与超时策略。

### 2) 数据与状态分层（Priority: P2）
- 将 `config/students/fileMap/logs` 拆分为独立 store 或 context，避免单体 AppContext 过载。
- fileMap 与图片元数据持久化迁移到 IndexedDB（或 Cache Storage）。

### 3) ROI 进入评分链路（Priority: P2）
- 在评分前裁剪或裁剪后压缩，确保和 UI/配置一致。
- 明确 ROI 的默认值与校验策略。

### 4) 前后端分离与安全（Priority: P2）
- 前端只保留短期 token 或代理签名；第三方调用移到后端代理。
- 日志脱敏（请求体/图片 base64/密钥）。

### 5) 关键路径测试（Priority: P3）
- 单测：映射算法、JSON 解析、评分结果归一化。
- 集成测试：批处理调度与进度更新。

## 分阶段落地建议

### 阶段一（1-2 天）
- 移除调试上报残留。
- 删除/重构旧的 `GradingScheduler.gradeBatch` 接口（保留 `gradeBatchWithFiles`）。
- 修复批处理进度统计。

### 阶段二（2-4 天）
- 引入评分域模块（Provider + PromptBuilder + 统一错误）。
- ROI 进入评分链路。

### 阶段三（视需求）
- 代理服务与密钥管理。
- 增加测试与 CI。

## 待确认问题
1. ROI 是否需要参与实际识别，而非仅用于 UI 展示？
2. `Base URL` 未来用途是否为代理/私有网关？
3. 是否需要保留 Poe 支持与“思考等级”配置？

---

## 参考文件
- `components/ROISettingsDialog.tsx`
- `services/gradingScheduler.ts`
- `services/geminiService.ts`
- `components/Dashboard.tsx`
- `utils/storage.ts`
- `components/Configuration.tsx`
- `package.json`
