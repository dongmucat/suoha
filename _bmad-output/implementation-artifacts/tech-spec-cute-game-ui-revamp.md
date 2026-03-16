---
title: '可爱游戏风前端UI重构 - 糖果色系动画升级'
slug: 'cute-game-ui-revamp'
created: '2026-03-13'
status: 'implementation-complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['React 19.2', 'TypeScript 5.9', 'Vite 7.3', 'Tailwind CSS 4.2', 'Framer Motion (新增)', 'shadcn v4', 'Base UI', 'Lucide React', 'Zustand 5', 'class-variance-authority', 'tw-animate-css']
files_to_modify: ['frontend/src/index.css', 'frontend/package.json', 'frontend/src/App.tsx', 'frontend/src/pages/login/index.tsx', 'frontend/src/pages/home/index.tsx', 'frontend/src/pages/room/index.tsx', 'frontend/src/pages/room/components/pot-display/index.tsx', 'frontend/src/pages/join/index.tsx', 'frontend/src/pages/settlement/index.tsx', 'frontend/src/components/shared/loading/index.tsx', 'frontend/src/components/shared/global-toast/index.tsx', 'frontend/src/components/shared/confirm-dialog/index.tsx', 'frontend/src/components/ui/button.tsx']
code_patterns: ['页面: src/pages/{name}/index.tsx', '子组件: src/pages/{name}/components/{comp}/index.tsx', '共享组件: src/components/shared/{name}/index.tsx', 'UI组件: src/components/ui/{name}.tsx (shadcn)', 'Store: src/stores/use-{name}-store.ts (Zustand)', '路径别名: @/ → ./src/*', 'import type 语法强制', '禁止 enum 使用 as const', '颜色: 大量硬编码hex值未统一用CSS变量']
test_patterns: ['Vitest 4.0 + happy-dom + @testing-library/react', '测试文件: __tests__/index.test.tsx (同级目录)']
skill_required: 'ui-ux-pro-max'
---

# Tech-Spec: 可爱游戏风前端UI重构 - 糖果色系动画升级

**Created:** 2026-03-13

## Overview

### Problem Statement

当前 suoha（梭哈扑克游戏）前端 UI 风格偏简洁功能型，配色为商务蓝+琥珀色，几乎没有动画效果（仅 loading spinner 有 animate-spin）。缺乏游戏感和趣味性，用户体验平淡。

### Solution

将整个前端 UI 重构为可爱游戏风格：
- **视觉风格**：柔和圆润的设计语言，糖果色系配色
- **动画系统**：使用 Framer Motion 实现全面的动画体验
- **技能依赖**：使用 ui-ux-pro-max 技能进行专业 UI/UX 设计和实现
- **游戏感**：让整个应用感觉像在玩游戏，而不是使用工具

### Scope

**In Scope:**
- 全部 5 个页面的 UI 风格重构（登录、首页、房间、加入、结算）
- 糖果色系配色方案替换（index.css 主题变量）
- 页面切换过渡动画
- 按钮/卡片交互微动画（hover、点击反馈）
- 筹码变化、下注的游戏感动画
- 结算页面胜负动画效果
- 圆润化组件样式（圆角、柔和阴影、气泡感）
- 安装并集成 Framer Motion
- 共享组件（Loading、Toast、ConfirmDialog 等）的风格统一

**Out of Scope:**
- 后端逻辑变更
- Socket.IO 通信协议变更
- 游戏规则逻辑变更
- 新增页面或功能
- 音效系统

## Context for Development

### Codebase Patterns

- **前端根目录**：`frontend/`（非项目根目录）
- **页面结构**：`src/pages/{name}/index.tsx`，子组件在 `components/` 子目录
- **共享组件**：`src/components/shared/{name}/index.tsx`
- **UI 组件**：`src/components/ui/{name}.tsx`（shadcn 生成，使用 cva + Base UI）
- **样式**：Tailwind CSS 4 Vite 插件模式，主题变量在 `src/index.css`
- **状态管理**：Zustand 多 Store 分离（`src/stores/use-{name}-store.ts`）
- **路径别名**：`@/` → `./src/*`
- **TypeScript 严格模式**：`import type` 语法，禁止 enum（erasableSyntaxOnly）
- **已安装 `tw-animate-css`** 但基本未使用
- **颜色硬编码问题**：Room 页面和多个组件直接使用 `#1E293B`、`#F59E0B` 等 hex 值，未统一使用 CSS 变量

