# Repository Guidelines

## 项目结构与模块组织
- 后端位于 `src/`，入口 `src/app.py`，API 路由在 `src/api/routes/`，服务层在 `src/services/`，领域模型在 `src/domain/`，基础设施在 `src/infrastructure/`。
- 前端在 `web-ui/`（React 18 + TypeScript + Vite + shadcn/ui + Tailwind CSS），页面在 `web-ui/src/pages/`，组件在 `web-ui/src/components/`，构建产物输出到根目录 `dist/`。
- 测试位于 `tests/`，命名遵循 `test_*.py` 或 `tests/*/test_*.py`。
- 运行数据与资源：`prompts/`、`jsonl/`、`logs/`、`images/`、`static/`、`state/`、`data/`（SQLite），配置文件 `config.json` 与 `.env` 位于仓库根目录。

## 依赖管理
- Python 依赖使用 `uv`（`pyproject.toml` + `uv.lock`）：`uv sync` 安装、`uv add <pkg>` 添加。
- 前端依赖使用 `pnpm`（`package.json` + `pnpm-lock.yaml`）：`pnpm install` 安装、`pnpm add <pkg>` 添加。
- `requirements.txt` 仅作兼容参考，主依赖管理以 `pyproject.toml` 为准。

## 构建、测试与本地开发
- 后端开发：`uv run python -m src.app` 或 `uv run uvicorn src.app:app --host 0.0.0.0 --port 8000 --reload`。
- 爬虫任务：`uv run python spider_v2.py --task-name "MacBook Air M1" --debug-limit 3`（可用 `--config` 指定自定义配置）。
- 前端开发：`cd web-ui && pnpm install && pnpm run dev`；构建：`cd web-ui && pnpm run build`（产物输出到根目录 `dist/`）。
- 一键本地启动：`bash start.sh`（自动 uv sync、前端构建并启动后端）。
- Docker：`docker compose up --build -d`，查看日志 `docker compose logs -f app`，停止 `docker compose down`。

## 编码风格与命名约定
- 保持分层：API → services → domain → infrastructure，避免跨层耦合，模块保持精简。
- Python 测试函数命名为 `test_*`，文件与路径遵循上述测试目录规范。
- 使用描述性、任务导向的命名（如爬虫任务名、配置键），与业务含义对应。

## 架构与运行时
- 后端使用 FastAPI 提供 API 与静态资源，爬虫与 AI 推理在独立任务进程中协作，前后端通过 HTTP/Web UI 交互。
- 任务运行会在 `jsonl/` 写入结果、在 `logs/` 留存运行日志、在 `images/` 下载图片，数据存储在 `data/monitor.db`（SQLite），前端监控页面依赖这些数据。
- 默认监听 8000 端口，前端构建后静态文件可由后端或 Docker 镜像直接提供。

## 测试指南
- 测试框架：`pytest`（默认同步测试，无需 `pytest-asyncio`）。
- 运行全部测试：`uv run pytest`；覆盖率：`uv run pytest --cov=src`；定向测试：`uv run pytest tests/test_utils.py::test_safe_get`。
- 优先覆盖核心服务、爬虫管道的异常分支与重试逻辑，避免回归。
- PR 前请运行相关测试，新增逻辑补充针对性用例。

## 提交与 PR 规范
- Commit 采用类 Conventional Commits：`feat(...)`、`fix(...)`、`refactor(...)`、`chore(...)`、`docs(...)` 等。
- PR 需说明变更范围与影响模块；UI 变更在 `web-ui/` 提供截图；关联相关 Issue；提及配置或迁移步骤。

## 安全与配置提示
- 复制 `.env.example` 为 `.env`，设置必填项 `OPENAI_API_KEY`、`OPENAI_BASE_URL`、`OPENAI_MODEL_NAME` 等。
- 不要提交真实凭据或 cookies（如 `state.json`）；Playwright 需本地浏览器，Docker 镜像已预装 Chromium。
- Web 认证默认 `admin/admin123`，生产环境务必修改，推荐启用 HTTPS 并限制访问来源。
