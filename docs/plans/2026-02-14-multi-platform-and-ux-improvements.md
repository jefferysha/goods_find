# 多平台支持 & UX 改进设计文档

日期: 2026-02-14

## 概述

本次更新包含四个主要改进：
1. ResultCard 卡片重新设计（信息分层+视觉优化）
2. Admin 角色权限控制（RBAC）
3. 修复"预估利润区间需配置价格本"硬编码提示
4. Mercari(煤炉) 多平台爬虫架构

## 1. ResultCard 卡片重设计

### 问题
- AI建议区块占据过多空间，视觉突兀
- 风险标签和利润提示堆叠，信息层次不清
- 底部操作按钮挤在一行，移动端体验差

### 方案：5层信息分层
```
┌─────────────────────────┐
│  [图片]                  │ ← 第1层：商品图片（平台标记、AI推荐、评估状态覆盖）
│  平台  AI推荐  评估状态   │
├─────────────────────────┤
│  标题                    │ ← 第2层：标题 + 价格 + 利润指标
│  ¥60        +¥20 (+25%) │
├─────────────────────────┤
│  [风险标签] [商品标签]    │ ← 第3层：标签区
├─────────────────────────┤
│  AI分析理由（可展开）     │ ← 第4层：AI详情（折叠）
├─────────────────────────┤
│  卖家 | 发布时间  操作栏  │ ← 第5层：操作栏
└─────────────────────────┘
```

### 改动文件
- `web-ui/src/pages/ResultsPage.tsx` - ResultCard 组件重写
- `web-ui/src/types/result.d.ts` - 添加价格本评估字段

## 2. Admin 权限控制

### 问题
- team_members 表有 role 字段但未使用
- 团队管理 API 无认证保护

### 方案
- `UserInfo` 模型添加 `role` 字段
- `get_user_by_id` 查询 team_members 获取角色
- 新增 `require_admin` 中间件
- 团队路由添加认证：查看需登录，修改需 admin

### 改动文件
- `src/domain/models/user.py`
- `src/services/auth_service.py`
- `src/api/auth_middleware.py`
- `src/api/routes/team.py`

## 3. 修复利润提示硬编码

### 问题
- ResultCard 硬编码显示"预估利润区间需配置价格本"
- 后端已返回评估字段但前端未使用

### 方案
- 使用 `item.estimated_profit` 和 `item.evaluation_status` 动态显示
- 有数据时显示 `+¥20 (+25.0%)`，无数据时显示"未配置价格本"
- 评估状态用彩色标签覆盖在图片上（超值捡漏/可收/偏高）

## 4. Mercari 多平台爬虫架构

### 设计决策

#### 任务模型
- 每个平台独立创建任务（`platform: "mercari"`）
- 通过价格本（PriceBook）统一品类：一个价格本条目的 keywords 可包含多平台关键词
- 例如：`keywords: ["科比手办", "コービー フィギュア"]`

#### 跨平台关联
- 价格本天然支持多关键词 → 自动聚合多平台数据
- 溢价地图概览返回 `platform_stats`（各平台中位价、数量、价格区间）
- 商品列表支持 `platform` 筛选参数

#### 爬虫架构
```
spider_v2.py (CLI入口)
    ├── platform == "xianyu"  → scrape_xianyu()   [需要登录态]
    ├── platform == "mercari" → scrape_mercari()   [无需登录]
    └── platform == "xxx"     → scrape_xxx()       [未来扩展]
```

- 每个平台独立爬虫模块，但输出统一格式
- 通过 `save_to_jsonl()` 统一入库（自动价格匹配）
- `spider_v2.py` 根据 task_config.platform 分发到对应爬虫

#### Mercari 爬虫实现
- Playwright 无头浏览器
- 搜索 API 拦截（`api.mercari.jp/v2/entities:search`）
- DOM 降级解析（拦截失败时）
- 支持价格区间、多页翻页、去重
- AI 分析和通知推送复用现有服务

### 改动文件

#### 新增
- `src/scraper_mercari.py` - Mercari 爬虫模块

#### 修改
- `spider_v2.py` - 多平台分发 + Mercari 无需登录态
- `src/domain/models/platform.py` - 注册 Mercari 平台
- `web-ui/src/types/platform.d.ts` - PlatformId 类型
- `web-ui/src/lib/platforms.ts` - 前端平台配置
- `src/api/routes/results.py` - 概览 API 返回 platform_stats
- `src/api/routes/premium_map.py` - 商品列表添加 platform 筛选
- `web-ui/src/api/premiumMap.ts` - CategoryOverview 类型更新
- `web-ui/src/components/premiumMap/ItemListDialog.tsx` - 平台筛选 UI

## 使用示例

### 创建 Mercari 监控任务

在 config.json 中添加：
```json
{
  "task_name": "科比手办-Mercari",
  "enabled": true,
  "search_keyword": "コービー フィギュア",
  "platform": "mercari",
  "max_pages": 3,
  "min_price": "1000",
  "max_price": "30000",
  "ai_prompt_base_file": "prompts/base_prompt.txt",
  "ai_prompt_criteria_file": "prompts/kobe_criteria.txt"
}
```

### 跨平台价格本配置

在价格本中将两个平台的关键词添加到同一品类：
```
品类名称: 科比手办
关键词: ["科比手办", "コービー フィギュア"]
行情价: ¥80
```

溢价地图将自动聚合两个平台的数据，展示各平台价格分布对比。
