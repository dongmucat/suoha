# Story 5.2: 结算展示与数据清理

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 玩家,
I want 在结算页面看到清晰的盈亏展示，关闭结算后系统自动清理所有数据,
so that 结算结果一目了然，且不留下任何历史数据。

## Acceptance Criteria

1. **AC-1: 盈亏排序展示** — 结算页面显示每位玩家的盈亏（正数绿色/负数红色/零灰色），玩家按盈亏从高到低排序
2. **AC-2: 总账校验展示** — 结算页面显示总账校验结果（盈亏之和 = 0 为通过，显示 ✅；不通过显示 ❌）
3. **AC-3: 后端数据清理** — 点击"关闭结算"后，系统清理该房间的所有 Redis 数据（筹码 `room:{roomId}:chips`、池底 `room:{roomId}:pot`、下注明细 `room:{roomId}:bets`）、房间信息、房间号索引
4. **AC-4: 玩家状态清除** — 系统清除该房间所有玩家的 `currentRoomId`（设为 null），使玩家可以创建或加入新房间
5. **AC-5: 前端状态清除** — 前端清除所有本地状态（room store 的 room 和 settlement、chip store 的连接和状态），导航回首页
6. **AC-6: 非房主关闭结算** — 所有玩家（不仅是房主）都可以独立关闭结算页面，各自触发前端清理和后端 currentRoomId 清除

## Tasks / Subtasks

### 后端任务

