---
title: 'Vite 7 → Vite 8 迁移'
slug: 'vite7-to-vite8-migration'
created: '2026-03-16'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['vite@8', '@vitejs/plugin-react@6', 'vitest@4', 'rolldown', 'oxc', '@tailwindcss/vite@4']
files_to_modify: ['frontend/package.json', 'frontend/vite.config.ts']
code_patterns: ['rolldownOptions', 'codeSplitting.groups', 'defineConfig async']
test_patterns: ['pnpm build', 'pnpm test', 'pnpm dev']
---

# Tech-Spec: Vite 7 → Vite 8 迁移

**Created:** 2026-03-16

## Overview

### Problem Statement

项目前端使用 Vite 7.3.1 构建，Vite 8.0.0 已于 2026-03-12 发布，底层从 esbuild + Rollup 切换到 Rolldown + Oxc，带来更好的构建性能。需要升级以保持技术栈现代化并获得性能提升。

### Solution

升级 Vite 及相关依赖到 Vite 8 兼容版本，重构 vite.config.ts 以适配 Rolldown API 变更，迁移代码分割策略从 manualChunks 对象形式到 Rolldown codeSplitting。

### Scope

**In Scope:**
- 升级 `vite` 到 `^8.0.0`
- 升级 `@vitejs/plugin-react` 到 `^6.0.0`（Vite 8 配套版本）
- 确认 `vitest` `^4.0.18` 兼容 Vite 8（如不兼容则升级）
- `build.rollupOptions` 重命名为 `build.rolldownOptions`
- `manualChunks` 对象形式迁移到 Rolldown `codeSplitting.groups`
- 移除 `rollup-plugin-visualizer` 依赖
- 验证构建、开发服务器、测试均正常

**Out of Scope:**
- 其他非 Vite 相关依赖升级
- 后端代码变更
- 新功能开发
- 构建产物分析工具替代方案（后续处理）

## Context for Development

### Codebase Patterns

- 前端项目位于 `frontend/` 目录
- 包管理器：pnpm
- `vite.config.ts` 使用异步 `defineConfig(async ({ mode }) => ({...}))` 模式
- 当前 analyze 模式通过动态导入 `rollup-plugin-visualizer` 实现
- Tailwind CSS 4.x 通过 `@tailwindcss/vite` 插件集成
- 测试配置内嵌在 `vite.config.ts` 的 `test` 字段中
- 项目 `type: "module"`，无 CJS 导入，CommonJS 互操作变更不影响
- 无 `optimizeDeps.esbuildOptions`、无 `esbuild` 配置项、无装饰器使用
- Node.js 要求：20.19+ 或 22.12+（与 Vite 7 相同）

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `frontend/package.json` | 依赖版本管理，需升级 vite/plugin-react，移除 visualizer |
| `frontend/vite.config.ts` | 构建配置，需重构 rollupOptions → rolldownOptions + codeSplitting |

### Technical Decisions

1. **代码分割策略**：使用 Rolldown `codeSplitting.groups` 替代 `manualChunks` 对象形式
2. **构建分析工具**：移除 `rollup-plugin-visualizer`，后续寻找 Rolldown 兼容替代
3. **兼容层**：不使用 esbuild 回退，直接拥抱 Oxc/Rolldown 新工具链
4. **plugin-react**：升级到 v6（Vite 8 配套版本），v5 也向后兼容但推荐升级

## Implementation Plan

### Tasks

- [x] Task 1: 升级 package.json 依赖版本
  - File: `frontend/package.json`
  - Action:
    - `"vite": "^7.3.1"` → `"vite": "^8.0.0"`
    - `"@vitejs/plugin-react": "^5.1.1"` → `"@vitejs/plugin-react": "^6.0.0"`
    - 移除 `"rollup-plugin-visualizer": "^7.0.1"`
  - Notes: `vitest` `^4.0.18` 暂保留，安装后验证兼容性

