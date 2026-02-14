# Stage 1: Build the React application
FROM node:22-alpine AS frontend-builder
RUN npm install -g pnpm
WORKDIR /web-ui
COPY web-ui/package.json web-ui/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY web-ui/ .
RUN pnpm run build

# Stage 3: Create the final, lean image
FROM python:3.11-slim-bookworm

# 设置工作目录和环境变量
WORKDIR /app
ENV PYTHONUNBUFFERED=1
# 新增环境变量，用于区分Docker环境和本地环境
ENV RUNNING_IN_DOCKER=true
# 告知 Playwright 在哪里找到浏览器
ENV PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright
# 设置时区为中国时区
ENV TZ=Asia/Shanghai

# 安装 uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# 安装 Python 依赖
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# 确保虚拟环境路径
ENV PATH="/app/.venv/bin:$PATH"

# 安装所有运行浏览器所需的系统级依赖（包括libzbar0）和网络诊断工具
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        tzdata \
        tini \
        libzbar0 \
        curl \
        wget \
        iputils-ping \
        dnsutils \
        iproute2 \
        netcat-openbsd \
        telnet \
    && uv run playwright install-deps chromium \
    && uv run playwright install chromium \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 复制前端构建产物到 /app/dist
COPY --from=frontend-builder /dist /app/dist

# 复制应用代码
# .dockerignore 文件会处理排除项
COPY . .

# 声明服务运行的端口
EXPOSE 8000

# 使用 tini 作为 init，负责回收孤儿子进程
ENTRYPOINT ["tini", "--"]

# 容器启动时执行的命令
CMD ["python", "-m", "src.app"]
