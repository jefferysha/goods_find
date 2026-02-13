"""后端 API 路由 results 的单元测试"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport
from src.app import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client():
    """创建测试客户端"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.anyio
async def test_get_keywords(client):
    """测试获取关键词列表"""
    with patch("src.api.routes.results.item_repo") as mock_repo:
        mock_repo.get_keywords = AsyncMock(return_value=["MacBook", "iPhone"])
        response = await client.get("/api/results/keywords")
        assert response.status_code == 200
        data = response.json()
        assert "keywords" in data
        assert data["keywords"] == ["MacBook", "iPhone"]


@pytest.mark.anyio
async def test_get_results_items(client):
    """测试获取商品列表"""
    with patch("src.api.routes.results.item_repo") as mock_repo:
        mock_repo.query = AsyncMock(return_value={
            "total_items": 1,
            "page": 1,
            "limit": 20,
            "items": [{
                "商品信息": {"商品ID": "123", "商品标题": "测试", "当前售价": "¥100"},
                "卖家信息": {},
                "ai_analysis": {},
            }],
        })
        response = await client.get("/api/results/items?keyword=test")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert data["total_items"] == 1


@pytest.mark.anyio
async def test_premium_map_overview(client):
    """测试溢价地图概览"""
    mock_entries = [{
        "id": "1",
        "category_name": "MacBook Pro",
        "keywords": ["macbook"],
        "market_price": 9500,
        "purchase_upper": 7870,
        "purchase_range": [6870, 7870],
        "new_price": 14999,
    }]
    mock_query_result = {
        "total_items": 2,
        "page": 1,
        "limit": 10000,
        "items": [
            {"商品信息": {"当前售价": "¥8000"}, "卖家信息": {}, "ai_analysis": {}},
            {"商品信息": {"当前售价": "¥7500"}, "卖家信息": {}, "ai_analysis": {}},
        ],
    }
    with patch("src.api.routes.results.item_repo") as mock_repo:
        mock_repo.query = AsyncMock(return_value=mock_query_result)
        with patch(
            "src.services.price_book_service.PriceBookService.get_all",
            new_callable=AsyncMock,
            return_value=mock_entries,
        ):
            response = await client.get("/api/results/premium-map/overview")
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 1
            assert data[0]["category_name"] == "MacBook Pro"
            assert "median_price" in data[0]
            assert "avg_premium_rate" in data[0]


@pytest.mark.anyio
async def test_premium_map_distribution(client):
    """测试溢价地图分布"""
    mock_query_result = {
        "total_items": 3,
        "page": 1,
        "limit": 10000,
        "items": [
            {"商品信息": {"当前售价": "¥100"}, "卖家信息": {}, "ai_analysis": {}},
            {"商品信息": {"当前售价": "¥200"}, "卖家信息": {}, "ai_analysis": {}},
            {"商品信息": {"当前售价": "¥300"}, "卖家信息": {}, "ai_analysis": {}},
        ],
    }
    with patch("src.api.routes.results.item_repo") as mock_repo:
        mock_repo.query = AsyncMock(return_value=mock_query_result)
        with patch(
            "src.services.price_book_service.PriceBookService.get_by_keyword",
            new_callable=AsyncMock,
            return_value=None,
        ):
            response = await client.get(
                "/api/results/premium-map/distribution?keyword=test"
            )
            assert response.status_code == 200
            data = response.json()
            assert "bins" in data
            assert "reference_lines" in data
            assert len(data["bins"]) > 0


@pytest.mark.anyio
async def test_premium_map_distribution_empty(client):
    """测试溢价地图分布 — 无数据时返回空"""
    mock_query_result = {
        "total_items": 0,
        "page": 1,
        "limit": 10000,
        "items": [],
    }
    with patch("src.api.routes.results.item_repo") as mock_repo:
        mock_repo.query = AsyncMock(return_value=mock_query_result)
        with patch(
            "src.services.price_book_service.PriceBookService.get_by_keyword",
            new_callable=AsyncMock,
            return_value=None,
        ):
            response = await client.get(
                "/api/results/premium-map/distribution?keyword=empty"
            )
            assert response.status_code == 200
            data = response.json()
            assert data["bins"] == []
            assert data["reference_lines"] == {}


