# syntax=docker/dockerfile:1

FROM node:24.19.0-alpine AS frontend-build
WORKDIR /workspace/frontend

COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY frontend/ .
RUN pnpm run build

FROM eclipse-temurin:25-jdk AS backend-build
WORKDIR /workspace

COPY backend/ backend/
COPY frontend/ frontend/
COPY --from=frontend-build /workspace/frontend/dist frontend/dist

WORKDIR /workspace/backend
RUN ./mvnw -B -ntp clean package -DskipTests -Dskip.installnodepnpm=true -Dskip.pnpm=true

FROM eclipse-temurin:25-jre AS runtime
WORKDIR /app

COPY --from=backend-build /workspace/backend/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
