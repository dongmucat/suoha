# suoha（梭哈）

线下德州扑克筹码记账系统 — 打开浏览器即用，用完即走。

解决朋友聚会没有实体筹码时的记账结算痛点。完全免费、极简设计、不存历史数据，让玩家专注于游戏本身。

## 核心功能

- **房间机制**：创建房间生成二维码/房间号，扫码或输入房间号加入，最多 8 人
- **自助筹码操作**：快捷下注（20/50/100/1000）、自定义金额、收回池底、平分池底
- **实时同步**：WebSocket 推送，所有玩家实时看到筹码变动和池底状态
- **一键结算**：房主触发结算，显示每人盈亏，总账校验（盈亏之和 = 0）
- **掉线恢复**：自动重连并恢复完整状态
- **规则提示**：内置德州扑克基本规则参考

## 技术栈

**前端**

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19.x | UI 框架 |
| TypeScript | 5.9 | 类型安全 |
| Vite | 7.x | 构建工具 |
| Tailwind CSS | 4.x | 样式方案 |
| shadcn/ui | 4.x | UI 组件库 |
| Zustand | 5.x | 状态管理 |
| React Router | 7 | 路由 |
| Socket.IO Client | 4.x | WebSocket 客户端 |
| Vitest | 4.x | 单元测试 |

**后端**

| 技术 | 版本 | 用途 |
|------|------|------|
| Java | 17 | 运行时 |
| Spring Boot | 3.4 | Web 框架 |
| Spring Security | - | 认证授权 |
| netty-socketio | 2.0 | WebSocket 服务端 |
| Spring Data Redis | - | Redis 集成 |
| Redisson | 3.40 | Redis 客户端 |
| jjwt | 0.12 | JWT 认证 |
| Lombok | - | 代码简化 |
| MapStruct | 1.6 | 对象映射 |

**基础设施**

- Redis 7.x — 房间状态临时存储、掉线恢复
- HTTPS + WSS — 通信加密

## 项目结构

```
suoha/
├── frontend/                # 前端（Vite + React SPA）
│   └── src/
│       ├── pages/           # 页面（Login, Home, Room, Join, Settlement）
│       ├── components/      # 共享组件（UI, Toast, Loading, PokerRulesModal）
│       ├── stores/          # Zustand 状态管理（Auth, Room, Chip, Toast, Confirm）
│       ├── lib/             # axios 封装、Socket.IO 客户端、工具函数
│       └── test/            # 测试配置
├── backend/                 # 后端（Spring Boot）
│   └── src/main/java/com/suoha/
│       ├── config/          # 配置（Redis, SocketIO, Security, CORS）
│       ├── controller/      # REST 控制器（Auth, Room, Health）
│       ├── service/         # 业务逻辑（Auth, Room, Chip）
│       ├── handler/         # Socket.IO 事件处理（Chip）
│       ├── model/           # 实体和 DTO
│       ├── repository/      # 数据访问层
│       ├── security/        # JWT 认证过滤器
│       └── exception/       # 全局异常处理
└── _bmad-output/            # BMAD 规划产出物（PRD、架构、UX 等）
```

## 快速开始

### 环境要求

- Java 17+
- Node.js 18+
- Redis 7+
- Maven 3.8+

### 后端启动

```bash
cd backend
mvn spring-boot:run
```

后端默认端口：
- REST API: `8080`
- Socket.IO: `9092`

### 前端启动

```bash
cd frontend
npm install
npm run dev
```

前端开发服务器默认端口：`5173`

### 前端构建

```bash
cd frontend
npm run build
```

### 运行测试

```bash
# 前端测试
cd frontend
npm test

# 前端 lint
cd frontend
npm run lint
```

## 架构概览

```
┌─────────────────────────────────────┐
│         前端 (React SPA)             │
│  pages → stores → lib/              │
│                    ├── axios (REST)  │
│                    └── socket.io     │
└──────────┬──────────────┬───────────┘
           │ HTTP :8080   │ Socket.IO :9092
┌──────────┴──────────────┴───────────┐
│        后端 (Spring Boot)            │
│  controller/  ←→  service/          │
│  handler/     ←→  service/          │
│                    ↓                │
│                  Redis              │
└─────────────────────────────────────┘
```

- REST API 处理：登录注册、创建/加入房间
- Socket.IO 处理：筹码操作、池底管理、实时状态同步、结算
- Redis 存储：房间状态、玩家筹码、池底数据（24h TTL 自动清理）

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 登录（不存在自动注册） |
| POST | `/api/rooms` | 创建房间 |
| GET | `/api/rooms/:id` | 获取房间信息 |
| POST | `/api/rooms/:id/join` | 加入房间 |

## Socket.IO 事件

| 方向 | 事件 | 说明 |
|------|------|------|
| C→S | `join-room` | 加入房间 |
| C→S | `place-bet` | 下注 |
| C→S | `collect-pot` | 收回池底 |
| C→S | `split-pot` | 平分池底 |
| C→S | `end-game` | 结束牌局 |
| C→S | `transfer-owner` | 转让房主 |
| S→C | `room-state` | 完整房间状态同步 |
| S→C | `bet-placed` | 下注广播 |
| S→C | `pot-collected` | 收回池底广播 |
| S→C | `pot-split` | 平分池底广播 |
| S→C | `game-ended` | 结算数据 |

## 设计理念

- **极简主义**：只做记账和结算，不管牌局逻辑
- **即用即走**：Web 应用无需下载，结算后不保留数据
- **信任优先**：基于朋友间互信的全透明操作，总账校验保证公平
- **移动优先**：针对 375px-428px 移动端屏幕优化

## License

MIT