@pytest.mark.anyio
async def test_market_trend(client):
    """测试行情走势"""
    # mock get_db 返回的 aiosqlite 连接
    mock_db = AsyncMock()
    mock_cursor = AsyncMock()

    # 构造可被 dict(row) 消费的 Row-like 对象
    def _make_row(day, price):
        row = MagicMock()
        row.keys = MagicMock(return_value=["day", "price"])
        row.__getitem__ = lambda self, key, _d=day, _p=price: {"day": _d, "price": _p}[key]
        row.__iter__ = MagicMock(return_value=iter([("day", day), ("price", price)]))
        return row

    mock_rows = [
        _make_row("2026-01-15", 8000.0),
        _make_row("2026-01-15", 9000.0),
        _make_row("2026-01-16", 8500.0),
    ]
    mock_cursor.fetchall = AsyncMock(return_value=mock_rows)
    mock_db.execute = AsyncMock(return_value=mock_cursor)
    mock_db.close = AsyncMock()

    with patch(
        "src.infrastructure.persistence.sqlite_manager.get_db",
        new_callable=AsyncMock,
        return_value=mock_db,
    ):
        response = await client.get("/api/results/market-trend?keyword=test&days=30")
        assert response.status_code == 200
        data = response.json()
        assert data["keyword"] == "test"
        assert data["days"] == 30
        assert "trend" in data
        assert len(data["trend"]) == 2  # 两个不同日期
        # 检查聚合逻辑
        day15 = next(t for t in data["trend"] if t["date"] == "2026-01-15")
        assert day15["count"] == 2
        assert day15["avg_price"] == 8500.0


@pytest.mark.anyio
async def test_competitor_analysis(client):
    """测试竞品观察"""
    mock_query_result = {
        "total_items": 2,
        "page": 1,
        "limit": 10000,
        "items": [
            {
                "商品信息": {
                    "商品标题": "商品A",
                    "当前售价": "¥100",
                    "商品链接": "http://a.com",
                },
                "卖家信息": {"卖家昵称": "卖家1"},
                "ai_analysis": {},
                "爬取时间": "2026-01-01",
            },
            {
                "商品信息": {
                    "商品标题": "商品B",
                    "当前售价": "¥200",
                    "商品链接": "http://b.com",
                },
                "卖家信息": {"卖家昵称": "卖家1"},
                "ai_analysis": {},
                "爬取时间": "2026-01-02",
            },
        ],
    }
    with patch("src.api.routes.results.item_repo") as mock_repo:
        mock_repo.query = AsyncMock(return_value=mock_query_result)
        response = await client.get("/api/results/competitor-analysis?keyword=test")
        assert response.status_code == 200
        data = response.json()
        assert "sellers" in data
        assert "total_sellers" in data
        assert data["total_sellers"] == 1  # 同一个卖家
        assert data["sellers"][0]["seller_name"] == "卖家1"
        assert data["sellers"][0]["item_count"] == 2
        assert data["sellers"][0]["avg_price"] == 150.0


@pytest.mark.anyio
async def test_delete_result_data(client):
    """测试删除数据"""
    with patch("src.api.routes.results.item_repo") as mock_repo:
        mock_repo.delete_by_keyword = AsyncMock(return_value=5)
        response = await client.delete("/api/results/data?keyword=test")
        assert response.status_code == 200
        data = response.json()
        assert "5" in data["message"]


@pytest.mark.anyio
async def test_export_csv(client):
    """测试导出 CSV"""
    mock_query_result = {
        "total_items": 1,
        "page": 1,
        "limit": 10000,
        "items": [
            {
                "商品信息": {
                    "商品ID": "abc123",
                    "商品标题": "测试商品",
                    "当前售价": "¥999",
                    "发货地区": "上海",
                    "发布时间": "2026-01-01",
                    "商品链接": "http://example.com",
                    "商品主图链接": "http://example.com/img.jpg",
                },
                "卖家信息": {"卖家昵称": "TestSeller", "卖家信用等级": "5"},
                "ai_analysis": {"is_recommended": True, "reason": "不错"},
                "爬取时间": "2026-01-02",
            }
        ],
    }
    with patch("src.api.routes.results.item_repo") as mock_repo:
        mock_repo.query = AsyncMock(return_value=mock_query_result)
        response = await client.get("/api/results/export?keyword=test")
        assert response.status_code == 200
        assert "text/csv" in response.headers["content-type"]


@pytest.mark.anyio
async def test_export_csv_empty_returns_404(client):
    """测试导出 CSV — 无数据时返回 404"""
    mock_query_result = {
        "total_items": 0,
        "page": 1,
        "limit": 10000,
        "items": [],
    }
    with patch("src.api.routes.results.item_repo") as mock_repo:
        mock_repo.query = AsyncMock(return_value=mock_query_result)
        response = await client.get("/api/results/export?keyword=nonexist")
        assert response.status_code == 404
