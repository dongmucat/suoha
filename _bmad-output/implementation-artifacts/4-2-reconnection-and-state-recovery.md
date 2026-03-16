# Story 4.2: 重连后状态恢复

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 玩家,
I want 重连后完整恢复之前的游戏状态,
so that 掉线不会影响我的游戏体验和数据完整性。

## Acceptance Criteria

1. **AC-1: 筹码状态恢复** — 玩家掉线后重连成功，筹码数据（chips）与当前服务端状态一致
2. **AC-2: 池底与下注明细恢复** — 重连后池底总额（pot）和每位玩家的下注明细（bets）与当前服务端状态一致
3. **AC-3: 玩家列表恢复** — 重连后玩家列表与当前房间状态一致（包含掉线期间加入/离开的玩家）
4. **AC-4: 房主标识恢复** — 重连后房主标识（hostUserId）正确显示，即使掉线期间发生了房主转让
5. **AC-5: 掉线期间操作同步** — 玩家掉线期间其他玩家执行了操作（下注、收回、平分），重连后系统推送最新完整房间状态快照，玩家看到的数据与其他在线玩家完全一致
6. **AC-6: 玩家加入/离开实时更新** — 收到 player-joined / player-left WebSocket 事件时，前端实时更新玩家列表（不依赖手动刷新）

## Tasks / Subtasks

### 前端任务

