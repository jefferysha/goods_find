"""后端 API 路由 alerts 的单元测试"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI

from src.api.routes.alerts import router
from src.domain.models.alert_rule import AlertRule


def make_app():
    app = FastAPI()
    app.include_router(router)
    return app


@pytest.fixture
def app():
    return make_app()


@pytest.fixture
def anyio_backend():
    return "asyncio"


def _make_rule(**overrides) -> AlertRule:
    defaults = {
        "id": "rule-001",
        "task_id": 1,
        "name": "低价提醒",
        "enabled": True,
        "conditions": [{"field": "price", "operator": "lt", "value": 500}],
        "channels": ["ntfy"],
        "created_at": "2025-01-01",
        "updated_at": "2025-01-01",
    }
    defaults.update(overrides)
    return AlertRule(**defaults)


# ── GET /rules ────────────────────────────────────────────


@pytest.mark.anyio
async def test_get_alert_rules(app):
    """获取提醒规则列表"""
    rules = [_make_rule(), _make_rule(id="rule-002", name="高溢价提醒")]
    with patch("src.api.routes.alerts.alert_service") as mock_svc:
        mock_svc.get_all_rules = AsyncMock(return_value=rules)
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/alerts/rules")
            assert resp.status_code == 200
            data = resp.json()
            assert len(data) == 2
            assert data[0]["name"] == "低价提醒"
            mock_svc.get_all_rules.assert_called_once_with(task_id=None)


@pytest.mark.anyio
async def test_get_alert_rules_with_task_id(app):
    """按 task_id 筛选规则"""
    rules = [_make_rule()]
    with patch("src.api.routes.alerts.alert_service") as mock_svc:
        mock_svc.get_all_rules = AsyncMock(return_value=rules)
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/alerts/rules?task_id=1")
            assert resp.status_code == 200
            data = resp.json()
            assert len(data) == 1
            mock_svc.get_all_rules.assert_called_once_with(task_id=1)


# ── POST /rules ───────────────────────────────────────────


@pytest.mark.anyio
async def test_create_alert_rule(app):
    """创建提醒规则"""
    rule = _make_rule()
    with patch("src.api.routes.alerts.alert_service") as mock_svc:
        mock_svc.create_rule = AsyncMock(return_value=rule)
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/alerts/rules",
                json={
                    "task_id": 1,
                    "name": "低价提醒",
                    "enabled": True,
                    "conditions": [{"field": "price", "operator": "lt", "value": 500}],
                    "channels": ["ntfy"],
                },
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["message"] == "规则创建成功"
            assert data["data"]["name"] == "低价提醒"
            mock_svc.create_rule.assert_called_once()


# ── PUT /rules/{rule_id} ─────────────────────────────────


@pytest.mark.anyio
async def test_update_alert_rule_success(app):
    """更新提醒规则成功"""
    updated = _make_rule(name="更新后的规则")
    with patch("src.api.routes.alerts.alert_service") as mock_svc:
        mock_svc.update_rule = AsyncMock(return_value=updated)
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.put(
                "/api/alerts/rules/rule-001",
                json={"name": "更新后的规则"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["message"] == "规则更新成功"
            assert data["data"]["name"] == "更新后的规则"


@pytest.mark.anyio
async def test_update_alert_rule_not_found(app):
    """更新不存在的规则返回 404"""
    with patch("src.api.routes.alerts.alert_service") as mock_svc:
        mock_svc.update_rule = AsyncMock(return_value=None)
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.put(
                "/api/alerts/rules/nonexistent",
                json={"name": "test"},
            )
            assert resp.status_code == 404


# ── DELETE /rules/{rule_id} ───────────────────────────────


@pytest.mark.anyio
async def test_delete_alert_rule_success(app):
    """删除规则成功"""
    with patch("src.api.routes.alerts.alert_service") as mock_svc:
        mock_svc.delete_rule = AsyncMock(return_value=True)
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.delete("/api/alerts/rules/rule-001")
            assert resp.status_code == 200
            assert resp.json()["message"] == "规则删除成功"


@pytest.mark.anyio
async def test_delete_alert_rule_not_found(app):
    """删除不存在的规则返回 404"""
    with patch("src.api.routes.alerts.alert_service") as mock_svc:
        mock_svc.delete_rule = AsyncMock(return_value=False)
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.delete("/api/alerts/rules/nonexistent")
            assert resp.status_code == 404
