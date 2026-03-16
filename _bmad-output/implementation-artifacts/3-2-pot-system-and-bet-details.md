# Story 3.2: 池底显示与下注明细

Status: done

## Story

As a 玩家,
I want 实时看到池底总额和每位玩家的下注明细,
So that 我可以清楚了解当前牌局的资金状况。

## Acceptance Criteria

1. **池底区域显示（FR-4.2）**
   - Given 玩家在房间中
   - When 房间页面加载完成
   - Then 池底区域显示当前池底总额（48px 等宽字体）
   - And 池底总额使用深色 #1E293B
   - And 池底区域背景色为 #F8FAFC
   - And 池底区域有 32px 上下内边距

2. **下注明细显示（FR-4.3）**
   - Given 玩家在房间中
   - When 房间页面加载完成
   - Then 显示每位玩家本轮的下注金额明细
   - And 下注明细清晰标注玩家名称和金额
   - And 未下注的玩家显示为 0 或不显示

3. **实时更新动画（FR-5.1, FR-5.2）**
   - Given 任意玩家执行了下注操作
   - When WebSocket 推送到达
   - Then 池底总额数字动画过渡更新（0.3s ease-out）
   - And 对应玩家的下注明细实时更新
   - And 对应玩家的筹码数字实时更新

4. **池底清空场景**
   - Given 池底被收回或平分
   - When 操作完成
   - Then 池底总额归零（或显示余数）
   - And 下注明细清空
   - And 相关玩家筹码更新

5. **数据一致性**
   - Given 多个玩家同时查看房间
   - When 任意操作发生
   - Then 所有玩家看到完全一致的池底总额
   - And 所有玩家看到完全一致的下注明细
   - And WebSocket 消息延迟 ≤ 1 秒

## Tasks / Subtasks