### 当前 UI 现状分析

- **配色**：商务蓝 `#1E40AF` + 琥珀 `#F59E0B`，冷色调
- **圆角**：基础 `rounded-lg`（0.625rem），不够圆润
- **阴影**：仅 `shadow-sm`/`shadow-lg`，缺乏层次
- **动画**：几乎为零（仅 Loading spinner 的 `animate-spin`，PotDisplay 的 `transition-all duration-300`）
- **两套主题系统冲突**：`@theme` 块定义自定义颜色 + `:root` 定义 shadcn oklch 变量
- **Modal 实现**：手动 `fixed inset-0 z-50` 遮罩层，无进出动画
- **按钮**：shadcn Button 组件使用 cva，但页面中大量直接写 `<button>` 未复用

### Files to Reference

| File | Purpose | 行数 | 改动复杂度 |
| ---- | ------- | ---- | ---------- |
| frontend/src/index.css | 主题变量和全局样式（两套主题系统） | 90 | 高 - 配色全面替换 |
| frontend/package.json | 依赖管理 | 51 | 低 - 添加 framer-motion |
| frontend/src/App.tsx | 路由 + Suspense 包裹 | 38 | 中 - 添加页面过渡 |
| frontend/src/pages/login/index.tsx | 登录页（表单） | 95 | 中 |
| frontend/src/pages/home/index.tsx | 首页（创建/加入房间） | 117 | 中 |
| frontend/src/pages/room/index.tsx | 房间主页面（含 SplitPotModal） | ~450 | 高 - 最复杂页面 |
| frontend/src/pages/room/components/pot-display/index.tsx | 池底显示 | 41 | 中 - 数字动画 |
| frontend/src/pages/join/index.tsx | 加入房间页（简单） | 47 | 低 |
| frontend/src/pages/settlement/index.tsx | 结算页（胜负列表） | 102 | 高 - 胜负动画 |
| frontend/src/components/shared/loading/index.tsx | 加载动画 | 7 | 低 - 替换为可爱动画 |
| frontend/src/components/shared/global-toast/index.tsx | 全局提示 | 21 | 低 - 添加弹入动画 |
| frontend/src/components/shared/confirm-dialog/index.tsx | 确认弹窗 | 30 | 中 - 添加弹窗动画 |
| frontend/src/components/ui/button.tsx | shadcn 按钮（cva） | 58 | 中 - 圆润化 + 微动画 |

### Technical Decisions

- **动画库**：Framer Motion（用户指定）
- **设计技能**：ui-ux-pro-max（用户指定，用于专业 UI/UX 设计指导）
- **风格方向**：柔和圆润 + 糖果色系（类似动物森友会的温暖感）
- **配色策略**：替换 `@theme` 和 `:root` 两套 CSS 变量为糖果色系，同时清理组件中的硬编码 hex 值
- **动画策略**：Framer Motion 的 `AnimatePresence` 用于页面过渡和 Modal，`motion` 组件用于微交互
- **颜色统一**：将所有硬编码颜色替换为 Tailwind 主题变量引用

## Implementation Plan

### Tasks

#### 阶段 1：基础设施（依赖和主题）

- [x] Task 1: 安装 Framer Motion
  - File: `frontend/package.json`
  - Action: 在 `frontend/` 目录下执行 `pnpm add framer-motion`
  - Notes: 确认安装后 `import { motion, AnimatePresence } from 'framer-motion'` 可用

- [x] Task 2: 糖果色系主题替换
  - File: `frontend/src/index.css`
  - Action: 替换 `@theme` 块中的所有颜色变量为糖果色系：
    - `--color-primary`: `#FF6B9D`（糖果粉）
    - `--color-accent`: `#FFB347`（蜜橙）
    - `--color-success`: `#7DD3A0`（薄荷绿）
    - `--color-danger`: `#FF8A8A`（柔红）
    - `--color-bg`: `#FFF5F7`（奶粉背景）
    - `--color-card`: `#FFFFFF`（保持白色）
    - `--color-border`: `#FFD6E0`（粉边框）
    - `--color-text-primary`: `#4A3548`（深莓紫，替代冷灰）
    - `--color-text-secondary`: `#9B8A9E`（淡紫灰）
  - Action: 同步更新 `:root` 中 shadcn oklch 变量，使 `--primary`、`--destructive` 等与糖果色系一致
  - Action: 增大全局圆角 `--radius: 1rem`（从 0.625rem 提升）
  - Action: 添加自定义 CSS 变量用于游戏感阴影：`--shadow-cute: 0 4px 20px rgba(255,107,157,0.15)`
  - Notes: 使用 ui-ux-pro-max 技能确定最终配色方案，以上为参考方向

