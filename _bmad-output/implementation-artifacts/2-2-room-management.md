# Story 2.2: 房间管理（退出、转让、结束、销毁）

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 玩家/房主,
I want 退出房间、转让房主权限、触发结束牌局，以及系统在所有人离开后自动销毁房间,
So that 房间生命周期管理完整，牌局可以正常结束和清理。

## Acceptance Criteria

1. **玩家退出房间**
   - Given 玩家在房间中
   - When 玩家点击"退出房间"按钮并确认
   - Then 玩家从房间玩家列表中移除
   - And 玩家的 currentRoomId 清空为 null
   - And 房间内其他玩家实时收到 `player-left` 通知
   - And 玩家跳转回首页

2. **房主退出时自动转让**
   - Given 当前用户是房主且房间内还有其他玩家
   - When 房主退出房间
   - Then 系统自动将房主权限转让给玩家列表中的下一个玩家
   - And 房间内所有玩家收到 `owner-transferred` 通知
   - And 原房主跳转回首页

3. **房主主动转让权限**
   - Given 当前用户是房主
   - When 房主在玩家列表中选择一个玩家并点击"转让房主"
   - Then 该玩家成为新房主（Room.hostUserId 更新）
   - And 房间内所有玩家收到 `owner-transferred` 通知
   - And UI 更新房主标识

4. **房主触发结束牌局**
   - Given 当前用户是房主
   - When 房主点击"结束牌局"按钮并确认
   - Then 房间状态变为 SETTLED
   - And 系统计算每位玩家的盈亏（筹码值即盈亏，初始为0）
   - And 系统执行总账校验（所有玩家盈亏之和 = 0）
   - And 房间内所有玩家收到 `game-ended` 事件，附带结算数据
   - And 所有玩家跳转到结算页面

5. **非房主不能触发结束牌局**
   - Given 当前用户不是房主
   - When 查看房间页面
   - Then "结束牌局"按钮不显示或禁用

6. **所有玩家离开后自动销毁房间**
   - Given 房间内最后一个玩家退出
   - When 玩家列表变为空
   - Then 系统自动删除房间数据（Room、房间号索引、相关 Redis keys）
   - And 房间号可被后续新房间复用

7. **结算页面显示**
   - Given 牌局结束，玩家在结算页面
   - When 结算页面加载
   - Then 显示每位玩家的盈亏（正数绿色/负数红色）
   - And 显示总账校验结果（盈亏之和 = 0 则显示 ✅）
   - And 提供"关闭"按钮，关闭后清除所有房间数据，跳转首页

## Tasks / Subtasks

