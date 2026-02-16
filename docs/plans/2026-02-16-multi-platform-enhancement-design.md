# 多平台增强设计方案

日期: 2026-02-16

## 概述

对二手商品监控平台进行 5 项核心增强：

1. **爬取时间展示** — 结果卡片显示爬取时间 + 按时间排序/筛选
2. **品类层级归类** — 混合方案：手动品类树骨架 + AI 自动归类 + AI 建议新品类
3. **货币标识修复** — `¥1,234 JPY (≈¥58 CNY)` 风格 + 数据层增加 currency 字段
4. **多平台动态化** — 一对多模式：目标平台(单选) + 货源平台(多选)，去硬编码
5. **AI 同商品识别** — 两层匹配：型号级归组 + 成色分档，独立比价分析页

## 阶段一：基础数据层 + 展示修复

### 数据层变更

- `items` 表新增: `currency TEXT DEFAULT 'CNY'`
- `PlatformInfo` 模型新增: `currency` 字段
- 爬虫写入 currency: 闲鱼→CNY, Mercari→JPY
- `parse_price` 提取 `price_numeric` (已有 price REAL 列)

### 前端改造

- ResultsPage: 卡片显示爬取时间、货币标识
- ResultsPage: 按爬取时间排序/筛选
- CrossPlatformPage: 动态平台选择，去硬编码

## 阶段二：品类树系统

### 新建表: `category_tree`

```sql
CREATE TABLE category_tree (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT,
    level INTEGER NOT NULL,
    keywords TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
```

### 新增服务: `CategoryService`

- get_category_tree / create_category / ai_classify / suggest_new_category

### 新增 API

- GET/POST/PUT/DELETE `/api/categories`

## 阶段三：AI 商品匹配 + 比价分析

### 新建表

- `product_groups`: 商品组(型号级聚合)
- `item_product_match`: 商品↔商品组映射(含成色分档)

### 新增服务: `ProductMatchService`

- match_item / batch_match / get_arbitrage_analysis / merge_groups

### 新增页面: `/product-match`

- 商品组卡片列表 + 套利分析 + 手动调整匹配