- [x] Task 3: 创建 Framer Motion 动画工具文件
  - File: `frontend/src/lib/animations.ts`（新建）
  - Action: 创建共享动画 variants 常量：
    - `pageTransition`: 页面进出动画（fadeIn + slideUp）
    - `modalOverlay`: 遮罩层淡入淡出
    - `modalContent`: 弹窗弹入弹出（scale + fade）
    - `cardHover`: 卡片悬浮效果（scale 1.02 + shadow 增强）
    - `buttonTap`: 按钮点击反馈（scale 0.95）
    - `listItem`: 列表项交错入场（staggerChildren）
    - `numberPop`: 数字变化弹跳效果
    - `celebrateWin`: 胜利庆祝动画（scale + rotate 微晃）
    - `sadLose`: 失败动画（轻微下沉）
  - Notes: 使用 `as const` 导出，不使用 enum。所有 variant 使用 `import type` 兼容的方式

#### 阶段 2：共享组件升级

- [x] Task 4: Loading 组件可爱化
  - File: `frontend/src/components/shared/loading/index.tsx`
  - Action: 替换 `animate-spin` 圆环为 Framer Motion 弹跳动画（3个圆点交替弹跳，糖果色）
  - Notes: 保持 `min-h-screen` 居中布局，使用 `motion.div` + `transition: { repeat: Infinity }`

- [x] Task 5: GlobalToast 弹入动画
  - File: `frontend/src/components/shared/global-toast/index.tsx`
  - Action: 用 `AnimatePresence` + `motion.div` 包裹，添加从顶部滑入 + 弹跳效果
  - Action: 样式从 `bg-gray-800` 改为糖果色系（`bg-primary text-white rounded-2xl shadow-cute`）
  - Notes: 保持 3 秒自动消失逻辑不变

- [x] Task 6: ConfirmDialog 弹窗动画
  - File: `frontend/src/components/shared/confirm-dialog/index.tsx`
  - Action: 遮罩层用 `motion.div` + `modalOverlay` variant
  - Action: 弹窗内容用 `motion.div` + `modalContent` variant（scale 弹入）
  - Action: 替换硬编码颜色 `#1E293B` → `text-text-primary`，`#F59E0B` → `bg-accent`
  - Action: 圆角从 `rounded-xl` 升级为 `rounded-3xl`，添加 `shadow-cute`

- [x] Task 7: Button 组件圆润化
  - File: `frontend/src/components/ui/button.tsx`
  - Action: 基础样式中 `rounded-lg` 改为 `rounded-2xl`
  - Action: 添加 `active:scale-95 transition-transform` 到基础 cva 类
  - Notes: 不引入 Framer Motion 到此组件（保持 shadcn 兼容），用 CSS transition 实现微动画

#### 阶段 3：页面过渡系统

- [x] Task 8: App.tsx 页面过渡
  - File: `frontend/src/App.tsx`
  - Action: 创建 `AnimatedRoutes` 包裹组件，使用 `AnimatePresence` + `useLocation`
  - Action: 每个 `<Route>` 的 element 用 `motion.div` 包裹，应用 `pageTransition` variant
  - Notes: 保持 `<Suspense fallback={<Loading />}>` 在外层，`AnimatePresence` 在 `<Routes>` 层级

#### 阶段 4：各页面可爱化重构

- [x] Task 9: Login 页面
  - File: `frontend/src/pages/login/index.tsx`
  - Action: 标题 "suoha" 添加可爱字体效果（加大、圆润、带微动画）
  - Action: 表单卡片添加 `rounded-3xl shadow-cute` 柔和阴影
  - Action: 输入框 `rounded-lg` → `rounded-2xl`，focus 时边框变为 `ring-primary`（糖果粉）
  - Action: 登录按钮添加 `whileHover={{ scale: 1.03 }}` + `whileTap={{ scale: 0.97 }}`
  - Action: 错误提示用 `motion.p` 添加抖动动画
  - Action: 页面入场使用 `pageTransition` variant

