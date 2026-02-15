# 跨平台比价分析功能设计

## 概述

支持多平台（闲鱼、Mercari 等）同品类商品的交叉比价分析，识别套利机会，辅助进货决策。

## 核心设计决策

1. **品类匹配方式**：价格本（price_book）为主桥梁，关键词映射为辅
2. **展示形式**：品类聚合对比卡片 + 混排商品列表
3. **货币换算**：初版手动配置汇率，后续迭代加自动更新
4. **实现顺序**：先品类级对比（Phase 1），后精确 SKU 匹配（Phase 2）

## 数据层

### 新增表：cross_platform_config

```sql
CREATE TABLE IF NOT EXISTS cross_platform_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
);
```

### 新增表：keyword_category_map

```sql
CREATE TABLE IF NOT EXISTS keyword_category_map (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL,
    platform TEXT NOT NULL,
    category_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(keyword, platform)
);
```

### 映射链路

```
items.keyword + items.platform
    → keyword_category_map.category_id（手动映射优先）
    → 或 items.category_id（自动匹配兜底）
    → price_book.id → price_book.category_name
```

## 服务层：CrossPlatformService

### 方法签名

- `get_comparable_categories()` - 获取有多平台数据的品类列表
- `compare_category(category_id)` - 单品类多平台对比详情
- `get_cross_platform_items(category_id, sort_by, platforms)` - 混排商品列表
- `get_exchange_rates()` / `set_exchange_rate(...)` - 汇率管理
- `get_keyword_mappings()` / `set_keyword_mapping(...)` / `delete_keyword_mapping(...)` - 映射管理

### 货币换算

```python
PLATFORM_CURRENCY = {"xianyu": "CNY", "mercari": "JPY"}
BASE_CURRENCY = "CNY"
```

### 套利等级

| 差价百分比 | 等级 |
|-----------|------|
| ≥30% | high（强烈套利） |
| 15-30% | medium |
| 5-15% | low |
| <5% | none |

## API 端点

```
GET  /api/cross-platform/categories
GET  /api/cross-platform/categories/{id}
GET  /api/cross-platform/items?category_id=&sort_by=&platforms=
GET  /api/cross-platform/exchange-rates
PUT  /api/cross-platform/exchange-rates
GET  /api/cross-platform/keyword-mappings
POST /api/cross-platform/keyword-mappings
DELETE /api/cross-platform/keyword-mappings/{id}
```

## 前端页面

路由：`/cross-platform`，导航位置："发现商品 > 跨平台比价"

### 布局

1. 顶部操作栏：汇率设置 + 关键词映射管理
2. 品类对比卡片网格：各平台统计 + 差价百分比 + 套利 badge
3. 混排商品列表（选中品类后）：平台标签 + 原价 + 换算价 + 差价 + AI推荐 + 操作
