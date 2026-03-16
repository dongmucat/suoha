# Docker 构建打包计划

## 目标
为前端和后端创建 Docker 镜像，使用 docker-compose 编排前端、后端、Redis 三个服务，实现一键启动。

## 架构

```
docker-compose.yml
├── redis        (redis:7-alpine, port 6379)
├── backend      (Java 17, Spring Boot, port 9091 + socketio 9092)
└── frontend     (nginx:alpine, port 80, 反向代理 /api → backend)
```

## 文件清单

### 1. `backend/Dockerfile`
- 多阶段构建：maven:3.9-eclipse-temurin-21 编译 → eclipse-temurin:21-jre-alpine 运行
- 跳过测试（`-DskipTests`），因为 SuohaApplicationTests 需要 Redis
- 暴露 9091 (HTTP) + 9092 (SocketIO)

### 2. `frontend/Dockerfile`
- 多阶段构建：node:20-alpine 构建 → nginx:alpine 运行
- pnpm install + build
- nginx 配置反向代理 /api → backend:9091

### 3. `frontend/nginx.conf`
- 前端静态文件服务
- `/api` 反向代理到后端
- `/socket.io` WebSocket 代理到后端 9092
- SPA fallback（try_files → index.html）

### 4. `docker-compose.yml`（项目根目录）
- redis: redis:7-alpine
- backend: 依赖 redis，环境变量 REDIS_HOST=redis, SPRING_PROFILES_ACTIVE=prod
- frontend: 依赖 backend，端口映射 80:80

### 5. `.dockerignore`（前端 + 后端各一个）
- 排除 node_modules、target、.git 等

## 不修改的内容
- 不改动任何现有源代码
- 不改动 application.yml（已支持环境变量）