- [x] Task 10: Home 首页
  - File: `frontend/src/pages/home/index.tsx`
  - Action: Header 背景从 `bg-primary` 改为渐变 `bg-gradient-to-r from-primary to-accent`
  - Action: "创建房间" 按钮改为大圆角卡片式按钮，添加 `whileHover` 浮起效果 + 柔和阴影
  - Action: "加入房间" 输入框 + 按钮圆润化，输入框 `rounded-2xl`
  - Action: 分隔线 "或" 改为可爱的装饰元素（如小星星或小圆点）
  - Action: 替换硬编码颜色为主题变量
  - Action: 页面内容使用 `listItem` variant 交错入场

- [x] Task 11: Room 房间页面
  - File: `frontend/src/pages/room/index.tsx`
  - Action: Header 渐变化，与 Home 一致
  - Action: 玩家列表卡片 `rounded-3xl` + `shadow-cute`，添加 `cardHover` 效果
  - Action: 下注按钮组（快捷下注 +10/+50/+100）添加 `buttonTap` 动画
  - Action: 自定义下注输入框圆润化
  - Action: "收回池底"/"平分池底" 按钮添加 hover 渐变效果
  - Action: SplitPotModal 添加 `AnimatePresence` + `modalContent` 弹入动画
  - Action: 替换所有硬编码颜色（`#1E293B`、`#F59E0B`、`gray-*`）为主题变量
  - Action: QR 码区域添加可爱边框装饰
  - Notes: 这是最复杂的页面，注意保持所有业务逻辑不变，只改 UI 层

- [x] Task 12: PotDisplay 池底显示动画
  - File: `frontend/src/pages/room/components/pot-display/index.tsx`
  - Action: 池底数字使用 Framer Motion `animate` 实现数字滚动效果（`numberPop` variant）
  - Action: 背景从 `bg-slate-50` 改为糖果色系柔和背景
  - Action: 下注明细列表项添加 `listItem` 交错入场动画
  - Action: 替换硬编码颜色（`gray-*`、`slate-*`）为主题变量

- [x] Task 13: Join 加入页面
  - File: `frontend/src/pages/join/index.tsx`
  - Action: "正在加入房间..." 文字替换为 Loading 组件（可爱弹跳点）
  - Action: 错误状态添加 `motion.div` 淡入效果
  - Action: 返回按钮圆润化 + `buttonTap` 动画
  - Action: 页面入场使用 `pageTransition` variant

- [x] Task 14: Settlement 结算页面（重点动画）
  - File: `frontend/src/pages/settlement/index.tsx`
  - Action: Header 渐变化
  - Action: 总账校验卡片添加入场弹跳动画
  - Action: 玩家盈亏列表使用 `listItem` 交错入场（每项延迟 0.1s）
  - Action: 盈利玩家（chips > 0）：卡片背景渐变为薄荷绿，数字使用 `celebrateWin` 动画（微微放大 + 弹跳）
  - Action: 亏损玩家（chips < 0）：卡片背景渐变为柔红，数字使用 `sadLose` 动画（轻微下沉）
  - Action: 第一名（排序后第一个）添加特殊效果：金色边框 + 皇冠 emoji 或星星装饰
  - Action: "关闭结算" 按钮圆润化 + `buttonTap`
  - Notes: 这是用户体验的高潮页面，动画要最丰富

#### 阶段 5：全局润色

- [x] Task 15: 硬编码颜色清理
  - Files: 所有已修改文件
  - Action: 全局搜索 `#1E293B`、`#F59E0B`、`#1E40AF`、`gray-*`、`slate-*` 等硬编码值
  - Action: 替换为对应的 Tailwind 主题变量（`text-text-primary`、`bg-accent`、`bg-primary` 等）
  - Notes: 确保没有遗漏的硬编码颜色

- [x] Task 16: 构建验证
  - Action: 在 `frontend/` 目录执行 `pnpm build` 确认无 TypeScript 错误
  - Action: 执行 `pnpm lint` 确认无 ESLint 错误
  - Action: 执行 `pnpm test` 确认现有测试通过
  - Notes: 如有 import type 相关错误，确保 framer-motion 的类型导入使用 `import type`

### Acceptance Criteria

