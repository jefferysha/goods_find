"""TDD: 验证所有服务层已从 JSON 文件仓储迁移到 SQLite 仓储"""
import pytest
import inspect


def test_pricing_service_uses_sqlite_repo():
    """PricingService 必须使用 SqliteMarketPriceRepository 而非 JsonMarketPriceRepository"""
    from src.services.pricing_service import PricingService
    service = PricingService()
    repo_class_name = type(service.repo).__name__
    assert repo_class_name == "SqliteMarketPriceRepository", (
        f"PricingService.repo 应该是 SqliteMarketPriceRepository，实际是 {repo_class_name}"
    )


def test_pricing_service_source_has_no_json_import():
    """PricingService 源码不应导入 JsonMarketPriceRepository"""
    import src.services.pricing_service as mod
    source = inspect.getsource(mod)
    assert "JsonMarketPriceRepository" not in source, (
        "pricing_service.py 仍然导入了 JsonMarketPriceRepository"
    )


def test_dashboard_service_source_has_no_json_import():
    """DashboardService 的 get_bargain_leaderboard 不应使用 JsonMarketPriceRepository"""
    import src.services.dashboard_service as mod
    source = inspect.getsource(mod)
    assert "JsonMarketPriceRepository" not in source, (
        "dashboard_service.py 仍然导入了 JsonMarketPriceRepository"
    )
