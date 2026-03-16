---
project_name: 'suoha'
user_name: 'Snchen5'
date: '2026-03-13'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'code_quality', 'workflow_rules', 'critical_rules']
status: 'complete'
rule_count: 58
optimized_for_llm: true
existing_patterns_found: 30
---

# AI 代理项目上下文

_本文件包含 AI 代理在本项目中实现代码时必须遵循的关键规则和模式。聚焦于代理可能遗漏的非显而易见的细节。_

---

## 技术栈与版本

### 前端
- React 19.2 + TypeScript 5.9 + Vite 8.0（Rolldown + Oxc 构建工具链）
- Tailwind CSS 4.2（@tailwindcss/vite 插件模式，非 PostCSS）
- Zustand 5.0（状态管理，多 Store 分离模式）
- React Router 7（路由）
- socket.io-client 4.8（WebSocket 客户端）
- axios 1.13（HTTP 客户端，带拦截器）
- shadcn v4 + Base UI + Lucide React（UI 组件）
- qrcode.react 4.2（二维码）
- class-variance-authority 0.7 + clsx + tailwind-merge（样式工具）
- Vitest 4.0 + happy-dom + @testing-library/react（测试）
- ESLint 9 flat config + typescript-eslint + react-hooks + react-refresh
- pnpm（包管理器）

### 后端
- Java 17 + Spring Boot 3.4.4
- netty-socketio 2.0.12（Socket.IO 服务端）
- Spring Data Redis + Lettuce 连接池 + Redisson 3.40.2
- jjwt 0.12.6（JWT 认证）
- Spring Security + Spring Validation
- Lombok + MapStruct 1.6.3
- Maven 构建

### 基础设施
- Redis 7.x（内存数据库，Lua 脚本原子操作）
- REST API 端口：9091
- Socket.IO 端口：9092
- 前端开发代理：vite proxy /api → localhost:9091

### 版本约束
- Tailwind CSS 4.x 使用 Vite 插件模式，不再需要 tailwind.config.js 和 postcss.config.js
- React 19 的 use hook 和并发特性可用
- Zustand 5.x 的 create 不再需要 curried 形式
- ESLint 9 使用 flat config（eslint.config.js），非传统 .eslintrc

## 关键实现规则

### 语言特定规则

#### TypeScript
- 严格模式启用：strict、noUnusedLocals、noUnusedParameters、noFallthroughCasesInSwitch
- `verbatimModuleSyntax: true`：类型导入必须使用 `import type { X }` 语法，不能混用
- `erasableSyntaxOnly: true`：禁止 enum 等运行时语法，使用 `as const` 替代
- 路径别名：`@/` 映射到 `./src/*`，所有内部导入必须使用 `@/` 前缀
- 目标环境：ES2022，模块解析：bundler 模式
- API 响应类型：axios 拦截器已剥离外层，`api.get('/path')` 返回的是 `{ code, data, message }` 而非 `AxiosResponse`，store 中使用 `res.data` 获取业务数据
- Zustand store 类型：使用 `create<StateType>((set, get) => ({...}))` 模式，非 curried

#### Java
- Java 17 语法可用（record、sealed class、pattern matching）
- Lombok 注解处理器已配置，可使用 @Data、@Builder、@Slf4j 等
- MapStruct 注解处理器已配置，DTO 转换使用 MapStruct 而非手动映射
- Spring Validation 已引入，请求 DTO 使用 @Valid + @NotBlank 等注解校验
- 业务异常统一抛出 BusinessException，由 GlobalExceptionHandler 捕获
- Redis 操作通过 Redisson（非原生 RedisTemplate），注意 API 差异

### 框架特定规则

#### 前端组件结构
- 所有页面和自定义组件使用文件夹 + `index.tsx` 结构（如 `pages/login/index.tsx`）
- 页面专属子组件放在该页面的 `components/` 子目录（如 `pages/room/components/bet-panel/index.tsx`）
- 跨页面复用组件放在 `src/components/shared/`
- shadcn/ui 组件保持 CLI 生成的默认命名在 `src/components/ui/`

#### 状态管理（Zustand 多 Store 模式）
- 按职责分离 Store：use-auth-store、use-room-store、use-chip-store、use-toast-store、use-confirm-store
- Store 之间可跨引用：chip-store 内部调用 `useRoomStore.getState()` 更新房间状态
- Store 文件放在 `src/stores/`，命名 `use-xxx-store.ts`