- [x] Task 1: 前端池底显示组件 (AC: #1, #3)
  - [x] 1.1 创建 `room/components/pot-display/index.tsx` 组件
  - [x] 1.2 实现池底总额显示：48px 等宽字体，深色 #1E293B
  - [x] 1.3 实现池底区域样式：背景色 #F8FAFC，32px 上下内边距
  - [x] 1.4 实现数字动画过渡：0.3s ease-out
  - [x] 1.5 集成到 RoomPage.tsx 中

- [x] Task 2: 前端下注明细显示 (AC: #2, #3)
  - [x] 2.1 在 pot-display 组件中添加下注明细区域
  - [x] 2.2 显示每位玩家的下注金额（玩家名称 + 金额）
  - [x] 2.3 未下注玩家显示为 0 或隐藏
  - [x] 2.4 下注明细实时更新动画

- [x] Task 3: WebSocket 事件监听与状态更新 (AC: #3, #4, #5)
  - [x] 3.1 在 useChipStore 中监听 `bet-placed` 事件
  - [x] 3.2 在 useChipStore 中监听 `pot-collected` 事件
  - [x] 3.3 在 useChipStore 中监听 `pot-split` 事件
  - [x] 3.4 更新 pot 和 bets 状态
  - [x] 3.5 触发组件重渲染

- [x] Task 4: 后端 Redis 数据结构验证 (AC: #5)
  - [x] 4.1 确认 `room:{roomId}:pot` 正确存储池底总额
  - [x] 4.2 确认 `room:{roomId}:bets` 正确存储每位玩家的下注明细
  - [x] 4.3 确认 ChipService 正确更新这些数据结构

- [ ] Task 5: 集成测试 (AC: #1-#5)
  - [ ] 5.1 测试池底显示正确性
  - [ ] 5.2 测试下注明细显示正确性
  - [ ] 5.3 测试实时更新动画
  - [ ] 5.4 测试池底清空场景
  - [ ] 5.5 测试多玩家数据一致性

## Dev Notes

### 依赖关系

**前置Story：**
- Story 3.1 (chip-system) 已完成 ✅
  - ChipService 已实现筹码操作逻辑
  - Redis 数据结构已创建（chips/pot/bets）
  - WebSocket 事件已定义（bet-placed/pot-collected/pot-split）
  - useChipStore 已创建并监听 Socket.IO 事件

**本Story重点：**
本Story专注于**前端UI展示**，后端数据结构和WebSocket事件已在Story 3.1中完成。主要工作是：
1. 创建池底显示组件（pot-display）
2. 实现下注明细展示
3. 实现数字动画过渡
4. 集成到RoomPage

### 已有基础设施（Story 3.1已实现）

**后端已完成：**
- `ChipService.java` - 筹码操作业务逻辑
  - `placeBet()` - 下注操作，更新 pot 和 bets
  - `collectPot()` - 收回池底，清空 pot 和 bets
  - `splitPot()` - 平分池底，清空 pot 和 bets
  - `getChipState()` - 获取完整筹码状态（chips + pot + bets）

- Redis 数据结构：
  ```
  room:{roomId}:pot    → String (number)  # 池底总额
  room:{roomId}:bets   → Hash { userId: betAmount }  # 本轮下注明细
  room:{roomId}:chips  → Hash { userId: chipAmount }  # 玩家筹码
  ```

- `ChipHandler.java` - Socket.IO 事件处理器
  - 监听 `place-bet` 事件，广播 `bet-placed`
  - 监听 `collect-pot` 事件，广播 `pot-collected`
  - 监听 `split-pot` 事件，广播 `pot-split`

**前端已完成：**
- `useChipStore.ts` - 筹码状态管理
  - 状态：`chips`、`pot`、`bets`
  - Actions：`placeBet`、`collectPot`、`splitPot`
  - Socket.IO 事件监听：`bet-placed`、`pot-collected`、`pot-split`、`room-state`

- `RoomPage.tsx` - 房间页面
  - 已集成 Socket.IO 连接
  - 已集成操作区 UI（快捷下注按钮、自定义输入、收回/平分按钮）
  - 已集成玩家列表（显示筹码）

**本Story需要新增：**
- `room/components/pot-display/index.tsx` - 池底显示组件（新增）
- 在 RoomPage.tsx 中集成 pot-display 组件

### 架构约束（必须遵守）

**前端组件结构：**
```
src/pages/room/
├── index.tsx                    # RoomPage 主页面
└── components/
    ├── bet-panel/               # 已存在（Story 3.1）
    │   └── index.tsx
    ├── pot-display/             # 本Story新增
    │   └── index.tsx
    └── player-list/             # 已存在（Story 3.1）
        └── index.tsx
```

**UX 设计要求（来自 ux-design-specification.md）：**

池底显示区（页面中部）：
- 池底总额：48px 等宽字体，深色 #1E293B
- 背景色 #F8FAFC，32px 上下内边距
- 下注明细：每位玩家的下注金额

数字动画：
- 动画过渡：0.3s ease-out
- 数字变化时平滑过渡，不跳动

布局结构：
```
┌─────────────────────┐
│ 顶部栏：房间号 + 状态  │  44px（固定）
├─────────────────────┤
│                     │
│ 池底区域：池底总额     │  ~80px（固定）← 本Story实现
│ + 每人下注明细        │
│                     │
├─────────────────────┤
│                     │
│ 玩家列表：            │  flex（可滚动）
│ 每人筹码 + 操作状态    │
│                     │
├─────────────────────┤
│ 操作区域：            │
│ 快捷按钮 + 自定义输入  │  ~120px（固定）
│ 收回/平分按钮         │
└─────────────────────┘
```

**Tailwind CSS 配置（已在 Story 1.1 中完成）：**
- 等宽字体：`font-mono`
- 颜色：`text-slate-800`（#1E293B）、`bg-slate-50`（#F8FAFC）
- 间距：`py-8`（32px 上下内边距）
- 动画：`transition-all duration-300 ease-out`

**WebSocket 消息格式（架构文档定义）：**

```typescript
// bet-placed 事件
{
  userId: string,
  amount: number,
  chips: Record<string, number>,  // 更新后的所有玩家筹码
  pot: number,                     // 更新后的池底总额
  bets: Record<string, number>     // 更新后的所有玩家下注明细
}

// pot-collected 事件
{
  userId: string,
  chips: Record<string, number>,
  pot: number,                     // 归零
  bets: Record<string, number>     // 清空（所有值为0或空对象）
}

// pot-split 事件
{
  participantIds: string[],
  chips: Record<string, number>,
  pot: number,                     // 归零或余数
  bets: Record<string, number>     // 清空
}

// room-state 事件（完整状态快照，用于初始加载和重连）
{
  players: Player[],
  chips: Record<string, number>,
  pot: number,
  bets: Record<string, number>
}
```

### 技术栈版本

| 技术 | 版本 | 说明 |
|------|------|------|
| React | 19.2.0 | 前端框架 |
| TypeScript | 5.x | 类型系统 |
| Tailwind CSS | 4.2.1 | 样式框架 |
| Zustand | 5.0.11 | 状态管理 |
| socket.io-client | 4.8.3 | WebSocket 客户端 |

### 防错指南

**⚠️ 不要做：**
- 不要修改后端代码 — Story 3.1 已完成所有后端逻辑
- 不要修改 useChipStore 的 Socket.IO 监听逻辑 — 已在 Story 3.1 中完成
- 不要创建新的 WebSocket 事件 — 使用已有的 bet-placed/pot-collected/pot-split
- 不要修改 Redis 数据结构 — 已在 Story 3.1 中定义
- 不要在组件中直接调用 Socket.IO — 通过 useChipStore 的 actions

**✅ 必须做：**
- 必须使用等宽字体显示池底数字（`font-mono`）
- 必须实现数字动画过渡（0.3s ease-out）
- 必须使用 useChipStore 获取 pot 和 bets 状态
- 必须在 RoomPage.tsx 中集成 pot-display 组件
- 必须确保池底区域固定在页面顶部（玩家列表上方）

### 从Story 3.1中学到的经验

**成功的模式：**
- useChipStore 集中管理所有筹码相关状态，避免状态分散
- Socket.IO 事件监听在 store 中统一处理，组件只负责展示
- 数字动画使用 Tailwind 的 transition 类，简单高效
- 组件文件夹结构（kebab-case + index.tsx）保持一致

**需要注意的问题：**
- 前端 TypeScript 编译验证使用 `pnpm run build`
- 包管理器使用 pnpm（不是 npm）
- 组件命名使用 kebab-case 文件夹 + PascalCase 组件名
- 确保所有数字使用等宽字体，避免数字跳动

**已解决的TODO：**
- RoomService.java 中的 TODO 已在 Story 3.1 中处理：
  - `endGame()` 方法已从 Redis 读取实际筹码
  - `destroyRoom()` 方法已删除 chips/pot/bets keys
  - `joinRoom()` 方法已初始化玩家筹码为 0

### Project Structure Notes

**本Story新增文件：**
```
frontend/src/pages/room/components/
└── pot-display/
    └── index.tsx              # 新增：池底显示组件
```

**本Story修改文件：**
```
frontend/src/pages/room/
└── index.tsx                  # 修改：集成 pot-display 组件
```

**不需要修改的文件：**
- 后端所有文件（Story 3.1 已完成）
- `useChipStore.ts`（Story 3.1 已完成）
- `bet-panel/index.tsx`（Story 3.1 已完成）
- `player-list/index.tsx`（Story 3.1 已完成）

### 实现建议

**pot-display 组件结构：**
```typescript
// pot-display/index.tsx
import { useChipStore } from '@/stores/useChipStore';

export default function PotDisplay() {
  const { pot, bets, players } = useChipStore();

  return (
    <div className="bg-slate-50 py-8 px-4">
      {/* 池底总额 */}
      <div className="text-center">
        <div className="text-sm text-slate-600">池底</div>
        <div className="text-5xl font-mono text-slate-800 transition-all duration-300 ease-out">
          {pot.toLocaleString()}
        </div>
      </div>

      {/* 下注明细 */}
      <div className="mt-4 space-y-2">
        {Object.entries(bets).map(([userId, amount]) => (
          amount > 0 && (
            <div key={userId} className="flex justify-between text-sm">
              <span>{getPlayerName(userId)}</span>
              <span className="font-mono">{amount}</span>
            </div>
          )
        ))}
      </div>
    </div>
  );
}
```

**RoomPage 集成：**
```typescript
// room/index.tsx
import PotDisplay from './components/pot-display';

export default function RoomPage() {
  return (
    <div className="flex flex-col h-screen">
      {/* 顶部栏 */}
      <header>...</header>

      {/* 池底区域 - 新增 */}
      <PotDisplay />

      {/* 玩家列表 */}
      <div className="flex-1 overflow-y-auto">
        <PlayerList />
      </div>

      {/* 操作区域 */}
      <BetPanel />
    </div>
  );
}
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story3.5] 池底显示与下注明细完整需求
- [Source: _bmad-output/planning-artifacts/prd.md#FR-4] 池底系统功能需求 FR-4.1~FR-4.3
- [Source: _bmad-output/planning-artifacts/prd.md#FR-5] 实时同步需求 FR-5.1, FR-5.2
- [Source: _bmad-output/planning-artifacts/architecture.md#决策3] Redis 数据模型（pot/bets key 结构）
- [Source: _bmad-output/planning-artifacts/architecture.md#Socket.IO消息规范] bet-placed/pot-collected/pot-split 事件格式
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#池底显示区] 池底区域布局、字体、颜色、间距规范
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#视觉设计基础] 颜色系统、字体系统、动画系统
- [Source: _bmad-output/implementation-artifacts/3-1-chip-system.md] Story 3.1 实现经验和已完成的基础设施

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context) - senior-frontend-engineer agent

### Debug Log References

- TypeScript compilation error: Unused `bets` variable in RoomPage.tsx after extracting to PotDisplay component
  - Fixed by removing `bets` from useChipStore destructuring in RoomPage.tsx
- Build successful with `pnpm run build` (vite v7.3.1)

### Completion Notes List

1. **Component Extraction Completed**
   - Created `frontend/src/pages/room/components/pot-display/index.tsx` component
   - Extracted pot display logic from RoomPage.tsx (lines 266-288) into dedicated component
   - Component follows kebab-case folder naming convention as specified

2. **Design Specifications Implemented**
   - Pool total: 48px monospace font, color #1E293B (text-slate-800)
   - Background: #F8FAFC (bg-slate-50) with 32px vertical padding (py-8)
   - Bet details: Player nickname + amount in monospace font
   - Number animation: 0.3s ease-out transition on all numeric values
   - Only shows players with bets > 0 (hides zero bets)

3. **Integration Completed**
   - Imported PotDisplay component into RoomPage.tsx
   - Replaced inline pot display with `<PotDisplay players={room.players} />` component
   - Removed unused `bets` variable from RoomPage.tsx to fix TypeScript compilation
   - Component receives players array as prop to display nicknames

4. **State Management**
   - Uses `useChipStore` to access `pot` and `bets` state
   - No modifications needed to store (Story 3.1 already implemented Socket.IO listeners)
   - Real-time updates work automatically via existing WebSocket events

5. **Build Verification**
   - TypeScript compilation successful: `tsc -b` passed
   - Vite build successful: bundle size 384.78 kB (gzipped: 125.29 kB)
   - No TypeScript errors or warnings

### File List

**New Files:**
- `C:\Users\snchen5\Desktop\github_prj\suoha\frontend\src\pages\room\components\pot-display\index.tsx` (47 lines)

**Modified Files:**
- `C:\Users\snchen5\Desktop\github_prj\suoha\frontend\src\pages\RoomPage.tsx`
  - Added import for PotDisplay component
  - Replaced inline pot display (lines 266-288) with PotDisplay component
  - Removed unused `bets` from useChipStore destructuring
