"""
新架构的主应用入口
整合所有路由和服务
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from src.api.routes import tasks, logs, settings, prompts, results, login_state, websocket, accounts, pricing
from src.api.routes import history, alerts, dashboard, favorites, platforms, auth
from src.api.routes import price_book, purchases, inventory, profit, team, premium_map, bargain_radar
from src.api.dependencies import set_process_service, set_scheduler_service
from src.infrastructure.persistence.sqlite_manager import init_db
from src.services.task_service import TaskService
from src.services.process_service import ProcessService
from src.services.scheduler_service import SchedulerService
from src.infrastructure.persistence.json_task_repository import JsonTaskRepository


# 全局服务实例
process_service = ProcessService()
scheduler_service = SchedulerService(process_service)

# 设置全局 ProcessService 实例供依赖注入使用
set_process_service(process_service)
set_scheduler_service(scheduler_service)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时
    print("正在启动应用...")

    # 初始化 SQLite 数据库
    await init_db()

    # 重置所有任务状态为停止
    task_repo = JsonTaskRepository()
    task_service = TaskService(task_repo)
    tasks_list = await task_service.get_all_tasks()

    for task in tasks_list:
        if task.is_running:
            await task_service.update_task_status(task.id, False)

    # 加载定时任务
    await scheduler_service.reload_jobs(tasks_list)
    scheduler_service.start()

    print("应用启动完成")

    yield

    # 关闭时
    print("正在关闭应用...")
    scheduler_service.stop()
    await process_service.stop_all()
    print("应用已关闭")


# 创建 FastAPI 应用
app = FastAPI(
    title="二手商品智能监控平台",
    description="基于AI的多平台二手商品监控分析系统",
    version="2.0.0",
    lifespan=lifespan
)

# 注册路由
# 认证路由（不需要鉴权）
app.include_router(auth.router)

# 业务路由（通过前端 Token 鉴权，后端中间件可按需加 Depends）
app.include_router(tasks.router)
app.include_router(logs.router)
app.include_router(settings.router)
app.include_router(prompts.router)
app.include_router(results.router)
app.include_router(login_state.router)
app.include_router(websocket.router)
app.include_router(accounts.router)
app.include_router(pricing.router)
app.include_router(history.router)
app.include_router(alerts.router)
app.include_router(dashboard.router)
app.include_router(favorites.router)
app.include_router(platforms.router)
app.include_router(price_book.router)
app.include_router(purchases.router)
app.include_router(inventory.router)
app.include_router(profit.router)
app.include_router(team.router)
app.include_router(premium_map.router)
app.include_router(bargain_radar.router)

# 挂载静态文件
# 旧的静态文件目录（用于截图等）
app.mount("/static", StaticFiles(directory="static"), name="static")

# 挂载 Vue 3 前端构建产物
# 注意：需要在所有 API 路由之后挂载，以避免覆盖 API 路由
import os
if os.path.exists("dist"):
    app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")


# 健康检查端点
@app.get("/health")
async def health_check():
    """健康检查（无需认证）"""
    return {"status": "healthy", "message": "服务正常运行"}


# 向下兼容旧的认证端点（可在前端完全迁移后移除）
from fastapi import Request, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from src.infrastructure.config.settings import settings

class LoginRequest(BaseModel):
    username: str
    password: str


@app.post("/auth/status")
async def auth_status_legacy(payload: LoginRequest):
    """旧版认证端点 - 向下兼容，建议使用 /api/auth/login"""
    try:
        from src.services.auth_service import login
        result = await login(payload.username, payload.password)
        return {
            "authenticated": True,
            "username": result.user.username,
            "access_token": result.access_token,
            "token_type": result.token_type,
            "expires_in": result.expires_in,
            "user": result.user.model_dump(),
        }
    except ValueError:
        raise HTTPException(status_code=401, detail="认证失败")


# 主页路由 - 服务 Vue 3 SPA
from fastapi.responses import JSONResponse

@app.get("/")
async def read_root(request: Request):
    """提供 Vue 3 SPA 的主页面"""
    if os.path.exists("dist/index.html"):
        return FileResponse("dist/index.html")
    else:
        return JSONResponse(
            status_code=500,
            content={"error": "前端构建产物不存在，请先运行 cd web-ui && npm run build"}
        )


# Catch-all 路由 - 处理所有前端路由（必须放在最后）
# 注意：使用 api_route 同时注册 GET 和 HEAD，避免其他方法（POST 等）被 405
@app.api_route("/{full_path:path}", methods=["GET", "HEAD"])
async def serve_spa(request: Request, full_path: str):
    """
    Catch-all 路由，将所有非 API 请求重定向到 index.html
    这样可以支持 React Router 的 HTML5 History 模式
    """
    # API 请求不应走到这里，返回 404
    if full_path.startswith("api/") or full_path.startswith("auth/"):
        return JSONResponse(status_code=404, content={"error": "API 路径未找到"})

    # 如果请求的是静态资源（如 favicon.ico），返回 404
    if full_path.endswith(('.ico', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.css', '.js', '.json')):
        return JSONResponse(status_code=404, content={"error": "资源未找到"})

    # 其他所有路径都返回 index.html，让前端路由处理
    if os.path.exists("dist/index.html"):
        return FileResponse("dist/index.html")
    else:
        return JSONResponse(
            status_code=500,
            content={"error": "前端构建产物不存在，请先运行 cd web-ui && npm run build"}
        )


if __name__ == "__main__":
    import uvicorn
    from src.infrastructure.config.settings import settings

    print(f"启动新架构应用，端口: {settings.server_port}")
    uvicorn.run(app, host="0.0.0.0", port=settings.server_port)
