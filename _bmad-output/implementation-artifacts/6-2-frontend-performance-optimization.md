# Story 6.2: 前端性能优化

Status: done

## Story

As a 玩家,
I want 应用加载快速、操作流畅,
So that 我在 4G 网络下也能获得良好的使用体验。

## 验收标准

1. **AC-1: 首屏加载时间** — 在 4G 网络环境下，首次打开应用首屏加载时间 ≤ 2 秒
2. **AC-2: 打包体积** — 前端构建产物 gzip 后总体积 ≤ 500KB
3. **AC-3: 路由级代码分割** — 所有页面路由启用 React.lazy + Suspense 动态加载
4. **AC-4: 组件按需引入** — shadcn/ui 组件按需引入，无未使用的组件代码进入 bundle
5. **AC-5: 交互响应** — 页面内点击任何按钮或交互元素，响应时间 ≤ 100ms

## Tasks / Subtasks

- [x] Task 1: 路由级代码分割 (AC: #3)
  - [x] 1.1 修改 `frontend/src/App.tsx`，将 5 个页面组件改为 `React.lazy()` 动态导入
  - [x] 1.2 在 `<Routes>` 外层包裹 `<Suspense fallback={<Loading />}>` 组件
  - [x] 1.3 创建轻量级 Loading 占位组件（居中 spinner，纯 CSS 实现，不引入额外依赖）
  - [x] 1.4 验证构建后产生独立的 chunk 文件（每个页面一个 chunk）

- [x] Task 2: Vite 构建优化配置 (AC: #2)
  - [x] 2.1 在 `vite.config.ts` 中添加 `build.rollupOptions.output.manualChunks` 配置
  - [x] 2.2 将 `react`/`react-dom`/`react-router` 拆分为 `vendor` chunk
  - [x] 2.3 将 `socket.io-client` 拆分为 `socket` chunk（仅房间页面需要）
  - [x] 2.4 将 `qrcode.react` 拆分为 `qrcode` chunk（仅首页需要）
  - [x] 2.5 添加 `build.chunkSizeWarningLimit` 设置为 500

- [x] Task 3: CSS 优化 — 清理未使用变量 (AC: #2, #4)
  - [x] 3.1 清理 `frontend/src/index.css` 中未使用的 shadcn CSS 变量（sidebar-*、chart-* 系列）
  - [x] 3.2 清理 `.dark` 主题块（当前未使用深色模式）
  - [x] 3.3 保留 `@theme` 自定义颜色变量（项目实际使用的 primary/accent/success/danger 等）

- [x] Task 4: 字体优化 (AC: #1, #2)
  - [x] 4.1 评估 Geist Variable 字体的实际使用情况 — 当前 `body` 使用 `system-ui`，仅 `html` 通过 shadcn 设置了 `font-sans: 'Geist Variable'`
  - [x] 4.2 如果 Geist 字体实际未被页面内容使用，移除 `@fontsource-variable/geist` 导入和依赖
  - [x] 4.3 如果保留字体，添加 `font-display: swap` 确保字体加载不阻塞渲染

- [x] Task 5: HTML 性能优化 (AC: #1)
  - [x] 5.1 更新 `frontend/index.html` 的 `<title>` 为 "suoha - 德州扑克记账"
  - [x] 5.2 添加 `<meta name="description">` 标签
  - [x] 5.3 添加 DNS 预连接：`<link rel="preconnect">` 指向后端 API 域名
  - [x] 5.4 添加 `<meta name="theme-color" content="#1E40AF">` 移动端主题色

- [x] Task 6: 构建产物验证 (AC: #1, #2, #5)
  - [x] 6.1 安装 `rollup-plugin-visualizer` 作为 devDependency
  - [x] 6.2 在 `vite.config.ts` 中添加可选的 bundle 分析插件（通过环境变量 `ANALYZE=true` 启用）
  - [x] 6.3 执行 `npm run build` 验证构建成功
  - [x] 6.4 检查 `dist/assets/` 目录，确认代码分割生效（多个 JS chunk）
  - [x] 6.5 验证所有 JS + CSS 文件 gzip 后总体积 ≤ 500KB

- [x] Task 7: 测试验证 (AC: #1-#5)
  - [x] 7.1 运行现有测试套件，确保 0 回归
  - [x] 7.2 验证路由懒加载正常工作（各页面可正常访问）
  - [x] 7.3 验证 ProtectedRoute 与 Suspense 配合正常

## Dev Notes

### 架构约束

- **技术栈**: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 4
- **构建工具**: Vite 使用 Rollup 作为生产构建打包器
- **状态管理**: Zustand（已经是轻量方案，无需优化）
- **目标平台**: 移动端 H5（微信内置浏览器、Safari iOS、Chrome Android）

### 当前问题分析

**1. 无代码分割（最大问题）**
`App.tsx:1-9` 所有 5 个页面组件在顶层静态导入：
```typescript
import LoginPage from '@/pages/LoginPage';
import HomePage from '@/pages/HomePage';
import RoomPage from '@/pages/RoomPage';       // 16KB 最大组件
import JoinPage from '@/pages/JoinPage';
import SettlementPage from '@/pages/SettlementPage';
```
→ 所有页面代码打包到单一 bundle，用户访问登录页也要加载房间页代码。

**2. CSS 冗余**
`index.css` 包含大量未使用的 shadcn 变量：
- `sidebar-*` 系列（6个变量）— 项目无侧边栏
- `chart-*` 系列（5个变量）— 项目无图表
- `.dark` 完整主题块（30+ 变量）— 当前未启用深色模式
- `@fontsource-variable/geist` 字体导入 — body 实际使用 `system-ui`

**3. Vite 无构建优化配置**
`vite.config.ts` 仅有基础配置，缺少：
- `manualChunks` 分包策略
- 构建产物分析工具
- chunk 大小警告阈值

**4. HTML 缺少性能提示**
`index.html` 仅有最基础的 meta 标签，缺少：
- DNS 预连接
- 主题色
- 有意义的 title 和 description

### 关键实现指导

#### Task 1: App.tsx 改造模式

```typescript
// 改造前（当前）
import LoginPage from '@/pages/LoginPage';

// 改造后
const LoginPage = lazy(() => import('@/pages/LoginPage'));
```

注意事项：
- `ProtectedRoute` 组件不要懒加载（它是路由守卫，需要同步加载）
- `useAuthStore` 的 `checkAuth()` 调用保持在 App 组件中
- Suspense fallback 组件必须极轻量（纯 CSS spinner，不依赖任何外部库）

#### Task 2: manualChunks 策略

```typescript
// vite.config.ts build 配置
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom', 'react-router'],
        socket: ['socket.io-client'],
        qrcode: ['qrcode.react'],
      }
    }
  }
}
```

#### Task 3: CSS 清理范围

保留的变量（项目实际使用）：
- `--color-primary`, `--color-accent`, `--color-success`, `--color-danger` 等自定义主题变量
- `--background`, `--foreground`, `--border`, `--input`, `--ring` 等基础 shadcn 变量
- `--radius` 系列

可安全移除的变量：
- `--sidebar-*` 全部（6个 light + 6个 dark）
- `--chart-*` 全部（5个 light + 5个 dark）
- `.dark` 整个块（如果确认未使用）— 移除前搜索代码中是否有 `dark:` 类名使用

#### Task 4: 字体决策

当前状态：
- `index.css:4` 导入 `@fontsource-variable/geist`
- `index.css:106` 设置 `--font-sans: 'Geist Variable', sans-serif`
- `index.css:155` html 应用 `font-sans`
- `index.css:27` body 直接设置 `font-family: system-ui, -apple-system, sans-serif`

body 的 `font-family` 会覆盖 html 的 `font-sans`，所以 Geist 字体可能仅在 shadcn button 组件中生效。需要验证后决定是否移除。

### 项目结构说明

```
frontend/
├── src/
│   ├── App.tsx              ← Task 1: 改造路由懒加载
│   ├── main.tsx             ← 不需要修改
│   ├── index.css            ← Task 3: 清理 CSS 变量; Task 4: 字体
│   ├── components/
│   │   ├── ui/button.tsx    ← 唯一的 shadcn 组件，已按需引入
│   │   ├── PokerRulesModal.tsx
│   │   └── ProtectedRoute.tsx
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── HomePage.tsx
│   │   ├── JoinPage.tsx
│   │   ├── RoomPage.tsx     ← 最大组件 16KB，含 socket.io 逻辑
│   │   └── SettlementPage.tsx
│   ├── stores/              ← Zustand stores，无需优化
│   ├── hooks/
│   ├── lib/
│   │   ├── axios.ts
│   │   ├── socket.ts
│   │   └── utils.ts
│   └── types/
├── index.html               ← Task 5: 添加性能 meta 标签
├── vite.config.ts           ← Task 2 & 6: 构建优化配置
└── package.json
```

### 防灾指南

| 风险 | 预防措施 |
|------|----------|
| 懒加载导致 ProtectedRoute 闪烁 | ProtectedRoute 保持同步导入，不要懒加载 |
| Suspense fallback 引入额外依赖 | 使用纯 CSS spinner，不引入 loading 库 |
| manualChunks 导致循环依赖 | 只拆分纯第三方库，不拆分业务代码 |
| 清理 CSS 变量破坏 button 组件 | 清理前确认 button.tsx 使用的变量列表 |
| 移除字体导致 UI 变化 | 先构建对比截图，确认视觉无差异再移除 |
| rollup-plugin-visualizer 进入生产 bundle | 通过环境变量条件启用，默认关闭 |

### 已完成 Story 的经验

- Story 6.1（德州扑克规则提示）：Modal 模式已验证稳定，PokerRulesModal 为纯静态内容组件，无性能问题
- Story 1.1（项目初始化）：构建产物已确认在 500KB 以内，当前优化是预防性措施
- 所有 37 个现有测试通过，无回归风险

### References

- [Source: _bmad-output/planning-artifacts/prd.md#NFR-1] 性能需求定义
- [Source: _bmad-output/planning-artifacts/architecture.md#前端打包体积超标] 风险缓解：shadcn/ui 按需引入 + tree-shaking
- [Source: _bmad-output/planning-artifacts/epics.md#Story 6.2] 验收标准 BDD 定义
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#响应式策略] 375px-428px 移动优先
- [Source: frontend/src/App.tsx] 当前路由配置（无懒加载）
- [Source: frontend/vite.config.ts] 当前 Vite 配置（无构建优化）
- [Source: frontend/src/index.css] 当前 CSS 变量（含冗余）
- [Source: frontend/index.html] 当前 HTML（缺少性能提示）

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- 修复已有 TS 错误：`useChipStore.test.ts` 中 `mockSocket.on.mock.calls.find` 的类型推断问题（改用 `args` 参数避免元组解构类型不匹配）
- 修复已有 TS 错误：`SettlementPage.test.tsx` 中未使用的 `useChipStore` 导入
- npm install 在此项目中不可用，项目使用 pnpm 作为包管理器

### Completion Notes List

- 路由级代码分割：5 个页面全部改为 React.lazy 动态导入，构建产出独立 chunk
- Vite 构建优化：manualChunks 拆分 vendor/socket/qrcode，rollup-plugin-visualizer 通过 `--mode analyze` 条件启用
- CSS 清理：移除 sidebar-*（8个）、chart-*（5个）变量及 .dark 主题块，减少约 60 行冗余 CSS
- 字体优化：确认 Geist Variable 字体未被实际使用（body 使用 system-ui），移除导入
- HTML 优化：更新 title/description/theme-color/preconnect，lang 改为 zh-CN
- 构建产物 gzip 总体积 135.59KB，远低于 500KB 目标
- 全部 37 个测试通过，零回归

### File List

- `frontend/src/App.tsx` — 改为 React.lazy + Suspense 路由懒加载
- `frontend/src/components/Loading.tsx` — 新增纯 CSS spinner 加载组件
- `frontend/vite.config.ts` — 添加 manualChunks、chunkSizeWarningLimit、rollup-plugin-visualizer
- `frontend/src/index.css` — 清理 sidebar/chart/dark 变量，移除 Geist 字体导入
- `frontend/index.html` — 更新 title/description/theme-color/preconnect/lang
- `frontend/package.json` — 添加 rollup-plugin-visualizer devDependency
- `frontend/pnpm-lock.yaml` — 锁文件更新
- `frontend/src/stores/__tests__/useChipStore.test.ts` — 修复已有 TS 类型错误
- `frontend/src/pages/__tests__/SettlementPage.test.tsx` — 移除未使用导入

### Change Log

- 2026-03-10: Story 6.2 实施完成，前端性能优化全部 7 个 Task 完成
