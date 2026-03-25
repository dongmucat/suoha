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
| Vite | 8.x | 构建工具（Rolldown + Oxc） |
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
- Docker — 容器化部署
- GitHub Actions — CI/CD 自动构建推送

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
├── _bmad-output/            # BMAD 规划产出物（PRD、架构、UX 等）
├── deploy/                  # 部署配置（nginx、supervisord）
├── .github/workflows/       # GitHub Actions CI/CD 工作流
└── Dockerfile               # 多阶段构建（前端+后端+运行时）
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

## Docker 部署

### 使用 Docker 镜像

镜像已包含所有依赖（nginx + Spring Boot + Redis），服务器只需安装 Docker。

```bash
# 从 GitHub Container Registry 拉取镜像
docker pull ghcr.io/dongmucat/suoha:latest

# 运行容器（all-in-one，无需外部依赖）
docker run -d \
  -p 80:80 \
  -e JWT_SECRET="换成你自己的密钥至少32位" \
  -v suoha-data:/data \
  --restart unless-stopped \
  --name suoha \
  ghcr.io/dongmucat/suoha:latest
```

访问 `http://服务器IP` 即可使用。

参数说明：
- `-v suoha-data:/data` — Redis 数据持久化，容器重启不丢数据
- `--restart unless-stopped` — 服务器重启后自动拉起容器
- `-e JWT_SECRET` — 生产环境必须修改为随机密钥

部署说明：
- all-in-one 镜像默认通过容器内 Nginx 反向代理 `/api` 和 `/socket.io`，浏览器应始终访问同源地址 `http://你的域名`。
- 不要在生产构建里把 `VITE_API_BASE_URL` 或 `VITE_SOCKET_URL` 设成 `http://域名:9091`、`http://域名:9092` 这类跨域绝对地址；否则会绕过同源代理并触发 CORS/跨域问题。

### 本地构建镜像

```bash
# 构建镜像
docker build -t suoha:local .

# 运行
docker run -d -p 80:80 -e REDIS_HOST=redis suoha:local
```

### CI/CD 自动化

项目配置了 GitHub Actions 工作流，在以下情况自动构建并推送镜像到 `ghcr.io`：
- push 到 `main` 分支
- 手动触发工作流

镜像标签：
- `latest` — 最新版本
- `main-<sha>` — 带 git commit SHA 的版本标签

查看构建状态：GitHub Actions 页面
查看镜像：仓库右侧 Packages 栏

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
