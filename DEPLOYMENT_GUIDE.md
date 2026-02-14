# Zeabur 部署指南

## 问题诊断与解决

### 原始问题
部署到 Zeabur 后出现 **502 Bad Gateway** 错误，日志显示：
```
ModuleNotFoundError: No module named 'fastapi'
```

### 根本原因
1. **虚拟环境路径问题**：使用 `uv` 安装的依赖在 `/app/.venv` 中,但 Python 没有正确使用该虚拟环境
2. **端口配置问题**：Zeabur 使用 `PORT` 环境变量，而应用读取的是 `SERVER_PORT`

### 解决方案

#### 1. 修正 Dockerfile 虚拟环境配置

**关键修改：**
- 在 `uv sync` **之后**设置 `PATH` 和 `VIRTUAL_ENV` 环境变量
- 添加 FastAPI 安装验证步骤
- 使用 `uvicorn` 直接启动，支持动态端口

**优化后的 Dockerfile 结构：**
```dockerfile
# 安装依赖
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# 设置虚拟环境路径（必须在 uv sync 之后）
ENV PATH="/app/.venv/bin:$PATH"
ENV VIRTUAL_ENV="/app/.venv"

# 验证安装
RUN python -c "import fastapi; print(f'FastAPI {fastapi.__version__} installed successfully')"

# 启动命令支持 Zeabur 的 PORT 环境变量
CMD ["sh", "-c", "uvicorn src.app:app --host 0.0.0.0 --port ${PORT:-8000}"]
```

#### 2. 端口配置

**Zeabur 端口处理：**
- Zeabur 自动设置 `PORT` 环境变量
- 启动命令使用 `${PORT:-8000}` 优先读取 Zeabur 的端口，本地默认 8000

**本地开发：**
```bash
# 使用 python -m src.app（读取 SERVER_PORT=8000）
uv run python -m src.app

# 或直接使用 uvicorn
uv run uvicorn src.app:app --host 0.0.0.0 --port 8000 --reload
```

## 部署清单

### ✅ Dockerfile 已优化
- [x] 前端构建使用 pnpm
- [x] 后端使用 uv 管理依赖
- [x] 虚拟环境路径正确配置
- [x] FastAPI 安装验证
- [x] Playwright Chromium 安装
- [x] 支持动态端口配置

### ✅ 配置文件检查
- [x] `pyproject.toml` 包含所有必要依赖
- [x] `uv.lock` 锁定依赖版本
- [x] `web-ui/package.json` 配置正确
- [x] `web-ui/vite.config.ts` 输出到 `../dist`

### 📋 Zeabur 部署步骤

1. **推送代码到 GitHub**
   ```bash
   git add .
   git commit -m "fix: 修复 Docker 虚拟环境和端口配置"
   git push origin main
   ```

2. **在 Zeabur 控制台**
   - 触发重新部署或等待自动部署
   - 查看构建日志，确认 FastAPI 安装成功
   - 查看运行时日志，确认应用启动

3. **验证部署**
   - 访问 `https://goods.zeabur.app/`
   - 检查前端页面是否正常加载
   - 测试 API 端点（如 `/api/tasks`）

### 🔍 故障排查

如果仍然遇到问题，按以下顺序检查：

1. **查看构建日志**
   - 确认 "FastAPI X.X.X installed successfully" 出现
   - 确认前端构建产物复制成功

2. **查看运行时日志**
   - 确认应用启动消息
   - 确认监听的端口
   - 检查是否有 ModuleNotFoundError

3. **检查网络配置**
   - Zeabur 控制台 → 网络 → 确认端口正确
   - 默认应该自动检测到 8000 端口

4. **环境变量**
   - 如果需要，可以在 Zeabur 控制台设置环境变量
   - AI 相关：`OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL_NAME`
   - 通知相关：`NTFY_TOPIC_URL` 等

## 本地测试

在推送到 Zeabur 之前，建议先本地测试 Docker 镜像：

```bash
# 构建镜像
docker build -t goods-find:test .

# 运行容器
docker run -p 8000:8000 --rm goods-find:test

# 测试访问
curl http://localhost:8000/
```

## 常见问题

### Q: 为什么使用 `uvicorn` 而不是 `python -m src.app`？
A: 使用 `uvicorn` 可以直接通过命令行参数设置端口，更灵活地适配 Zeabur 的 `PORT` 环境变量。

### Q: `uv sync` 和虚拟环境的关系？
A: `uv sync` 会自动在项目目录创建 `.venv` 虚拟环境并安装依赖，无需手动 `uv venv`。

### Q: 为什么需要验证 FastAPI 安装？
A: 构建时验证可以提前发现依赖问题，避免部署后才发现 502 错误。

### Q: 前端构建产物在哪里？
A: Vite 配置 `outDir: '../dist'`，构建产物在容器的 `/dist`，然后复制到 `/app/dist`。

## 相关文件

- `Dockerfile` - Docker 镜像构建配置
- `docker-compose.yaml` - 本地 Docker Compose 配置
- `pyproject.toml` - Python 依赖管理
- `uv.lock` - Python 依赖锁定文件
- `web-ui/vite.config.ts` - 前端构建配置
- `.env.example` - 环境变量示例

## 支持

遇到问题？
1. 查看 Zeabur 日志
2. 检查本地 Docker 是否能正常运行
3. 参考项目根目录的 `CLAUDE.md` 和 `AGENTS.md`