- [x] Task 2: 重构 vite.config.ts 构建配置
  - File: `frontend/vite.config.ts`
  - Action:
    - 将 `build.rollupOptions` 重命名为 `build.rolldownOptions`
    - 将 `manualChunks` 对象形式替换为 `codeSplitting.groups`：
      ```typescript
      build: {
        chunkSizeWarningLimit: 500,
        rolldownOptions: {
          output: {
            codeSplitting: {
              groups: [
                { test: /react|react-dom|react-router/, name: 'vendor' },
                { test: /socket\.io-client/, name: 'socket' },
                { test: /qrcode\.react/, name: 'qrcode' },
              ],
            },
          },
        },
      },
      ```
    - 移除 analyze 模式的 `rollup-plugin-visualizer` 动态导入
  - Notes: Rolldown 使用 `codeSplitting.groups` 时会自动生成 `runtime.js` chunk

- [x] Task 3: 安装依赖并验证
  - File: `frontend/` (工作目录)
  - Action:
    - 执行 `pnpm install` 安装更新后的依赖
    - 检查是否有 peer dependency 警告或冲突
    - 如 vitest 报不兼容，升级到最新版本
  - Notes: 注意 pnpm 的 peer dependency 严格模式

- [x] Task 4: 验证开发服务器
  - File: N/A
  - Action:
    - 执行 `pnpm dev`，确认开发服务器正常启动
    - 确认 HMR 热更新正常工作
    - 确认 Vite proxy `/api → localhost:9091` 正常
    - 确认 Tailwind CSS 样式正常加载
  - Notes: 手动验证，需启动后端服务

- [x] Task 5: 验证生产构建
  - File: N/A
  - Action:
    - 执行 `pnpm build`，确认构建成功
    - 检查 `dist/` 输出，确认 chunk 分割符合预期（vendor、socket、qrcode 独立 chunk + runtime.js）
    - 确认无构建警告或错误
  - Notes: 关注 chunk 大小是否合理，CSS 压缩改为 Lightning CSS 后包大小可能略有变化

- [x] Task 6: 验证测试
  - File: N/A
  - Action:
    - 执行 `pnpm test`，确认所有测试通过
    - 确认 Vitest + happy-dom 环境正常
  - Notes: 如有测试失败，排查是否与 Vite 8 变更相关

### Acceptance Criteria

- [x] AC 1: Given 已更新 package.json，when 执行 `pnpm install`，then 依赖安装成功且无 peer dependency 错误
- [x] AC 2: Given 已重构 vite.config.ts，when 执行 `pnpm dev`，then 开发服务器正常启动，HMR 正常，页面可访问
- [x] AC 3: Given 已重构 vite.config.ts，when 执行 `pnpm build`，then 构建成功，dist/ 中包含 vendor、socket、qrcode 独立 chunk 和 runtime.js
- [x] AC 4: Given 已升级 Vite 8，when 执行 `pnpm test`，then 所有现有测试通过
- [x] AC 5: Given 已移除 rollup-plugin-visualizer，when 检查 vite.config.ts，then 无 analyze 模式相关代码残留
- [x] AC 6: Given 已升级 Vite 8，when 检查 vite.config.ts，then 无 `rollupOptions`、`manualChunks`、`esbuild` 等已弃用配置

## Additional Context

### Dependencies

- Vite 8.0.0+
- @vitejs/plugin-react 6.0.0+
- Node.js 20.19+ 或 22.12+
- pnpm（包管理器）

### Testing Strategy

- **自动化测试**：`pnpm test` 运行 Vitest 全量测试
- **构建验证**：`pnpm build` 确认生产构建成功
- **手动测试**：`pnpm dev` 启动开发服务器，验证页面加载、HMR、代理、样式
- **Chunk 检查**：检查 `dist/assets/` 目录确认分包策略生效

### Notes

- **官方迁移文档**：https://cn.vite.dev/guide/migration
- **风险项**：Rolldown codeSplitting 的 `groups` 正则匹配行为可能与 manualChunks 的精确模块名匹配略有差异，需验证 chunk 内容
- **runtime.js**：使用 codeSplitting.groups 时 Rolldown 会自动生成 runtime.js chunk，这是正常行为
- **CSS 压缩**：默认改为 Lightning CSS，CSS 包大小可能略有变化，属于预期行为
- **后续事项**：寻找 Rolldown 兼容的构建分析工具替代 rollup-plugin-visualizer

## Review Notes
- 对抗性代码审查已完成
- 发现：12 条，0 条修复，12 条跳过
- 解决方式：逐条讨论 High 级别（4 条），其余批量跳过
- High 级别发现均为可接受风险或需手动验证项