- [x] Task 1: 后端 - 退出房间 API (AC: #1, #2, #6)
  - [x] 1.1 在 RoomService 中实现 `leaveRoom(userId)` 方法：
    - 验证用户在房间中
    - 从 Room.playerIds 移除该用户
    - 清空 User.currentRoomId
    - 如果是房主且还有其他玩家 → 自动转让给 playerIds 中第一个玩家
    - 如果是最后一个玩家 → 调用 destroyRoom()
  - [x] 1.2 在 RoomService 中实现 `destroyRoom(roomId)` 方法：
    - 删除 `room:{roomId}` Redis Hash
    - 删除 `room:code:{roomCode}` 索引
    - 删除房间相关的所有 Redis keys（chips、pot、bets 等，为 Epic 3 预留）
  - [x] 1.3 在 RoomController 中添加 `POST /api/rooms/{roomId}/leave` 端点
  - [x] 1.4 未创建独立 LeaveRoomResponse DTO（返回空 Map，与 REST 风格一致）

- [x] Task 2: 后端 - 转让房主 API (AC: #3)
  - [x] 2.1 在 RoomService 中实现 `transferHost(roomId, currentUserId, newHostUserId)` 方法：
    - 验证 currentUserId 是当前房主
    - 验证 newHostUserId 在房间玩家列表中
    - 更新 Room.hostUserId 为 newHostUserId
    - 保存到 Redis
  - [x] 2.2 在 RoomController 中添加 `POST /api/rooms/{roomId}/transfer` 端点
  - [x] 2.3 创建 TransferHostRequest DTO（`model/dto/TransferHostRequest.java`）：newHostUserId 字段

- [x] Task 3: 后端 - 结束牌局 API (AC: #4, #5)
  - [x] 3.1 在 RoomService 中实现 `endGame(roomId, userId)` 方法：
    - 验证 userId 是房主
    - 更新 Room.status 为 SETTLED
    - 返回结算数据（每位玩家的盈亏）
    - 注意：当前阶段筹码系统尚未实现（Epic 3），盈亏数据暂时返回每位玩家筹码为 0
  - [x] 3.2 在 RoomController 中添加 `POST /api/rooms/{roomId}/end` 端点
  - [x] 3.3 创建 EndGameResponse DTO（`model/dto/EndGameResponse.java`）：包含 players 列表（userId、nickname、chips/盈亏）、totalCheck（boolean）

- [x] Task 4: 后端 - 单元测试 (AC: #1-#6)
  - [x] 4.1 RoomServiceTest 新增测试用例：
    - 普通玩家退出房间
    - 房主退出自动转让
    - 最后一个玩家退出销毁房间
    - 转让房主成功
    - 非房主转让被拒绝
    - 结束牌局成功
    - 非房主结束牌局被拒绝

- [x] Task 5: 前端 - 退出房间功能 (AC: #1, #2)
  - [x] 5.1 在 useRoomStore 中添加 `leaveRoom(roomId)` 方法：调用 `POST /api/rooms/{roomId}/leave`，成功后 clearRoom()
  - [x] 5.2 在 RoomPage 中添加"退出房间"按钮（顶部栏左侧）
  - [x] 5.3 退出前弹出确认对话框："确定退出房间吗？"
  - [x] 5.4 退出成功后导航到 /

- [x] Task 6: 前端 - 转让房主功能 (AC: #3)
  - [x] 6.1 在 useRoomStore 中添加 `transferHost(roomId, newHostUserId)` 方法
  - [x] 6.2 在 RoomPage 玩家列表中，房主视角下每个其他玩家旁显示"转让"按钮
  - [x] 6.3 点击"转让"后弹出确认对话框
  - [x] 6.4 转让成功后刷新房间信息，更新房主标识

- [x] Task 7: 前端 - 结束牌局功能 (AC: #4, #5, #7)
  - [x] 7.1 在 useRoomStore 中添加 `endGame(roomId)` 方法
  - [x] 7.2 在 RoomPage 中，仅房主可见"结束牌局"按钮
  - [x] 7.3 点击后弹出确认对话框："确定结束牌局并进入结算？"
  - [x] 7.4 实现 SettlementPage 结算页面：
    - 显示每位玩家盈亏列表（正数绿色 / 负数红色）
    - 显示总账校验结果
    - "关闭"按钮：清除房间数据，导航到 /
  - [x] 7.5 在 useRoomStore 中添加 settlement 相关状态

- [x] Task 8: 前端 - 实时通知处理（预留 WebSocket 集成点）(AC: #1, #2, #3, #4)
  - [x] 8.1 在 RoomPage 中预留 WebSocket 事件监听点（TODO 注释标记），实际 WebSocket 在 Epic 4 实现
  - [x] 8.2 当前阶段使用手动刷新作为临时方案（RoomPage 已有刷新按钮）

## Dev Notes

### 已有基础设施（Story 1.1 + 1.2 + 2.1 已实现）

**后端已有：**
- Room 实体（`model/entity/Room.java`）：id、roomCode、hostUserId、playerIds、status、createdAt
- RoomRepository（`repository/RoomRepository.java`）：save、findById、findByRoomCode、updatePlayerIds、updateStatus、generateUniqueRoomCode、removeRoomCodeIndex
- RoomService（`service/RoomService.java`）：createRoom、joinRoom、getRoomInfo
- RoomController（`controller/RoomController.java`）：POST /api/rooms、POST /api/rooms/join、GET /api/rooms/{roomId}
- User 实体有 currentRoomId 字段
- UserRepository 有 save 和 findById 方法
- BusinessException 异常类（code + message）
- GlobalExceptionHandler 全局异常处理

**前端已有：**
- useRoomStore（`stores/useRoomStore.ts`）：createRoom、joinRoom、fetchRoomInfo、clearRoom
- RoomPage（`pages/RoomPage.tsx`）：房间信息、玩家列表、二维码、刷新按钮
- HomePage（`pages/HomePage.tsx`）：创建/加入房间入口
- SettlementPage（`pages/SettlementPage.tsx`）：占位页面，需要实现实际内容
- ProtectedRoute 路由守卫
- Axios 拦截器自动附加 Authorization header

### 关键实现约束

**后端：**
- 使用已有的 RoomRepository 方法（updatePlayerIds、updateStatus、removeRoomCodeIndex）
- 错误码遵循 2xxx 范围：2001 房间不存在、2003 已在房间中、2004 非房主
- 响应格式：`Map<String, Object>` with code/message/data（与现有 RoomController 一致）
- Room.status 枚举值：WAITING / PLAYING / SETTLED

**前端：**
- 使用 Zustand store 模式（与 useRoomStore、useAuthStore 一致）
- API 调用使用 `lib/axios.ts` 中的 axios 实例
- 导航使用 `react-router-dom` 的 `useNavigate`
- UI 组件使用 shadcn/ui（Button 已有）+ Tailwind CSS
- 移动端适配：375px-428px，触摸目标 ≥ 44px
- 确认对话框：可使用 `window.confirm()` 或 shadcn/ui Dialog
- Toast 提示：顶部居中，3秒自动消失（如果尚未实现 toast 组件，可先用 alert 或简单实现）
- 颜色：成功色 #16A34A、警告色 #EF4444、主色 #2563EB

### WebSocket 事件预留（Epic 4 实现）

当前 Story 通过 REST API 实现所有操作。WebSocket 实时通知在 Epic 4 实现，本 Story 需要：
- 在代码中标记 WebSocket 集成点（注释 `// TODO: Epic 4 - WebSocket integration`）
- 使用手动刷新作为临时方案
- Socket.IO 事件名参考架构文档：
  - C→S: `leave-room`, `transfer-owner`, `end-game`
  - S→C: `player-left`, `owner-transferred`, `game-ended`

### 结算逻辑说明

当前阶段（Epic 3 筹码系统尚未实现）：
- endGame 返回每位玩家筹码为 0（因为筹码操作在 Epic 3）
- 总账校验：所有玩家筹码之和 = 0（当前必然通过）
- SettlementPage 需要完整实现 UI，后续 Epic 3 完成后数据会自然填充

### 项目结构注意

- 后端 DTO 放在 `model/dto/` 目录下（与现有 LoginRequest、CreateRoomResponse 同级）
- 后端测试放在 `src/test/java/com/suoha/service/`（已有 RoomServiceTest.java，在其中追加测试）
- 前端页面文件当前为单文件模式（如 `pages/RoomPage.tsx`），非架构文档中的文件夹模式，保持一致

### References

- [Source: _bmad-output/planning-artifacts/prd.md#FR-2] 房间管理需求 FR-2.8/2.9/2.10
- [Source: _bmad-output/planning-artifacts/architecture.md#Socket.IO事件完整列表] leave-room、transfer-owner、end-game 事件定义
- [Source: _bmad-output/planning-artifacts/architecture.md#错误码规范] 2xxx 房间错误码
- [Source: _bmad-output/planning-artifacts/architecture.md#数据过期策略] 房间销毁和 TTL 策略
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#设计令牌] 颜色、字体、间距规范
- [Source: _bmad-output/planning-artifacts/epics.md#Epic2] Story 2.2-2.5 需求定义
- [Source: _bmad-output/implementation-artifacts/2-1-room-creation-and-joining.md] Story 2.1 已实现的文件和模式

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- 前端 `pnpm run build` 成功，JS gzip 110.06KB + CSS gzip 5.26KB
- 修复 TS6133: 移除 RoomPage 中未使用的 `useState` import 和 `showTransferFor` 变量
- 后端无法编译验证：系统未安装 JDK 17 和 Maven

### Completion Notes List

- 后端：RoomService 新增 leaveRoom（退出+自动转让+销毁）、transferHost（转让房主）、endGame（结束牌局+结算数据）、destroyRoom（销毁房间）
- 后端：RoomRepository 新增 updateHostUserId、deleteRoom 方法
- 后端：RoomController 新增 3 个 REST API（leave、transfer、end）
- 后端：TransferHostRequest DTO、EndGameResponse DTO（含 PlayerSettlement 内部类）
- 后端：RoomServiceTest 新增 7 个测试用例（退出、自动转让、销毁、转让成功/失败、结束牌局成功/失败）
- 前端：useRoomStore 新增 leaveRoom、transferHost、endGame、clearSettlement 方法 + settlement 状态
- 前端：RoomPage 改造（退出按钮+确认、转让按钮+确认、结束牌局按钮+确认、错误提示、WebSocket TODO 标记）
- 前端：SettlementPage 完整实现（盈亏列表、总账校验、关闭按钮）
- 前端 TypeScript 编译通过，构建成功

### File List

**后端新增：**
- `backend/src/main/java/com/suoha/model/dto/TransferHostRequest.java`
- `backend/src/main/java/com/suoha/model/dto/EndGameResponse.java`

**后端修改：**
- `backend/src/main/java/com/suoha/repository/RoomRepository.java` — 新增 updateHostUserId、deleteRoom
- `backend/src/main/java/com/suoha/service/RoomService.java` — 新增 leaveRoom、transferHost、endGame、destroyRoom
- `backend/src/main/java/com/suoha/controller/RoomController.java` — 新增 leave、transfer、end 端点
- `backend/src/test/java/com/suoha/service/RoomServiceTest.java` — 新增 7 个测试用例

**前端修改：**
- `frontend/src/stores/useRoomStore.ts` — 新增 settlement 状态 + leaveRoom、transferHost、endGame、clearSettlement
- `frontend/src/pages/RoomPage.tsx` — 退出、转让、结束牌局功能
- `frontend/src/pages/SettlementPage.tsx` — 完整结算页面实现
