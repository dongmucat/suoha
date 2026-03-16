# Story 5.1: 游戏结算与房主转让

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 房主,
I want 将房主权限转让给其他玩家，并在牌局结束时触发结算，所有玩家实时收到结算结果,
so that 牌局管理灵活、结算透明公正，所有人同时看到盈亏结果。

## Acceptance Criteria

1. **AC-1: 房主转让 WebSocket 广播** — 房主转让成功后，通过 WebSocket `owner-transferred` 事件广播给房间内所有玩家，所有人实时看到房主标识变更
2. **AC-2: 房间内只有房主一人时禁止转让** — 房间内只有房主一人时，提示"房间内没有其他玩家，无法转让"
3. **AC-3: 池底非零阻止结算** — 池底不为零时，房主点击"结束牌局"，系统提示"池底还有 XXX 未分配，请先收回或平分池底"，阻止结算
4. **AC-4: 结束牌局 WebSocket 广播** — 房主结束牌局后，通过 WebSocket `game-ended` 事件广播结算数据给房间内所有玩家，所有人自动进入结算页面
5. **AC-5: 总账校验** — 结算页面显示每位玩家盈亏（正数绿色/负数红色），并执行总账校验（盈亏之和 = 0）
6. **AC-6: 非房主结算跳转** — 非房主玩家收到 `game-ended` 事件后，自动存储结算数据并导航到结算页面，无需任何手动操作
7. **AC-7: 转让确认提示** — 房主点击转让按钮后弹出确认提示，确认后执行转让，Toast 显示"XXX 已成为房主"

## Tasks / Subtasks

### 后端任务