#### 路由
- 使用 `react-router` v7（注意：导入路径是 `react-router` 而非 `react-router-dom`）
- 懒加载：所有页面组件使用 `lazy(() => import('@/pages/xxx'))` + `<Suspense>`
- 路由守卫：`<ProtectedRoute>` 组件包裹需要认证的路由
- 未登录重定向到 `/login`，已登录访问登录页重定向到 `/`

#### Socket.IO 客户端模式
- 单例模式：`src/lib/socket.ts` 管理全局 socket 实例
- 连接时传递 token 和 roomId 通过 `query` 参数（非 `auth`）
- 事件监听在 chip-store 的 `connect()` 方法中统一注册
- 所有 emit 使用回调确认模式：`socket.emit('event', data, (res) => {...})`
- 断开连接时必须 `removeAllListeners()` 再 `disconnect()`

#### HTTP 客户端
- 统一使用 `src/lib/axios.ts` 导出的 `api` 实例
- 拦截器自动注入 Bearer token
- 业务错误（HTTP 200 但 code !== 200）自动 toast 提示并 reject
- 401 自动清除 token 并跳转登录页

#### 后端包结构
- `config/` - 配置类（Redis、SocketIO、Security、Cors）
- `controller/` - REST 控制器
- `service/` - 业务逻辑
- `handler/` - Socket.IO 事件处理器
- `model/entity/` - 数据实体
- `model/dto/` - 请求/响应 DTO
- `security/` - JWT 相关（JwtTokenProvider、JwtAuthFilter）
- `repository/` - Redis 数据访问层
- `exception/` - 异常定义和全局处理

#### 后端层级职责
- controller 和 handler 不直接操作 Redis，必须通过 service
- service 不直接发送 Socket.IO 消息，由 handler 负责广播
- JWT 相关类放在 `security/` 包（非 `util/`）

#### Socket.IO 服务端
- netty-socketio 独立端口 9092 运行
- 认证通过 handshake query 参数中的 token 验证
- 房间管理使用 Socket.IO 原生 Room 概念

### 测试规则

#### 前端测试
- 框架：Vitest 4.0 + happy-dom（非 jsdom）
- 配置在 `vite.config.ts` 的 `test` 字段中，`globals: true` 已启用（无需导入 describe/it/expect）
- 测试文件位置：与源文件同目录的 `__tests__/` 文件夹，后缀 `*.test.ts` 或 `*.test.tsx`
- 运行命令：`pnpm test`（执行 `vitest --run`，单次运行非 watch 模式）
- 使用 @testing-library/react 进行组件测试
- 使用 @testing-library/jest-dom 提供 DOM 断言（toBeInTheDocument 等）
- setup 文件：`src/test/setup.ts`

#### 后端测试
- 框架：spring-boot-starter-test（JUnit 5 + Mockito）
- 测试文件位置：`src/test/java/com/suoha/` 镜像 main 目录结构
- 运行命令：`mvn test`

### 代码质量与风格规则

#### 前端命名规范
- 文件夹名：kebab-case（`bet-panel/`、`use-auth-store.ts`）
- React 组件名（代码内）：PascalCase（`BetPanel`、`PlayerList`）
- 函数/变量：camelCase（`handleBet`、`currentRoom`）
- 常量：UPPER_SNAKE_CASE
- 类型/接口：PascalCase（`Player`、`RoomState`、`ChipState`）
- CSS：Tailwind utility classes，样式合并使用 `cn()` 工具函数（clsx + tailwind-merge）

#### 后端命名规范
- 类名：PascalCase（`RoomService`、`ChipHandler`）
- 方法/变量：camelCase
- 常量：UPPER_SNAKE_CASE
- 包名：全小写（`com.suoha.service`）
- REST 端点：kebab-case（`/api/auth/login`）
- Redis Key：冒号分隔（`room:{roomId}:info`）

#### Socket.IO 事件命名
- 统一 kebab-case：`place-bet`、`room-state`、`player-joined`、`pot-collected`

#### JSON 字段命名
- 统一 camelCase：`roomId`、`chipAmount`、`hostUserId`

#### API 响应格式
- 统一结构：`{ code: 200, data: {...}, message: "success" }`
- 错误码分段：1xxx 认证、2xxx 房间、3xxx 操作、9xxx 系统

