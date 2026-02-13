"""tests/test_api_settings_routes.py – 设置管理路由单元测试"""
import pytest
from unittest.mock import patch, MagicMock, PropertyMock
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI

from src.api.routes.settings import router
from src.api.dependencies import get_process_service


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def make_app(mock_process_service=None):
    app = FastAPI()
    app.include_router(router)
    if mock_process_service is not None:
        app.dependency_overrides[get_process_service] = lambda: mock_process_service
    return app


@pytest.fixture
def mock_env_manager():
    with patch("src.api.routes.settings.env_manager") as m:
        m.get_value = MagicMock(side_effect=_env_defaults)
        m.update_values = MagicMock(return_value=True)
        yield m


def _env_defaults(key, default=""):
    """为 env_manager.get_value 提供默认值"""
    defaults = {
        "NTFY_TOPIC_URL": "https://ntfy.example/topic",
        "GOTIFY_URL": "",
        "GOTIFY_TOKEN": "",
        "BARK_URL": "",
        "WX_BOT_URL": "",
        "TELEGRAM_BOT_TOKEN": "",
        "TELEGRAM_CHAT_ID": "",
        "WEBHOOK_URL": "",
        "WEBHOOK_METHOD": "POST",
        "WEBHOOK_HEADERS": "",
        "WEBHOOK_CONTENT_TYPE": "JSON",
        "WEBHOOK_QUERY_PARAMETERS": "",
        "WEBHOOK_BODY": "",
        "PCURL_TO_MOBILE": "true",
        "OPENAI_API_KEY": "sk-test",
        "OPENAI_BASE_URL": "https://api.openai.com/v1",
        "OPENAI_MODEL_NAME": "gpt-4o",
        "SKIP_AI_ANALYSIS": "false",
        "PROXY_ROTATION_ENABLED": "false",
        "PROXY_ROTATION_MODE": "per_task",
        "PROXY_POOL": "",
        "PROXY_ROTATION_RETRY_LIMIT": "2",
        "PROXY_BLACKLIST_TTL": "300",
    }
    return defaults.get(key, default)


@pytest.fixture
def mock_reload_env():
    with patch("src.api.routes.settings._reload_env") as m:
        yield m


@pytest.fixture
def mock_process_service():
    svc = MagicMock()
    svc.processes = {}
    return svc


@pytest.fixture
def app(mock_process_service):
    return make_app(mock_process_service)


# ---------------------------------------------------------------------------
# GET /api/settings/notifications
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_get_notification_settings(app, mock_env_manager):
    """获取通知设置"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/api/settings/notifications")
        assert resp.status_code == 200
        data = resp.json()
        assert "NTFY_TOPIC_URL" in data
        assert data["NTFY_TOPIC_URL"] == "https://ntfy.example/topic"


# ---------------------------------------------------------------------------
# PUT /api/settings/notifications
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_update_notification_settings_success(
    app, mock_env_manager, mock_reload_env
):
    """成功更新通知设置"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.put(
            "/api/settings/notifications",
            json={"NTFY_TOPIC_URL": "https://ntfy.example/new"},
        )
        assert resp.status_code == 200
        assert "成功" in resp.json()["message"]
        mock_env_manager.update_values.assert_called_once()
        mock_reload_env.assert_called_once()


@pytest.mark.anyio
async def test_update_notification_settings_failure(
    app, mock_env_manager, mock_reload_env
):
    """更新通知设置失败"""
    mock_env_manager.update_values.return_value = False
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.put(
            "/api/settings/notifications",
            json={"NTFY_TOPIC_URL": "x"},
        )
        assert resp.status_code == 200
        assert "失败" in resp.json()["message"]
        mock_reload_env.assert_not_called()


# ---------------------------------------------------------------------------
# GET /api/settings/rotation
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_get_rotation_settings(app, mock_env_manager):
    """获取轮换设置"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/api/settings/rotation")
        assert resp.status_code == 200
        data = resp.json()
        assert "PROXY_ROTATION_ENABLED" in data
        assert "PROXY_ROTATION_MODE" in data


# ---------------------------------------------------------------------------
# PUT /api/settings/rotation
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_update_rotation_settings_success(
    app, mock_env_manager, mock_reload_env
):
    """成功更新轮换设置"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.put(
            "/api/settings/rotation",
            json={"PROXY_ROTATION_ENABLED": True, "PROXY_ROTATION_MODE": "round_robin"},
        )
        assert resp.status_code == 200
        assert "成功" in resp.json()["message"]
        mock_env_manager.update_values.assert_called_once()


# ---------------------------------------------------------------------------
# GET /api/settings/status
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_get_system_status(app, mock_env_manager, mock_process_service):
    """获取系统状态"""
    with (
        patch("src.api.routes.settings.os.path.exists", return_value=True),
        patch("src.api.routes.settings.AISettings") as MockAI,
        patch("src.api.routes.settings.notification_settings") as mock_notif,
        patch("src.api.routes.settings.scraper_settings") as mock_scraper,
    ):
        MockAI.return_value.is_configured.return_value = True
        mock_notif.has_any_notification_enabled.return_value = True
        mock_scraper.run_headless = True
        mock_scraper.running_in_docker = False

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/settings/status")
            assert resp.status_code == 200
            data = resp.json()
            assert "ai_configured" in data
            assert "scraper_running" in data
            assert data["ai_configured"] is True
            assert data["running_task_ids"] == []


@pytest.mark.anyio
async def test_get_system_status_with_running_tasks(
    app, mock_env_manager, mock_process_service
):
    """有运行中任务的系统状态"""
    mock_proc = MagicMock()
    mock_proc.returncode = None  # still running
    mock_process_service.processes = {1: mock_proc}

    with (
        patch("src.api.routes.settings.os.path.exists", return_value=False),
        patch("src.api.routes.settings.AISettings") as MockAI,
        patch("src.api.routes.settings.notification_settings") as mock_notif,
        patch("src.api.routes.settings.scraper_settings") as mock_scraper,
    ):
        MockAI.return_value.is_configured.return_value = False
        mock_notif.has_any_notification_enabled.return_value = False
        mock_scraper.run_headless = False
        mock_scraper.running_in_docker = True

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/settings/status")
            assert resp.status_code == 200
            data = resp.json()
            assert data["scraper_running"] is True
            assert 1 in data["running_task_ids"]


# ---------------------------------------------------------------------------
# GET /api/settings/ai
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_get_ai_settings(app, mock_env_manager):
    """获取 AI 设置"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/api/settings/ai")
        assert resp.status_code == 200
        data = resp.json()
        assert "OPENAI_BASE_URL" in data
        assert "OPENAI_MODEL_NAME" in data
        assert "SKIP_AI_ANALYSIS" in data


# ---------------------------------------------------------------------------
# PUT /api/settings/ai
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_update_ai_settings_success(app, mock_env_manager, mock_reload_env):
    """成功更新 AI 设置"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.put(
            "/api/settings/ai",
            json={
                "OPENAI_BASE_URL": "https://api.example.com/v1",
                "OPENAI_MODEL_NAME": "gpt-4o-mini",
            },
        )
        assert resp.status_code == 200
        assert "成功" in resp.json()["message"]
        mock_env_manager.update_values.assert_called_once()


@pytest.mark.anyio
async def test_update_ai_settings_failure(app, mock_env_manager, mock_reload_env):
    """更新 AI 设置失败"""
    mock_env_manager.update_values.return_value = False
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.put(
            "/api/settings/ai",
            json={"OPENAI_MODEL_NAME": "gpt-4o"},
        )
        assert resp.status_code == 200
        assert "失败" in resp.json()["message"]