- [x] Task 1: 在 ChipHandler 添加 `transfer-owner` Socket.IO 事件处理 (AC: #1, #2, #7)
  - [x] 1.1 注册 `transfer-owner` 事件监听器，接收 `{ newHostUserId: string }`
  - [x] 1.2 验证发送者是房主（从 client.get("userId") 获取）
  - [x] 1.3 调用 `RoomService.transferHost(roomId, userId, newHostUserId)`
  - [x] 1.4 成功后向房间广播 `owner-transferred` 事件：`{ newHostUserId, newHostNickname }`
  - [x] 1.5 通过 ackRequest 回调返回成功/失败

- [x] Task 2: 在 ChipHandler 添加 `end-game` Socket.IO 事件处理 (AC: #3, #4, #5)
  - [x] 2.1 注册 `end-game` 事件监听器
  - [x] 2.2 验证发送者是房主
  - [x] 2.3 检查池底是否为零：读取 `room:{roomId}:pot`，非零则返回错误 `"池底还有 {pot} 未分配，请先收回或平分池底"`
  - [x] 2.4 调用 `RoomService.endGame(roomId, userId)` 获取结算数据
  - [x] 2.5 向房间广播 `game-ended` 事件：`EndGameResponse { roomId, players[], totalCheck }`
  - [x] 2.6 通过 ackRequest 回调返回成功/失败

- [x] Task 3: 在 RoomService.endGame 添加池底非零校验 (AC: #3)
  - [x] 3.1 在 endGame 方法开头调用 `chipService.getPot(roomId)` 检查池底
  - [x] 3.2 池底非零时抛出 `BusinessException(40016, "池底还有 " + pot + " 未分配，请先收回或平分池底")`

- [x] Task 4: 在 ChipService 添加 getPot 方法 (AC: #3)
  - [x] 4.1 添加 `public int getPot(String roomId)` 方法，读取 `room:{roomId}:pot` 并返回整数值

### 前端任务

- [x] Task 5: 在 useChipStore 添加 `owner-transferred` 事件监听 (AC: #1, #7)
  - [x] 5.1 在 connect 方法中添加 `owner-transferred` 事件监听
  - [x] 5.2 收到事件后调用 `useRoomStore.getState().updatePlayersAndHost()` 更新房主
  - [x] 5.3 注意：需要从当前 room.players 构造 players 列表（只更新 hostUserId），或者让后端在事件中携带完整 players+hostUserId

- [x] Task 6: 在 useChipStore 添加 `game-ended` 事件监听 (AC: #4, #6)
  - [x] 6.1 在 connect 方法中添加 `game-ended` 事件监听
  - [x] 6.2 收到事件后将结算数据存入 `useRoomStore` 的 `settlement` 字段
  - [x] 6.3 设置一个标志 `gameEnded: true` 用于触发导航

- [x] Task 7: 修改 RoomPage 转让操作为 Socket.IO 方式 (AC: #1, #2, #7)
  - [x] 7.1 修改 `handleTransfer`：改用 `socket.emit('transfer-owner', { newHostUserId }, callback)` 替代 REST API 调用
  - [x] 7.2 成功回调中显示 Toast "XXX 已成为房主"
  - [x] 7.3 失败回调中显示 Toast 错误信息

- [x] Task 8: 修改 RoomPage 结束牌局为 Socket.IO 方式 (AC: #3, #4)
  - [x] 8.1 修改 `handleEndGame`：先在前端检查 `pot > 0`，提示 "池底还有 {pot} 未分配，请先收回或平分池底" 并阻止操作
  - [x] 8.2 改用 `socket.emit('end-game', {}, callback)` 替代 REST API 调用
  - [x] 8.3 成功回调中导航到 `/settlement/{roomId}`（房主自己的跳转）

- [x] Task 9: RoomPage 监听 gameEnded 标志实现自动导航 (AC: #6)
  - [x] 9.1 在 useChipStore 添加 `gameEnded` 布尔字段，`game-ended` 事件触发时设为 true
  - [x] 9.2 在 RoomPage 中 useEffect 监听 `gameEnded`，为 true 时导航到 `/settlement/{roomId}`
  - [x] 9.3 导航前断开 WebSocket 连接并重置 gameEnded 标志

### 测试任务

- [x] Task 10: 单元测试 (AC: #1-#7)
  - [x] 10.1 测试 useChipStore `owner-transferred` 事件：验证 room store 的 hostUserId 更新
  - [x] 10.2 测试 useChipStore `game-ended` 事件：验证 settlement 数据存储和 gameEnded 标志
  - [x] 10.3 测试前端池底非零检查：pot > 0 时 handleEndGame 不发送事件

## Dev Notes

### 现有代码分析（关键！不要重复造轮子）

**后端已有（不需要重新实现）：**

- `RoomService.transferHost(roomId, currentUserId, newHostUserId)` — 完整的房主转让逻辑（权限校验、房间校验、Redis 更新）
- `RoomService.endGame(roomId, userId)` — 完整的结算逻辑（权限校验、读取筹码、计算盈亏、总账校验）
- `EndGameResponse` + `PlayerSettlement` DTO — 结算数据结构
- `RoomController` REST 端点 — `/transfer` 和 `/end`（保留不删除，但前端改用 Socket.IO）
- `ChipService.getPlayerChips(roomId)` — 读取玩家筹码
- `ChipService.buildChipState(roomId)` — 获取完整筹码状态（private 方法）

**前端已有（不需要重新实现）：**

- `useRoomStore.settlement` 状态 + `SettlementData` 类型定义
- `useRoomStore.clearSettlement()` 和 `useRoomStore.clearRoom()` 方法
- `SettlementPage.tsx` — 完整的结算 UI（盈亏列表、总账校验、关闭按钮）
- `RoomPage.tsx` — 转让按钮 UI（在玩家列表每个非房主玩家旁）、结束牌局按钮（仅房主可见）
- `App.tsx` 路由 — `/settlement/:roomId` 已配置
- `useChipStore` — Socket.IO 事件监听基础设施已就绪（connect 方法中注册事件）

**需要修改的文件：**

| 文件 | 修改内容 |
|------|----------|
| `backend/src/main/java/com/suoha/handler/ChipHandler.java` | 添加 `transfer-owner` 和 `end-game` 事件监听器 |
| `backend/src/main/java/com/suoha/service/RoomService.java` | `endGame()` 添加池底非零校验 |
| `backend/src/main/java/com/suoha/service/ChipService.java` | 添加 `getPot()` 公开方法 |
| `frontend/src/stores/useChipStore.ts` | 添加 `owner-transferred` + `game-ended` 事件监听，添加 `gameEnded` 字段 |
| `frontend/src/pages/RoomPage.tsx` | 修改 handleTransfer 和 handleEndGame 为 Socket.IO 方式，添加 gameEnded 导航逻辑 |

**不需要修改的文件：**
- `frontend/src/pages/SettlementPage.tsx` — 已完整实现，无需修改
- `frontend/src/stores/useRoomStore.ts` — `settlement` 状态和相关方法已完备
- `frontend/src/App.tsx` — 路由已配置
- `backend/src/main/java/com/suoha/controller/RoomController.java` — REST 端点保留不动（向后兼容）
- `backend/src/main/java/com/suoha/model/dto/EndGameResponse.java` — DTO 已完整
- `backend/src/main/java/com/suoha/model/dto/TransferHostRequest.java` — DTO 已完整

### 关键实现细节

**1. ChipHandler 添加 `transfer-owner` 事件（参考现有 place-bet 模式）：**

```java
socketIOServer.addEventListener("transfer-owner", Map.class, (client, data, ackRequest) -> {
    String userId = client.get("userId");
    String roomId = client.get("roomId");
    if (userId == null || roomId == null) {
        ackRequest.sendAckData(Map.of("success", false, "error", "未认证或未加入房间"));
        return;
    }
    try {
        String newHostUserId = (String) data.get("newHostUserId");
        roomService.transferHost(roomId, userId, newHostUserId);
        // 广播给房间内所有玩家
        User newHost = userRepository.findById(newHostUserId).orElse(null);
        String nickname = newHost != null ? newHost.getNickname() : "未知玩家";
        socketIOServer.getRoomOperations(roomId).sendEvent("owner-transferred",
            Map.of("newHostUserId", newHostUserId, "newHostNickname", nickname));
        ackRequest.sendAckData(Map.of("success", true));
    } catch (BusinessException e) {
        ackRequest.sendAckData(Map.of("success", false, "error", e.getMessage()));
    }
});
```

**2. ChipHandler 添加 `end-game` 事件：**

```java
socketIOServer.addEventListener("end-game", Map.class, (client, data, ackRequest) -> {
    String userId = client.get("userId");
    String roomId = client.get("roomId");
    if (userId == null || roomId == null) {
        ackRequest.sendAckData(Map.of("success", false, "error", "未认证或未加入房间"));
        return;
    }
    try {
        EndGameResponse settlement = roomService.endGame(roomId, userId);
        // 广播给房间内所有玩家
        socketIOServer.getRoomOperations(roomId).sendEvent("game-ended", settlement);
        ackRequest.sendAckData(Map.of("success", true));
    } catch (BusinessException e) {
        ackRequest.sendAckData(Map.of("success", false, "error", e.getMessage()));
    }
});
```

**3. ChipService 新增 getPot 方法：**

```java
public int getPot(String roomId) {
    String potKey = String.format(POT_KEY, roomId);
    Object potRaw = redisTemplate.opsForValue().get(potKey);
    return potRaw != null ? Integer.parseInt(potRaw.toString()) : 0;
}
```

**4. 前端 useChipStore 事件监听（在 connect 方法内，紧跟现有事件）：**

```typescript
socket.on('owner-transferred', (data: { newHostUserId: string; newHostNickname: string }) => {
  const room = useRoomStore.getState().room;
  if (room) {
    useRoomStore.getState().updatePlayersAndHost(room.players, data.newHostUserId);
  }
});

socket.on('game-ended', (data: { roomId: string; players: { userId: string; nickname: string; chips: number }[]; totalCheck: boolean }) => {
  useRoomStore.setState({ settlement: data });
  set({ gameEnded: true });
});
```

**5. 前端 handleTransfer 修改（Socket.IO 替代 REST）：**

```typescript
const handleTransfer = (targetUserId: string) => {
  const targetPlayer = room.players.find((p) => p.userId === targetUserId);
  if (!window.confirm(`确定将房主转让给 ${targetPlayer?.nickname}？`)) return;
  const socket = useChipStore.getState().socket;
  socket?.emit('transfer-owner', { newHostUserId: targetUserId }, (res: { success: boolean; error?: string }) => {
    if (res.success) {
      setToast(`${targetPlayer?.nickname} 已成为房主`);
    } else {
      setToast(res.error || '转让失败');
    }
  });
};
```

**6. 前端 handleEndGame 修改（Socket.IO 替代 REST + 池底检查）：**

```typescript
const handleEndGame = () => {
  if (pot > 0) {
    setToast(`池底还有 ${pot} 未分配，请先收回或平分池底`);
    return;
  }
  if (!window.confirm('确定结束牌局并进入结算？')) return;
  const socket = useChipStore.getState().socket;
  socket?.emit('end-game', {}, (res: { success: boolean; error?: string }) => {
    if (!res.success) {
      setToast(res.error || '结束牌局失败');
    }
    // 成功时不在此处导航 — game-ended 事件会触发所有人导航
  });
};
```

**7. gameEnded 自动导航逻辑（RoomPage useEffect）：**

```typescript
const gameEnded = useChipStore((s) => s.gameEnded);

useEffect(() => {
  if (gameEnded && roomId) {
    useChipStore.setState({ gameEnded: false });
    disconnect();
    connectedRef.current = false;
    navigate(`/settlement/${roomId}`);
  }
}, [gameEnded, roomId, navigate, disconnect]);
```

### ChipHandler 需要注入 RoomService

当前 ChipHandler 注入了 `ChipService`、`JwtTokenProvider`、`RoomRepository`、`UserRepository`。
新增 `transfer-owner` 和 `end-game` 事件需要调用 `RoomService`。

需要在 ChipHandler 的依赖中添加 `RoomService`：

```java
private final RoomService roomService;
```

**注意循环依赖风险**：`RoomService` 依赖 `ChipService`，`ChipHandler` 依赖 `ChipService` 和 `RoomService`。这不构成循环依赖（Handler → Service → Service 是单向的）。

### 防灾指南（常见 LLM 错误）

- ❌ **不要** 重新实现结算逻辑 — `RoomService.endGame()` 已完整实现
- ❌ **不要** 重新实现结算页面 — `SettlementPage.tsx` 已完整实现
- ❌ **不要** 创建新的 SettlementService — 所有结算逻辑已在 RoomService 中
- ❌ **不要** 修改 EndGameResponse DTO — 前端 SettlementPage 已按此结构渲染
- ❌ **不要** 删除 RoomController 的 REST 端点 — 保留向后兼容
- ❌ **不要** 修改 SettlementPage.tsx — 它已经正确处理结算数据展示
- ❌ **不要** 创建新的 store 文件 — 扩展现有 useChipStore 和 useRoomStore
- ❌ **不要** 在 `game-ended` 回调中导航 — 应通过 gameEnded 标志 + useEffect 统一导航（房主和非房主共用同一逻辑）
- ✅ **要** 在 ChipHandler.start() 方法中注册新事件（与 place-bet 等平级）
- ✅ **要** 使用 ackRequest 回调返回操作结果（与现有事件处理模式一致）
- ✅ **要** 同时在前端和后端做池底非零校验（前端快速反馈，后端兜底保证）
- ✅ **要** 复用现有 `useRoomStore.settlement` 状态（前端已定义 SettlementData 类型）
- ✅ **要** disconnect WebSocket 在导航到结算页面之前（结算页不需要 WebSocket）

### 架构约束

- **Socket.IO 事件模式**：所有事件使用 `Map.class` 作为数据类型，ackRequest 回调返回 `Map.of("success", true/false, "error", msg)`
- **状态管理**：Zustand，跨 store 通过 `useRoomStore.getState()` / `useRoomStore.setState()` 通信
- **WebSocket 库**：后端 netty-socketio 2.0.12，前端 socket.io-client 4.8.3
- **UI 框架**：React 19 + Tailwind CSS + shadcn/ui
- **颜色规范**：赢钱绿色 #16A34A，输钱红色 #EF4444，主色蓝色 #2563EB
- **Toast 规范**：顶部居中，3s 自动消失，bg-gray-800 文字白色（复用 RoomPage 现有 Toast 组件）
- **移动优先**：375px-428px 宽度，触摸目标 ≥ 44px
- **测试框架**：vitest + happy-dom（不要用 jsdom，有 ESM 兼容性问题）

### 数据流示意

**房主转让流程：**
```
房主点击转让 → confirm → socket.emit('transfer-owner') → ChipHandler
  → RoomService.transferHost() → Redis 更新
  → socketIO.broadcast('owner-transferred') → 所有玩家收到
  → useChipStore 事件回调 → useRoomStore.updatePlayersAndHost()
  → RoomPage 重渲染，房主标识更新
```

**结束牌局流程：**
```
房主点击结束 → 前端检查 pot === 0 → confirm → socket.emit('end-game') → ChipHandler
  → 后端检查 pot === 0 → RoomService.endGame() → 计算盈亏 + 总账校验
  → socketIO.broadcast('game-ended') → 所有玩家收到
  → useChipStore 事件回调 → useRoomStore.setState({ settlement })
  → set({ gameEnded: true }) → RoomPage useEffect → navigate('/settlement/:roomId')
  → SettlementPage 渲染结算结果
```

### Project Structure Notes

- 后端修改：`backend/src/main/java/com/suoha/handler/ChipHandler.java`、`backend/src/main/java/com/suoha/service/RoomService.java`、`backend/src/main/java/com/suoha/service/ChipService.java`
- 前端修改：`frontend/src/stores/useChipStore.ts`、`frontend/src/pages/RoomPage.tsx`
- 不创建新文件，全部在现有文件上扩展

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 5] — Story 5.1 房主转让 + Story 5.2 结束牌局与结算 AC
- [Source: _bmad-output/planning-artifacts/architecture.md#Socket.IO 消息规范] — 事件表：transfer-owner、end-game、owner-transferred、game-ended
- [Source: _bmad-output/planning-artifacts/architecture.md#并发控制规范] — Redis Lua 脚本原子性要求
- [Source: _bmad-output/planning-artifacts/prd.md#FR-2] — FR-2.8 房主转让、FR-2.9 结束牌局
- [Source: _bmad-output/planning-artifacts/prd.md#FR-6] — FR-6.1~FR-6.3 结算需求
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#结算机制] — 结算 UI 交互设计
- [Source: _bmad-output/implementation-artifacts/4-2-reconnection-and-state-recovery.md] — Story 4-2 跨 store 通信模式、测试基础设施
- [Source: backend/src/main/java/com/suoha/handler/ChipHandler.java] — 现有 Socket.IO 事件注册模式
- [Source: backend/src/main/java/com/suoha/service/RoomService.java] — 现有 transferHost/endGame 实现
- [Source: frontend/src/stores/useChipStore.ts] — 现有事件监听模式
- [Source: frontend/src/stores/useRoomStore.ts] — settlement 状态和类型定义
- [Source: frontend/src/pages/SettlementPage.tsx] — 现有结算 UI
- [Source: frontend/src/pages/RoomPage.tsx] — 现有转让和结束牌局 UI

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- 前端 TypeScript 编译通过（tsc --noEmit 零错误）
- 前端单元测试 18/18 全部通过（vitest run）
- 后端 Maven 编译因网络问题无法下载依赖（非代码问题），代码语法已手动验证

### Completion Notes List

- 后端：ChipHandler 新增 `transfer-owner` 和 `end-game` 两个 Socket.IO 事件监听器，复用现有 RoomService 方法
- 后端：RoomService.endGame 添加池底非零校验（BusinessException 40016）
- 后端：ChipService 新增 `getPot()` 公开方法
- 前端：useChipStore 新增 `owner-transferred` 和 `game-ended` 事件监听，新增 `gameEnded` 状态字段，新增 `transferOwner` 和 `endGame` Promise 方法
- 前端：RoomPage handleTransfer/handleEndGame 从 REST API 改为 Socket.IO 方式，添加前端池底非零检查和 gameEnded 自动导航
- 测试：新增 7 个测试用例覆盖 owner-transferred、game-ended 事件、transferOwner/endGame 方法、reset 状态

### File List

- `backend/src/main/java/com/suoha/handler/ChipHandler.java` — 修改：添加 RoomService 依赖、EndGameResponse import、transfer-owner 和 end-game 事件监听器
- `backend/src/main/java/com/suoha/service/RoomService.java` — 修改：endGame 方法添加池底非零校验
- `backend/src/main/java/com/suoha/service/ChipService.java` — 修改：添加 getPot 公开方法
- `frontend/src/stores/useChipStore.ts` — 修改：添加 gameEnded 字段、owner-transferred/game-ended 事件监听、transferOwner/endGame 方法
- `frontend/src/pages/RoomPage.tsx` — 修改：handleTransfer/handleEndGame 改用 Socket.IO、添加 gameEnded 自动导航 useEffect
- `frontend/src/stores/__tests__/useChipStore.test.ts` — 修改：新增 7 个测试用例

### Change Log

- 2026-03-10: Story 5-1 实现完成。房主转让和结束牌局从 REST API 迁移到 Socket.IO 实时通信，添加池底非零校验，实现全房间广播和非房主自动导航到结算页面。