- [x] Task 1: 增强 room-state 事件处理，同步更新 useRoomStore (AC: #1, #2, #3, #4, #5)
  - [x] 1.1 修改 `useChipStore.ts` 中 `room-state` 事件监听：除 chips/pot/bets 外，提取 players 和 hostUserId
  - [x] 1.2 在 `room-state` 回调中调用 useRoomStore 更新 room.players 和 room.hostUserId
  - [x] 1.3 在 `useRoomStore` 中添加 `updatePlayersAndHost(players, hostUserId)` 方法，用于 WebSocket 事件驱动的局部更新

- [x] Task 2: 监听 player-joined / player-left 事件，实时更新玩家列表 (AC: #6)
  - [x] 2.1 在 `useChipStore.ts` 的 connect 方法中添加 `player-joined` 事件监听
  - [x] 2.2 收到 `player-joined` 时，将新玩家信息追加到 useRoomStore 的 players 列表
  - [x] 2.3 在 `useChipStore.ts` 的 connect 方法中添加 `player-left` 事件监听
  - [x] 2.4 收到 `player-left` 时，从 useRoomStore 的 players 列表中移除该玩家

- [x] Task 3: 补全 Story 4-1 遗留的重连增强功能 (AC: #5)
  - [x] 3.1 在 `useChipStore` 中添加 `reconnectAttempts` 计数字段，`reconnect_attempt` 时递增，`connect`/`reconnect_failed` 时重置
  - [x] 3.2 添加 `manualReconnect()` 方法：断开当前 socket 并用原始 token/roomId 重新调用 `connectSocket()`
  - [x] 3.3 在 `useChipStore` 中存储 `_token` 和 `_roomId` 供 manualReconnect 使用

- [x] Task 4: 重连失败 UI 与手动重试 (AC: #5)
  - [x] 4.1 在 RoomPage 中：当 `connected === false` 且 `reconnecting === false`（即重连失败）时，显示全屏半透明遮罩
  - [x] 4.2 遮罩内容："网络连接失败，请检查网络后点击重试" + 重试按钮
  - [x] 4.3 点击重试按钮调用 `useChipStore.manualReconnect()`

- [x] Task 5: 重连成功 Toast 通知 (AC: #5)
  - [x] 5.1 在 `useChipStore` 的 `reconnect` 事件回调中设置一个标志 `justReconnected: true`
  - [x] 5.2 在 RoomPage 中监听 `justReconnected`，为 true 时显示 Toast "已重新连接"（3s 自动消失），然后重置标志

### 测试任务

- [x] Task 6: 单元测试 (AC: #1-#6)
  - [x] 6.1 测试 `useRoomStore.updatePlayersAndHost()` 正确更新 players 和 hostUserId
  - [x] 6.2 测试 `useChipStore` 的 `room-state` 事件处理：验证 chips/pot/bets/players/hostUserId 全部同步
  - [x] 6.3 测试 `player-joined` 事件：验证新玩家被追加到列表
  - [x] 6.4 测试 `player-left` 事件：验证玩家被从列表移除
  - [x] 6.5 测试 `manualReconnect()` 方法：验证断开并重新连接
  - [x] 6.6 测试 `reconnectAttempts` 计数逻辑

## Dev Notes

### 现有代码分析（关键！不要重复造轮子）

**后端已完全就绪，本 Story 无需修改后端代码：**

- `ChipHandler.java` (`backend/src/main/java/com/suoha/handler/ChipHandler.java`)
  - `onConnect()` 已在连接/重连时调用 `buildFullRoomState()` 并发送 `room-state` 事件
  - `buildFullRoomState()` 返回完整状态：`{ chips, pot, bets, players: [{userId, nickname}], hostUserId }`
  - `broadcastPlayerJoined()` 已广播 `player-joined` 事件：`{ userId, nickname }`
  - `broadcastPlayerLeft()` 已广播 `player-left` 事件：`{ userId }`
  - 重复连接处理已实现（踢掉旧连接，保留新连接）

**前端需要修改的文件：**

1. **`frontend/src/stores/useChipStore.ts`** — 核心修改点
   - 当前 `room-state` 监听只提取 `{ chips, pot, bets }`，**忽略了 `players` 和 `hostUserId`**
   - 需要添加 `player-joined` 和 `player-left` 事件监听
   - 需要添加 `reconnectAttempts`、`manualReconnect()`、`justReconnected` 等字段/方法
   - 需要存储 `_token` 和 `_roomId` 供重连使用

2. **`frontend/src/stores/useRoomStore.ts`** — 添加局部更新方法
   - 当前只有 `fetchRoomInfo(roomId)` 通过 REST API 获取房间信息
   - 需要添加 `updatePlayersAndHost(players, hostUserId)` 方法，用于 WebSocket 事件驱动的更新
   - 需要添加 `addPlayer(player)` 和 `removePlayer(userId)` 方法

3. **`frontend/src/pages/RoomPage.tsx`** — UI 增强
   - 已有 `Toast` 组件（顶部居中，3s 自动消失）
   - 已有连接状态指示器（绿色/黄色/红色圆点）
   - 需要添加重连失败遮罩 UI
   - 需要添加重连成功 Toast

**前端不需要修改的文件：**
- `frontend/src/lib/socket.ts` — 重连配置已在 Story 4-1 中完成（reconnection: true, reconnectionAttempts: 5, reconnectionDelay: 1000）

### 关键实现细节

**1. room-state 事件数据结构（后端已定义）：**
```typescript
interface RoomStateEvent {
  chips: Record<string, number>;    // userId -> chipCount
  pot: number;                       // 池底总额
  bets: Record<string, number>;     // userId -> betAmount
  players: { userId: string; nickname: string }[];  // 玩家列表
  hostUserId: string;                // 房主 ID
}
```

**2. player-joined 事件数据结构：**
```typescript
interface PlayerJoinedEvent {
  userId: string;
  nickname: string;
}
```

**3. player-left 事件数据结构：**
```typescript
interface PlayerLeftEvent {
  userId: string;
}
```

**4. useChipStore 与 useRoomStore 跨 Store 通信：**
- 在 `useChipStore` 的事件回调中直接调用 `useRoomStore.getState().updatePlayersAndHost()`
- Zustand 支持跨 store 调用：`useRoomStore.getState()` 可在任何地方使用
- 这是 Zustand 推荐的跨 store 通信模式

**5. manualReconnect 实现要点：**
- 存储原始 token 和 roomId（在 connect 方法中保存）
- manualReconnect 调用 `disconnectSocket()` 然后 `connectSocket(token, roomId)`
- 重新绑定所有事件监听（复用 connect 方法逻辑）

**6. 重连失败遮罩触发条件：**
- `connected === false && reconnecting === false && socket !== null`
- socket !== null 表示曾经连接过（排除初始加载状态）

### 从 Story 4-1 继承的上下文

Story 4-1 已完成的部分：
- ✅ 后端 ChipHandler 完整重连支持（room-state 推送、player-joined/left 广播、重复连接处理）
- ✅ 前端 Socket.IO 重连配置（reconnection: true, attempts: 5, delay: 1000）
- ✅ 前端连接状态管理（connected, reconnecting 字段）
- ✅ 前端连接状态指示器 UI（绿/黄/红圆点）
- ✅ 前端 room-state 事件监听（但只处理 chips/pot/bets）

Story 4-1 遗留未完成的部分（本 Story 需要完成）：
- ❌ Task 4.2: reconnectAttempts 计数字段
- ❌ Task 4.4: 监听 player-joined 和 player-left 事件
- ❌ Task 4.5: manualReconnect() 方法
- ❌ Task 6: 重连失败 UI 与手动重试
- ❌ Task 7: Toast 通知集成
- ❌ Task 8: 玩家列表实时更新

### 架构约束

- **状态管理**：Zustand（非 Redux），跨 store 通过 `getState()` 通信
- **WebSocket 库**：Socket.IO Client 4.8.3，后端 netty-socketio 2.0.12
- **UI 框架**：React 19 + Tailwind CSS + shadcn/ui
- **移动优先**：375px-428px 宽度，触摸目标 ≥ 44px
- **颜色规范**：已连接绿色 #16A34A，重连中黄色 #F59E0B，断开红色 #EF4444
- **Toast 规范**：顶部居中，3s 自动消失，bg-gray-800 文字白色

### 测试策略

- 使用项目现有测试框架（如有 vitest 则用 vitest）
- 单元测试重点：Zustand store 的状态更新逻辑
- 模拟 Socket.IO 事件触发，验证 store 状态变化
- 不需要 E2E 测试（本 Story 范围内）

### Project Structure Notes

- 前端源码：`frontend/src/`
- Store 文件：`frontend/src/stores/useChipStore.ts`、`frontend/src/stores/useRoomStore.ts`
- 页面文件：`frontend/src/pages/RoomPage.tsx`
- Socket 工具：`frontend/src/lib/socket.ts`
- 后端无需修改

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.2] — AC 定义
- [Source: _bmad-output/planning-artifacts/architecture.md#WebSocket 通信层] — Socket.IO 架构决策
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#交互反馈] — Toast 和连接状态 UI 规范
- [Source: _bmad-output/planning-artifacts/prd.md#FR-5] — 实时同步需求（FR-5.3, FR-5.4）
- [Source: _bmad-output/planning-artifacts/prd.md#NFR-3] — 可靠性需求（NFR-3.2 重连 ≤5s, NFR-3.3 状态恢复 100%）
- [Source: _bmad-output/implementation-artifacts/4-1-websocket-realtime-communication.md] — Story 4-1 实现记录和遗留任务

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- jsdom 28 与 vitest 4 存在 ESM 兼容性问题（ERR_REQUIRE_ESM），改用 happy-dom 解决

### Completion Notes List

- 所有 6 个 AC 均已满足：room-state 完整同步、player-joined/left 实时更新、手动重连、重连失败遮罩、重连成功 Toast
- 16 个单元测试全部通过（useRoomStore 6 个 + useChipStore 10 个）
- 后端无修改，纯前端实现
- 新增测试基础设施：vitest + happy-dom + @testing-library

### File List

- `frontend/src/stores/useChipStore.ts` — 修改：增强 room-state 处理、添加 player-joined/left 监听、reconnectAttempts、manualReconnect、justReconnected、_token/_roomId
- `frontend/src/stores/useRoomStore.ts` — 修改：添加 updatePlayersAndHost、addPlayer、removePlayer 方法
- `frontend/src/pages/RoomPage.tsx` — 修改：添加重连失败遮罩 UI、重连成功 Toast 监听
- `frontend/src/stores/__tests__/useRoomStore.test.ts` — 新增：useRoomStore 单元测试
- `frontend/src/stores/__tests__/useChipStore.test.ts` — 新增：useChipStore 单元测试
- `frontend/src/test/setup.ts` — 新增：测试 setup 文件
- `frontend/vite.config.ts` — 修改：添加 vitest 测试配置
- `frontend/package.json` — 修改：添加 test script 和测试依赖

### Change Log

- 2026-03-10: 实现 Story 4.2 全部功能 — room-state 完整状态恢复（含 players/hostUserId）、player-joined/left 实时更新、reconnectAttempts 计数、manualReconnect 手动重连、重连失败全屏遮罩 UI、重连成功 Toast 通知。新增 vitest 测试基础设施和 16 个单元测试。