- [x] Task 1: 新增 `POST /api/rooms/{roomId}/cleanup` 结算清理 API (AC: #3, #4)
  - [x] 1.1 在 `RoomController` 添加 `@PostMapping("/{roomId}/cleanup")` 端点
  - [x] 1.2 从 JWT token 获取 userId，调用 `RoomService.cleanupAfterSettlement(roomId, userId)`
  - [x] 1.3 返回标准成功响应 `{ code: 200, message: "清理完成" }`

- [x] Task 2: 在 `RoomService` 添加 `cleanupAfterSettlement` 方法 (AC: #3, #4)
  - [x] 2.1 添加 `public void cleanupAfterSettlement(String roomId, String userId)` 方法
  - [x] 2.2 查找房间：`roomRepository.findById(roomId)`，房间不存在时静默返回（幂等设计，可能已被其他玩家清理）
  - [x] 2.3 如果房间存在：清除所有玩家的 `currentRoomId`（遍历 `room.getPlayerIds()`，对每个玩家调用 `user.setCurrentRoomId(null)` + `userRepository.save(user)`）
  - [x] 2.4 调用已有的 `destroyRoom(room)` 方法销毁房间（删除房间号索引、删除房间数据、删除筹码数据）
  - [x] 2.5 如果房间不存在但 userId 有效：仅清除该玩家自己的 `currentRoomId`（兜底处理）

### 前端任务

- [x] Task 3: 优化 `SettlementPage.tsx` 结算展示 (AC: #1, #2)
  - [x] 3.1 对 `settlement.players` 按 `chips` 从高到低排序后再渲染：`[...settlement.players].sort((a, b) => b.chips - a.chips)`
  - [x] 3.2 确认颜色映射正确：正数 `text-success`（绿色）、负数 `text-error`（红色）、零 `text-text-secondary`（灰色）— 将零值从 `text-text-primary` 改为 `text-text-secondary`

- [x] Task 4: 修改 `handleClose` 添加后端清理调用 (AC: #3, #4, #5, #6)
  - [x] 4.1 在 `useRoomStore` 添加 `cleanupRoom(roomId: string)` 方法：调用 `api.post(\`/rooms/${roomId}/cleanup\`)`，忽略错误（幂等，可能已清理）
  - [x] 4.2 修改 `SettlementPage` 的 `handleClose`：先从 settlement 中获取 roomId，调用 `cleanupRoom(roomId)`，然后清除前端状态
  - [x] 4.3 清除顺序：`cleanupRoom(roomId)` → `clearSettlement()` → `clearRoom()` → `navigate('/')`
  - [x] 4.4 在 `handleClose` 中添加 loading 状态防止重复点击（按钮 disabled）

- [x] Task 5: 确保 chip store 在结算流程中正确清理 (AC: #5)
  - [x] 5.1 检查 `useChipStore` 的 `game-ended` 事件监听：确认收到事件后断开 WebSocket 连接（5-1 已实现 `disconnect` 调用）
  - [x] 5.2 确认 `RoomPage` 的 `gameEnded` useEffect 中已调用 `disconnect()`（5-1 已实现）
  - [x] 5.3 在 `SettlementPage` 的 `handleClose` 中额外调用 `useChipStore.getState().disconnect()` 作为兜底（防止直接访问结算页面的情况）

### 测试任务

- [x] Task 6: 前端单元测试 (AC: #1-#6)
  - [x] 6.1 测试 SettlementPage 玩家排序：传入乱序 settlement 数据，验证渲染顺序为盈亏从高到低
  - [x] 6.2 测试 SettlementPage 颜色映射：验证正数绿色、负数红色、零灰色
  - [x] 6.3 测试 handleClose 调用链：验证 cleanupRoom → clearSettlement → clearRoom → navigate 的调用顺序
  - [x] 6.4 测试 cleanupRoom 幂等性：API 返回错误时不阻塞关闭流程

## Dev Notes

### 架构模式与约束

- **后端框架**：Spring Boot 3.4.4 + Java 17，Maven 构建
- **数据存储**：Redis（所有房间和筹码数据），无持久化数据库（用户数据也在 Redis）
- **实时通信**：Netty Socket.IO（端口 9092），与 Spring Boot HTTP（端口 8080）分离
- **认证**：JWT token，通过 `@RequestAttribute("userId")` 注入到 Controller
- **异常处理**：`BusinessException(code, message)` 统一异常，`GlobalExceptionHandler` 统一响应格式

### 关键实现决策

1. **清理 API 而非 WebSocket 事件**：使用 REST API `POST /api/rooms/{roomId}/cleanup` 而非 WebSocket 事件，因为结算页面时 WebSocket 已断开（5-1 在导航到结算页前断开连接）
2. **幂等清理**：多个玩家可能同时点击"关闭结算"，`cleanupAfterSettlement` 必须幂等——房间不存在时静默返回，不抛异常
3. **不需要房主权限**：清理操作不限制为房主，任何该房间的玩家都可以触发（因为结算后所有人都需要清理）
4. **前端错误静默**：`cleanupRoom` 的 API 调用失败不应阻塞用户返回首页

### 现有代码复用

- **`RoomService.destroyRoom(Room room)`**（第 216-220 行）：已有完整的房间销毁逻辑（删除房间号索引、删除房间数据、删除筹码数据），直接复用
- **`ChipService.deleteRoomChips(String roomId)`**（第 139-145 行）：已有删除 Redis 筹码数据的方法，被 `destroyRoom` 调用
- **`useRoomStore.clearRoom()` 和 `clearSettlement()`**：已有前端状态清理方法
- **`SettlementPage.tsx`**：已有基础结算展示 UI，只需修改排序和颜色

### 不要做的事情（防灾清单）

- ❌ 不要在 `endGame` 方法中直接清理数据——结算数据需要保留到所有玩家查看完毕
- ❌ 不要创建新的 WebSocket 事件来处理清理——结算页面时 WebSocket 已断开
- ❌ 不要在 `cleanupAfterSettlement` 中抛出"房间不存在"异常——必须幂等
- ❌ 不要修改 `EndGameResponse` DTO——排序在前端完成，后端数据结构不变
- ❌ 不要添加结算数据持久化——PRD 明确要求"结算页面关闭后系统不保留任何数据"（FR-6.4）
- ❌ 不要修改 `destroyRoom` 方法——它已经正确工作，只需在新方法中调用它

### Project Structure Notes

关键文件路径：
```
backend/
  src/main/java/com/suoha/
    controller/RoomController.java    — 添加 cleanup 端点
    service/RoomService.java          — 添加 cleanupAfterSettlement 方法
    service/ChipService.java          — 已有 deleteRoomChips（复用）
    repository/RoomRepository.java    — 已有 deleteRoom/removeRoomCodeIndex（复用）
    repository/UserRepository.java    — 已有 findById/save（复用）

frontend/
  src/pages/SettlementPage.tsx        — 修改排序和颜色、修改 handleClose
  src/stores/useRoomStore.ts          — 添加 cleanupRoom 方法
  src/stores/useChipStore.ts          — 确认 disconnect 逻辑（5-1 已实现）
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.2] — 故事定义和验收标准
- [Source: _bmad-output/planning-artifacts/prd.md#FR-6] — FR-6.4 结算页面关闭后系统不保留任何数据
- [Source: _bmad-output/planning-artifacts/architecture.md#数据清理策略] — Redis 数据 TTL 24 小时兜底
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#结算页面] — 结算 UI 设计规范
- [Source: _bmad-output/implementation-artifacts/5-1-game-settlement.md] — 前置故事，已实现结算触发和基础展示
- [Source: backend/src/main/java/com/suoha/service/RoomService.java#destroyRoom] — 第 216-220 行，已有房间销毁逻辑
- [Source: backend/src/main/java/com/suoha/service/ChipService.java#deleteRoomChips] — 第 139-145 行，已有 Redis 清理
- [Source: frontend/src/pages/SettlementPage.tsx] — 现有结算页面，需修改
- [Source: frontend/src/stores/useRoomStore.ts] — 现有 room store，需添加 cleanupRoom

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- 前端 TypeScript 编译通过（零错误）
- 全部 31 个测试通过（含 7 个新增 SettlementPage 测试），零回归

### Completion Notes List

- 后端：在 RoomController 添加 `POST /{roomId}/cleanup` 端点，在 RoomService 添加 `cleanupAfterSettlement` 幂等清理方法，复用已有 `destroyRoom` 逻辑
- 前端：SettlementPage 玩家按盈亏从高到低排序，零值颜色改为 `text-text-secondary`（灰色）
- 前端：handleClose 改为 async，调用链为 cleanupRoom → disconnect → clearSettlement → clearRoom → navigate('/')，添加 loading 状态防重复点击
- 前端：useRoomStore 添加 `cleanupRoom` 方法，API 错误静默处理（幂等）
- 前端：handleClose 中兜底调用 `useChipStore.getState().disconnect()`
- 测试：新增 7 个 SettlementPage 单元测试覆盖排序、颜色、关闭流程、幂等性、空状态、总账校验

### File List

- `backend/src/main/java/com/suoha/controller/RoomController.java` — 新增 cleanup 端点
- `backend/src/main/java/com/suoha/service/RoomService.java` — 新增 cleanupAfterSettlement 方法
- `frontend/src/pages/SettlementPage.tsx` — 修改排序、颜色、handleClose 逻辑
- `frontend/src/stores/useRoomStore.ts` — 新增 cleanupRoom 方法
- `frontend/src/pages/__tests__/SettlementPage.test.tsx` — 新增测试文件