#### 前端代码组织
- 服务层（`src/lib/`）：axios.ts、socket.ts、utils.ts
- 不使用 `src/services/` 目录，API 和 Socket 封装放在 `src/lib/`
- 页面导出使用 `export default function XxxPage()` 配合 lazy import

### 开发工作流规则

#### 项目结构
- 前后端分离：`frontend/`（React SPA）和 `backend/`（Spring Boot）
- 前端包管理器：pnpm（非 npm/yarn）
- 后端构建工具：Maven（非 Gradle）

#### 环境配置
- 前端环境变量前缀：`VITE_`（如 `VITE_API_BASE_URL`、`VITE_SOCKET_URL`）
- 后端 profile：`application.yml` + `application-dev.yml` + `application-prod.yml`
- 后端环境变量覆盖：`${REDIS_HOST:localhost}`、`${JWT_SECRET:...}` 格式

#### 构建命令
- 前端开发：`pnpm dev`
- 前端构建：`pnpm build`（先 tsc 类型检查再 vite build）
- 前端 lint：`pnpm lint`
- 前端测试：`pnpm test`
- 打包分析：`vite build --mode analyze`（rollup-plugin-visualizer）

#### 代码分割策略
- manualChunks 已配置：vendor（react/react-dom/react-router）、socket（socket.io-client）、qrcode（qrcode.react）
- 页面级懒加载通过 React.lazy

#### 开发代理
- vite.config.ts 配置 `/api` 代理到 `http://localhost:9091`
- Socket.IO 直连 `http://localhost:9092`（不走代理）

### 关键防错规则

#### 并发与数据一致性
- 筹码操作（下注、收回、平分）必须使用 Redis Lua 脚本保证原子性
- 禁止在应用层"读取→计算→写入"模式操作筹码/池底
- Lua 脚本位于 `backend/src/main/resources/lua/`（place_bet.lua、collect_pot.lua、split_pot.lua）
- 结算时必须校验总账：所有玩家筹码之和 = 0

#### Socket.IO 陷阱
- 前端 socket 连接认证通过 `query` 参数传递 token（非 Socket.IO 的 `auth` 选项）
- 每次进入房间页面创建新连接（`connectSocket` 会先断开旧连接再创建新的）
- 离开房间必须调用 `disconnect()` 清理，否则会导致幽灵连接
- 重连后服务端会推送完整 `room-state` 快照，前端直接覆盖本地状态

#### API 调用陷阱
- axios 拦截器已解包响应：store 中 `const res: any = await api.post(...)` 拿到的是 `{ code, data, message }` 而非 `AxiosResponse`
- 业务数据在 `res.data` 中，不要写 `res.data.data`
- 401 响应会自动清 token 并跳转登录页，不需要在 store 中重复处理

#### 状态管理陷阱
- chip-store 的 `connect()` 会注册 Socket.IO 事件监听并更新 room-store 的状态（跨 store 副作用）
- `gameEnded` 标志位在 chip-store 中，结算数据在 room-store 的 `settlement` 中
- 离开房间流程：先 `leaveRoom`（REST API）→ 再 `disconnect`（Socket.IO）→ 最后 `clearRoom`

#### 安全规则
- JWT token 存储在 localStorage，24 小时过期，无 refresh token
- 密码使用 bcrypt 加密（Spring Security 默认）
- 每次 Socket.IO 操作服务端必须验证用户是否在该房间内
- 房间数据通过 Redis key 前缀隔离（`room:{roomId}:*`）

#### 不要做的事
- 不要引入 react-router-dom，项目使用 react-router v7 直接导入
- 不要创建 tailwind.config.js 或 postcss.config.js（Tailwind 4.x 使用 Vite 插件模式）
- 不要使用 RedisTemplate，项目使用 Redisson
- 不要在 controller/handler 层直接操作 Redis
- 不要在 service 层直接发送 Socket.IO 消息
- 不要使用 TypeScript enum，使用 as const 替代（erasableSyntaxOnly）
- 不要混用 import 和 import type（verbatimModuleSyntax）

---

## 使用指南

**AI 代理：**
- 实现任何代码前先阅读本文件
- 严格遵循所有规则
- 有疑问时选择更严格的选项
- 发现新模式时更新本文件

**维护者：**
- 保持本文件精简，聚焦于代理需要的信息
- 技术栈变更时及时更新
- 定期审查移除过时规则

最后更新：2026-03-13
