# ---- Frontend Build ----
FROM node:20-alpine AS frontend-build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ .
RUN pnpm run build

# ---- Backend Build ----
FROM maven:3.9-eclipse-temurin-21-alpine AS backend-build
WORKDIR /app
COPY backend/pom.xml .
RUN mvn dependency:go-offline -B
COPY backend/src ./src
RUN mvn package -DskipTests -B

# ---- Runtime ----
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Install nginx, redis, supervisord
RUN apk add --no-cache nginx redis supervisor

# Copy frontend static files
COPY --from=frontend-build /app/dist /usr/share/nginx/html

# Copy nginx config
COPY deploy/nginx.conf /etc/nginx/http.d/default.conf

# Copy backend jar
COPY --from=backend-build /app/target/*.jar app.jar

# Copy supervisord config
COPY deploy/supervisord.conf /etc/supervisord.conf

# Create required directories
RUN mkdir -p /run/nginx /var/log/supervisor /data

EXPOSE 80

CMD ["supervisord", "-c", "/etc/supervisord.conf"]