#### 视觉风格
- [ ] AC 1: Given 用户打开任意页面，when 页面加载完成，then 整体配色为糖果色系（粉色主色调、蜜橙强调色、薄荷绿成功色），无商务蓝残留
- [ ] AC 2: Given 用户查看任意卡片或按钮，when 元素渲染完成，then 圆角至少为 `rounded-2xl`（1rem），视觉上呈现圆润柔和感
- [ ] AC 3: Given 用户查看任意页面，when 检查页面源码，then 无硬编码 hex 颜色值（`#1E293B`、`#F59E0B` 等），全部使用 Tailwind 主题变量

#### 页面过渡
- [ ] AC 4: Given 用户在首页，when 点击"创建房间"导航到房间页，then 页面有平滑的淡入+上滑过渡动画（duration ~300ms）
- [ ] AC 5: Given 用户在房间页，when 导航到结算页，then 页面有平滑的过渡动画，旧页面淡出新页面淡入

#### 交互微动画
- [ ] AC 6: Given 用户看到任意按钮，when hover 时，then 按钮有轻微放大效果（scale ~1.03）
- [ ] AC 7: Given 用户点击任意按钮，when 按下时，then 按钮有缩小反馈（scale ~0.95），松开后恢复
- [ ] AC 8: Given 用户看到卡片元素，when hover 时，then 卡片有浮起效果（阴影增强 + 轻微上移）

#### 游戏感动画
- [ ] AC 9: Given 玩家下注后池底数字变化，when 新数字渲染，then 数字有弹跳/滚动过渡效果，而非直接跳变
- [ ] AC 10: Given 下注明细列表更新，when 新条目出现，then 条目有从下方滑入的交错动画

#### 弹窗动画
- [ ] AC 11: Given 用户触发确认弹窗，when 弹窗打开，then 遮罩层淡入 + 弹窗内容从中心 scale 弹入
- [ ] AC 12: Given 用户关闭弹窗，when 弹窗关闭，then 弹窗内容缩小淡出 + 遮罩层淡出（AnimatePresence 控制）

#### 结算页动画
- [ ] AC 13: Given 牌局结束进入结算页，when 玩家列表渲染，then 每个玩家卡片交错入场（间隔 ~100ms）
- [ ] AC 14: Given 玩家盈利（chips > 0），when 卡片渲染完成，then 数字有庆祝弹跳效果，卡片背景为薄荷绿渐变
- [ ] AC 15: Given 玩家亏损（chips < 0），when 卡片渲染完成，then 数字有轻微下沉效果，卡片背景为柔红渐变
- [ ] AC 16: Given 排名第一的玩家，when 卡片渲染完成，then 有特殊视觉装饰（金色边框或星星）

#### Loading 状态
- [ ] AC 17: Given 页面正在加载，when Loading 组件显示，then 显示可爱的弹跳圆点动画（非旋转圆环）

#### 构建完整性
- [ ] AC 18: Given 所有改动完成，when 执行 `pnpm build`，then 构建成功无 TypeScript 错误
- [ ] AC 19: Given 所有改动完成，when 执行 `pnpm test`，then 现有测试全部通过

## Additional Context

### Dependencies

- **framer-motion**（新增）：React 动画库，用于页面过渡、微交互、弹窗动画
- **无其他新依赖**：糖果色系配色和圆润化通过 Tailwind CSS 变量和类名实现

### Testing Strategy

- **构建验证**：`pnpm build` 确认 TypeScript 编译通过
- **Lint 验证**：`pnpm lint` 确认代码规范
- **现有测试**：`pnpm test` 确认不破坏现有功能
- **手动测试**：逐页面检查视觉效果和动画表现
  - 登录页：表单交互、错误提示动画
  - 首页：创建/加入房间按钮动画
  - 房间页：下注动画、池底数字变化、弹窗动画
  - 结算页：玩家列表交错入场、胜负动画效果
  - 页面间导航过渡动画
- **不新增测试**：本次为纯 UI 层改动，动画效果依赖手动验证

### Notes

- **高风险项**：Room 页面（~450行）改动量最大，需特别注意不破坏业务逻辑（下注、收回池底、平分等）
- **颜色一致性**：index.css 存在两套主题系统（`@theme` + `:root` oklch），需确保两套都更新为糖果色系
- **性能考虑**：Framer Motion 动画应使用 `transform` 和 `opacity` 属性（GPU 加速），避免触发 layout reflow
- **技能依赖**：实现时需加载 ui-ux-pro-max 技能，由该技能指导具体的配色值、动画参数和设计细节
- **渐进实施**：建议按阶段顺序实施，每个阶段完成后验证构建，避免大量改动后难以定位问题
