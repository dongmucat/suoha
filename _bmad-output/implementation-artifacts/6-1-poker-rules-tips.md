# Story 6.1: 德州扑克规则提示

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 玩家,
I want 在游戏中查看德州扑克的基本规则,
so that 不熟悉规则时可以快速参考。

## Acceptance Criteria

1. **AC-1: 规则入口（首页）** — 首页 header 区域显示"规则"图标/按钮，点击后弹出规则提示弹窗
2. **AC-2: 规则入口（房间页）** — 房间页面 header 区域显示"规则"图标/按钮，点击后弹出规则提示弹窗
3. **AC-3: 规则弹窗内容** — 弹窗显示德州扑克基本规则，包含：牌型大小排列（皇家同花顺→高牌）、基本游戏流程（翻牌前→翻牌→转牌→河牌→摊牌）
4. **AC-4: 弹窗可滚动** — 规则内容超出屏幕时，弹窗内容区域可滚动查看完整内容
5. **AC-5: 弹窗关闭** — 点击关闭按钮或弹窗外部区域可关闭弹窗
6. **AC-6: 纯前端实现** — 规则内容为静态文本，硬编码在前端，无需后端 API 调用

## Tasks / Subtasks

### 前端任务

- [x] Task 1: 创建 `PokerRulesModal` 组件 (AC: #3, #4, #5)
  - [x] 1.1 在 `frontend/src/components/PokerRulesModal.tsx` 创建弹窗组件
  - [x] 1.2 复用 `RoomPage.tsx` 中已有的弹窗模式（`fixed inset-0 z-40 flex items-center justify-center bg-black/50`，点击背景关闭）
  - [x] 1.3 弹窗内容区域使用 `max-h-[70vh] overflow-y-auto` 实现滚动
  - [x] 1.4 弹窗顶部显示标题"德州扑克规则"和关闭按钮（X 图标，使用 `lucide-react` 的 `X` 图标）
  - [x] 1.5 内容分两个区块：**牌型大小**（从皇家同花顺到高牌，共 10 种牌型，每种包含名称和简要说明）和 **游戏流程**（翻牌前→翻牌→转牌→河牌→摊牌，每阶段简要说明）
  - [x] 1.6 使用项目已有的颜色变量：标题 `text-[#1E293B]`、正文 `text-[#64748B]`、背景 `bg-white`、圆角 `rounded-xl`

- [x] Task 2: 在 `HomePage.tsx` 添加规则入口 (AC: #1)
  - [x] 2.1 在 header 区域（退出按钮左侧）添加规则图标按钮，使用 `lucide-react` 的 `BookOpen` 图标
  - [x] 2.2 添加 `showRules` state（`useState<boolean>(false)`）
  - [x] 2.3 点击图标设置 `showRules(true)`，渲染 `<PokerRulesModal open={showRules} onClose={() => setShowRules(false)} />`

- [x] Task 3: 在 `RoomPage.tsx` 添加规则入口 (AC: #2)
  - [x] 3.1 在 header 区域（现有按钮旁）添加规则图标按钮，使用 `lucide-react` 的 `BookOpen` 图标
  - [x] 3.2 添加 `showRules` state（`useState<boolean>(false)`）
  - [x] 3.3 点击图标设置 `showRules(true)`，渲染 `<PokerRulesModal open={showRules} onClose={() => setShowRules(false)} />`

### 测试任务

- [x] Task 4: 前端单元测试 (AC: #1-#6)
  - [x] 4.1 测试 `PokerRulesModal` 渲染：`open=true` 时显示弹窗内容，`open=false` 时不渲染
  - [x] 4.2 测试关闭按钮：点击 X 按钮调用 `onClose`
  - [x] 4.3 测试背景点击关闭：点击弹窗外部区域调用 `onClose`
  - [x] 4.4 测试内容完整性：验证牌型大小和游戏流程两个区块都存在

## Dev Notes

### 架构模式与约束

- **前端框架**：React 19 + Vite 7 + TypeScript 5.9，路由使用 react-router v7
- **UI 库**：Tailwind CSS 4 + shadcn/ui（目前仅安装了 `button` 组件），`lucide-react` 图标库已安装
- **状态管理**：Zustand（本 story 不需要新 store，规则内容为静态数据）
- **移动优先**：375px-428px 宽度优化，触摸目标 ≥ 44px

### 关键实现决策

1. **纯前端静态内容**：规则文本硬编码在组件中，无需后端 API。内容不会频繁变化，避免不必要的网络请求
2. **复用已有弹窗模式**：`RoomPage.tsx` 中的 `SplitPotModal` 已建立弹窗模式（fixed overlay + 白色卡片 + 点击背景关闭），`PokerRulesModal` 应复用相同模式保持一致性
3. **不使用 shadcn/ui Dialog**：项目当前未安装 `dialog` 组件，且已有手写弹窗模式运行良好，保持一致性优先
4. **图标选择**：使用 `lucide-react` 的 `BookOpen` 图标表示规则/帮助，项目已安装 `lucide-react`（package.json 中已有依赖）

### 现有代码复用

- **弹窗模式**：参考 `frontend/src/pages/RoomPage.tsx:22-85`（`SplitPotModal` 组件）的弹窗结构
- **Toast 组件**：参考 `frontend/src/pages/RoomPage.tsx:9-20`（`Toast` 组件）如需提示
- **Header 样式**：参考 `frontend/src/pages/HomePage.tsx:47-57` 的 header 布局模式

### 源码树涉及文件

| 操作 | 文件路径 |
|------|----------|
| 新建 | `frontend/src/components/PokerRulesModal.tsx` |
| 修改 | `frontend/src/pages/HomePage.tsx` |
| 修改 | `frontend/src/pages/RoomPage.tsx` |
| 新建 | `frontend/src/components/__tests__/PokerRulesModal.test.tsx` |

### UX 设计要点

- **弹窗尺寸**：`mx-4 w-full max-w-sm`（与 SplitPotModal 一致），内容区 `max-h-[70vh] overflow-y-auto`
- **触摸友好**：关闭按钮 ≥ 44px 触摸目标
- **颜色方案**：标题 `#1E293B`（深灰）、正文 `#64748B`（中灰）、牌型名称加粗、背景白色
- **字体**：标题 16-18px，正文 14px，系统字体
- **动画**：无需复杂动画，弹窗直接显示/隐藏即可（与现有弹窗一致）

### Project Structure Notes

- 组件放在 `frontend/src/components/` 目录下（与 `ProtectedRoute.tsx` 同级），因为是跨页面复用的通用组件
- 测试文件放在 `frontend/src/components/__tests__/` 目录下，遵循项目已有的 `__tests__` 目录模式（参考 `stores/__tests__/`）

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 6.1] — Story 定义和 BDD 验收标准
- [Source: _bmad-output/planning-artifacts/prd.md#FR-7] — FR-7.1 功能需求：玩家可以查看德州扑克基本规则提示
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#设计系统选择] — Tailwind CSS + shadcn/ui 设计系统
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#视觉设计基础] — 颜色系统、字体系统、间距规范
- [Source: _bmad-output/planning-artifacts/architecture.md#前端架构] — React + Vite + TypeScript 技术栈
- [Source: frontend/src/pages/RoomPage.tsx#SplitPotModal] — 已有弹窗模式参考
- [Source: frontend/src/pages/HomePage.tsx#header] — Header 布局参考
- [Source: frontend/package.json] — 项目依赖确认（lucide-react、react-router 等）

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

No issues encountered during implementation.

### Completion Notes List

- 创建 PokerRulesModal 组件，包含 10 种牌型大小排列和 5 个游戏流程阶段
- 复用项目已有弹窗模式（fixed overlay + 白色卡片 + 点击背景关闭 + stopPropagation）
- 在 HomePage 和 RoomPage header 区域添加 BookOpen 图标按钮作为规则入口
- 编写 6 个单元测试覆盖渲染、关闭、背景点击、内容完整性
- 全部 37 个测试通过，0 回归

### File List

| 操作 | 文件路径 |
|------|----------|
| 新建 | frontend/src/components/PokerRulesModal.tsx |
| 修改 | frontend/src/pages/HomePage.tsx |
| 修改 | frontend/src/pages/RoomPage.tsx |
| 新建 | frontend/src/components/__tests__/PokerRulesModal.test.tsx |
