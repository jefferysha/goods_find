# 二手商品智能分析平台 — 升级设计文档

> 日期：2025-02-12
> 状态：已确认
> 作者：AI 辅助设计 + 用户确认

---

## 1. 项目重新定位

从"闲鱼智能监控机器人"升级为**二手商品智能分析平台**。

核心能力从"监控 + 通知"扩展为"监控 + 分析 + 决策辅助"。

## 2. 现状评估

### 2.1 架构现状

- **已经是前后端分离架构**：前端 `web-ui/`（Vue 3 + Vite + TS + shadcn-vue + Tailwind），后端 FastAPI 提供 RESTful API
- 开发时通过 Vite proxy 解耦，生产环境单体部署（后端托管前端静态文件）
- 分层清晰：API → Services → Domain → Infrastructure

### 2.2 前端代码规模

| 模块 | 行数 |
|------|------|
| Views（6 个页面） | 1,470 |
| 业务组件（8 个） | 786 |
| Composables（6 个） | 753 |
| API 层 + 类型定义 | 384 |
| 基础设施（HTTP/WS） | 162 |
| **业务代码总计** | **~3,555 行** |

### 2.3 迁移到 React 的成本评估：中等偏低

- 技术栈高度对齐（Vite + TS + Tailwind + shadcn），样式和 UI 组件 API 几乎一致
- API 层、类型定义、WebSocket 服务是纯 TS，可直接复用
- Composables → React Hooks 1:1 对应
- 预估 1~2 天可完成框架切换（不含新功能开发）

## 3. 分期规划

### 第 1 期：前端重构 + 溢价分析（核心）

- 前端迁移到 React + TS + Vite + shadcn/ui + Tailwind
- 新增"市场基准价"配置（用户自定义每个关键词的参考价）
- 同平台比价引擎（同一搜索结果内的统计分析：均价、中位价、最低价）
- AI 溢价评估（在现有 AI 分析 prompt 中增加定价合理性判断）
- 溢价率计算与标记（商品卡片上直观展示溢价/低价标签）

### 第 2 期：数据分析 + 智能提醒

- 数据仪表盘（价格趋势图、商品量变化、热门关键词统计）
- 智能提醒规则引擎（"低于 X 元提醒"、"溢价率低于 Y% 时推送"）
- 历史价格追踪（跟踪同一商品 ID 的价格变化，检测降价）
- 存储升级：JSONL → JSONL + SQLite（历史数据查询需要）

### 第 3 期：收藏对比 + 多站点扩展

- 收藏夹 + 商品横向对比
- 扩展数据源（转转、得物等二手平台）
- 跨平台价格对比

## 4. 技术栈变更

| 层 | 现有 | 升级后 |
|---|---|---|
| 前端框架 | Vue 3 | React 18 + TypeScript |
| UI 组件 | shadcn-vue | shadcn/ui (React) |
| 样式 | Tailwind CSS | Tailwind CSS（不变） |
| 构建 | Vite | Vite（不变） |
| 图表 | 无 | Recharts（第 2 期） |
| 状态管理 | Composables | React Hooks + Zustand（第 2 期按需引入） |
| 后端 | FastAPI | FastAPI（不变） |
| 数据存储 | JSONL 文件 | JSONL + SQLite（第 2 期） |

## 5. 第 1 期详细设计

### 5.1 前端项目结构（React 版）

```
web-ui/src/
├── app/                              # 应用入口与全局配置
│   ├── App.tsx
│   ├── main.tsx
│   ├── providers.tsx                 # 全局 Provider（Toast, Auth, WS）
│   └── routes.tsx                    # 路由定义 + 守卫
│
├── components/
│   ├── ui/                           # shadcn/ui 基础组件（自动生成，不手动改）
│   │
│   ├── layout/                       # 全局布局
│   │   ├── MainLayout.tsx            # 主布局壳（侧栏+顶栏+内容区）
│   │   ├── Sidebar/
│   │   │   ├── Sidebar.tsx           # 侧边栏容器
│   │   │   ├── SidebarNav.tsx        # 导航菜单列表
│   │   │   └── SidebarNavItem.tsx    # 单个导航项
│   │   └── Header/
│   │       ├── Header.tsx            # 顶栏容器
│   │       ├── HeaderUserMenu.tsx    # 用户下拉菜单
│   │       └── HeaderBreadcrumb.tsx  # 面包屑导航
│   │
│   ├── tasks/                        # 任务管理模块
│   │   ├── TaskTable/
│   │   │   ├── TaskTable.tsx         # 任务表格容器
│   │   │   ├── TaskTableRow.tsx      # 单行渲染（状态、操作）
│   │   │   └── TaskStatusBadge.tsx   # 运行状态徽章
│   │   ├── TaskForm/
│   │   │   ├── TaskForm.tsx          # 表单容器
│   │   │   ├── TaskBasicFields.tsx   # 基础字段（名称、关键词、描述）
│   │   │   ├── TaskPriceFields.tsx   # 价格区间字段
│   │   │   ├── TaskFilterFields.tsx  # 筛选字段（区域、时间、仅个人）
│   │   │   ├── TaskScheduleFields.tsx# 定时规则配置
│   │   │   └── TaskAccountSelect.tsx # 账号选择器
│   │   └── TaskActions/
│   │       ├── TaskRunButton.tsx     # 启动/停止按钮
│   │       └── TaskDeleteDialog.tsx  # 删除确认对话框
│   │
│   ├── accounts/                     # 账号管理模块
│   │   ├── AccountTable.tsx          # 账号列表
│   │   ├── AccountForm.tsx           # 新增/编辑表单
│   │   └── AccountStatusIndicator.tsx# 登录状态指示器
│   │
│   ├── results/                      # 结果展示模块
│   │   ├── ResultsGrid/
│   │   │   ├── ResultsGrid.tsx       # 网格容器
│   │   │   └── ResultsEmptyState.tsx # 无结果空状态
│   │   ├── ResultCard/
│   │   │   ├── ResultCard.tsx        # 商品卡片容器
│   │   │   ├── ResultCardImage.tsx   # 商品图片（含缩放）
│   │   │   ├── ResultCardInfo.tsx    # 标题、描述、卖家信息
│   │   │   ├── ResultCardAiScore.tsx # AI 评分/推荐标签
│   │   │   └── ResultCardPrice.tsx   # 价格展示 + 溢价标签
│   │   └── ResultsFilter/
│   │       ├── ResultsFilterBar.tsx  # 筛选栏容器
│   │       ├── ResultsFilterTask.tsx # 按任务筛选
│   │       ├── ResultsFilterPrice.tsx# 按价格区间筛选
│   │       ├── ResultsFilterSort.tsx # 排序方式选择
│   │       └── ResultsFilterPremium.tsx # 【新增】按溢价率筛选
│   │
│   ├── pricing/                      # 【新增】溢价分析模块
│   │   ├── MarketPrice/
│   │   │   ├── MarketPriceConfig.tsx # 基准价配置面板（任务维度）
│   │   │   ├── MarketPriceInput.tsx  # 单个基准价输入行
│   │   │   └── MarketPriceHistory.tsx# 基准价修改历史
│   │   ├── PriceAnalysis/
│   │   │   ├── PriceTag.tsx          # 溢价/低价/合理 彩色标签
│   │   │   ├── PriceCompareBar.tsx   # 价格对比条形图（当前价 vs 基准价）
│   │   │   └── PriceStats.tsx        # 同批次统计摘要（均价/中位价/最低价）
│   │   └── PremiumAlert/
│   │       ├── PremiumAlertBanner.tsx # 高溢价警告横幅
│   │       └── PremiumAlertConfig.tsx # 溢价阈值配置
│   │
│   ├── logs/                         # 日志模块
│   │   ├── LogViewer.tsx             # 日志查看器（虚拟滚动）
│   │   ├── LogLevelBadge.tsx         # 日志级别徽章
│   │   └── LogTaskFilter.tsx         # 按任务筛选日志
│   │
│   └── settings/                     # 设置模块
│       ├── SettingsLayout.tsx        # 设置页 Tab 布局
│       ├── SettingsNotification.tsx  # 通知渠道配置
│       ├── SettingsAiModel.tsx       # AI 模型配置
│       ├── SettingsProxy.tsx         # 代理配置
│       └── SettingsSystem.tsx        # 系统信息/状态
│
├── hooks/                            # React Hooks（按领域分组）
│   ├── auth/
│   │   └── useAuth.ts               # 登录状态、登出
│   ├── tasks/
│   │   └── useTasks.ts              # 任务 CRUD、启停控制
│   ├── results/
│   │   └── useResults.ts            # 结果列表、筛选、排序
│   ├── pricing/                      # 【新增】
│   │   ├── usePricing.ts            # 溢价计算（基准价对比 + 同批次统计）
│   │   └── useMarketPrice.ts        # 基准价 CRUD
│   ├── logs/
│   │   └── useLogs.ts               # 日志加载、增量更新
│   ├── settings/
│   │   └── useSettings.ts           # 设置读写
│   └── shared/
│       ├── useWebSocket.ts          # WebSocket 连接管理
│       └── useDebounce.ts           # 防抖（搜索、输入等）
│
├── api/                              # API 客户端（按领域分文件）
│   ├── http.ts                       # 基础 HTTP 客户端（拦截器、401 处理）
│   ├── tasks.ts
│   ├── results.ts
│   ├── accounts.ts
│   ├── logs.ts
│   ├── settings.ts
│   ├── prompts.ts
│   └── pricing.ts                    # 【新增】基准价 API
│
├── types/                            # 类型定义
│   ├── task.d.ts
│   ├── result.d.ts
│   ├── account.d.ts
│   ├── settings.d.ts
│   └── pricing.d.ts                  # 【新增】MarketPrice, PriceAnalysis 等
│
├── services/
│   └── websocket.ts                  # WebSocket 服务类
│
└── lib/
    ├── utils.ts                      # 通用工具（cn(), formatDate() 等）
    └── pricing-utils.ts              # 【新增】溢价率计算、价格区间分档
```

### 5.2 页面路由

| 路径 | 页面 | 第 1 期变化 |
|------|------|------------|
| `/login` | 登录 | 无变化 |
| `/tasks` | 任务管理 | 新增"市场基准价"配置入口 |
| `/accounts` | 账号管理 | 无变化 |
| `/results` | 结果查看 | 新增溢价标签、价格统计摘要、按溢价率筛选 |
| `/logs` | 运行日志 | 无变化 |
| `/settings` | 系统设置 | 无变化 |

### 5.3 迁移映射

| Vue | React | 改动程度 |
|-----|-------|---------|
| `ref()` / `reactive()` | `useState()` | 低 |
| `watch()` / `watchEffect()` | `useEffect()` | 低 |
| `computed()` | `useMemo()` | 低 |
| `onMounted()` / `onUnmounted()` | `useEffect()` 返回清理函数 | 低 |
| `.vue` 模板 `v-if` / `v-for` | JSX `{cond && ...}` / `.map()` | 中（机械转换） |
| shadcn-vue 组件 | shadcn/ui 组件 | 低（API 几乎一样） |
| Vue Router `beforeEach` | React Router 包裹 `<ProtectedRoute>` | 低 |
| `api/*.ts`（纯 TS） | `api/*.ts`（直接复用） | 无 |
| `types/*.d.ts` | `types/*.d.ts`（直接复用） | 无 |
| `websocket.ts`（纯 TS） | `websocket.ts`（直接复用） | 无 |

## 6. 溢价分析设计

### 6.1 数据模型

#### 市场基准价（用户自定义）

```python
# src/domain/models/market_price.py
class MarketPrice:
    id: str                    # UUID
    task_id: str               # 关联的任务 ID
    keyword: str               # 商品关键词（如 "MacBook Air M1 16G"）
    reference_price: float     # 用户设定的市场参考价（元）
    condition: str             # 成色条件："new" | "like_new" | "good" | "fair"
    note: str                  # 用户备注（如 "2024款 官方价 7999"）
    created_at: datetime
    updated_at: datetime
```

一个任务可以配置**多个基准价**，按成色区分。例如 MacBook Air M1：
- 全新未拆封：6500 元
- 充新/99新：5500 元
- 正常使用成色：4800 元

#### 价格分析结果（计算产出）

```python
# src/domain/models/price_analysis.py
class PriceAnalysis:
    item_id: str               # 商品唯一标识
    item_price: float          # 商品标价
    reference_price: float     # 匹配到的基准价
    premium_rate: float        # 溢价率 = (标价 - 基准价) / 基准价 * 100
    price_level: str           # "low_price" | "fair" | "slight_premium" | "high_premium"
    batch_stats: BatchStats    # 同批次统计

class BatchStats:
    avg_price: float           # 同批次均价
    median_price: float        # 中位价
    min_price: float           # 最低价
    max_price: float           # 最高价
    total_count: int           # 同批次商品总数
    percentile: float          # 当前商品在批次中的价格百分位
```

#### 价格分档规则（默认值，可自定义）

| 溢价率 | 标签 | 颜色 |
|--------|------|------|
| < -15% | 低价捡漏 | 绿色 |
| -15% ~ +5% | 价格合理 | 灰色/蓝色 |
| +5% ~ +20% | 轻微溢价 | 橙色 |
| > +20% | 高溢价 | 红色 |

阈值可在设置中按任务级别自定义。

### 6.2 后端 API

#### 基准价 CRUD

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/pricing/market-prices?task_id=xxx` | 获取某任务的所有基准价 |
| `POST` | `/api/pricing/market-prices` | 创建基准价 |
| `PUT` | `/api/pricing/market-prices/{id}` | 更新基准价 |
| `DELETE` | `/api/pricing/market-prices/{id}` | 删除基准价 |

#### 价格分析

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/pricing/analysis?task_id=xxx&run_id=xxx` | 获取某次运行的价格分析结果 |
| `GET` | `/api/pricing/batch-stats?task_id=xxx&run_id=xxx` | 获取同批次价格统计 |

#### 阈值配置

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/pricing/thresholds?task_id=xxx` | 获取溢价阈值配置 |
| `PUT` | `/api/pricing/thresholds` | 更新阈值配置 |

### 6.3 后端新增文件

```
src/
├── api/routes/
│   └── pricing.py                        # 溢价分析路由
├── domain/models/
│   ├── market_price.py                   # 基准价模型
│   └── price_analysis.py                 # 价格分析模型
├── domain/repositories/
│   └── market_price_repository.py        # 基准价仓储接口
├── infrastructure/persistence/
│   └── json_market_price_repository.py   # JSON 文件持久化
└── services/
    └── pricing_service.py                # 溢价计算服务
```

### 6.4 计算流程

```
爬虫抓取商品列表
       ↓
PricingService.analyze_batch(items, task_id)
       ↓
  ┌──────────────┐
  │  同批次统计    │ ← 计算均价/中位价/最低价/百分位
  └──────┬───────┘
         ↓
  ┌──────────────┐
  │  基准价匹配    │ ← 查找该任务配置的 MarketPrice
  └──────┬───────┘
         ↓
  ┌──────────────┐
  │  溢价率计算    │ ← (标价 - 基准价) / 基准价 * 100
  └──────┬───────┘
         ↓
  ┌──────────────┐
  │  AI 定价评估   │ ← 在现有 AI prompt 中追加定价分析指令
  └──────┬───────┘
         ↓
  PriceAnalysis 结果写入 JSONL + 通过 WebSocket 推送前端
```

溢价分析在**爬虫管道末端**执行，每次爬取完即可看到分析结果。

### 6.5 AI Prompt 增强

在现有的 AI 分析 prompt 末尾追加定价分析指令：

```
【定价分析】
该商品标价为 {item_price} 元。
用户设定的市场参考价为 {reference_price} 元（{condition} 成色）。
同批次 {total_count} 件商品的均价为 {avg_price} 元，中位价 {median_price} 元。

请综合以下因素评估定价合理性：
1. 与用户设定基准价的偏差
2. 与同批次商品的价格对比
3. 商品描述中的成色、配件、保修等信息
4. 卖家信誉和交易历史

输出：定价评级（低价捡漏/价格合理/轻微溢价/高溢价）+ 一句话理由
```

## 7. 第 2 期预留设计（不在第 1 期实现）

### 数据仪表盘

- 新增 `/dashboard` 页面
- 图表库：Recharts
- 核心图表：价格趋势折线图、商品数量柱状图、溢价率分布饼图、热门关键词词云

### 智能提醒规则引擎

- 规则模型：`AlertRule { condition, threshold, action, channels }`
- 支持条件组合："价格 < X AND 溢价率 < Y% AND AI评分 > Z"
- 在通知服务中增加规则匹配层

### 历史价格追踪

- 需要 SQLite 存储历史快照
- 按商品 ID 去重，跟踪同一商品的多次出现
- 降价检测 = 本次价格 < 上次记录价格

### 收藏与对比（第 3 期）

- 收藏夹：本地存储 + 后端持久化
- 对比表格：选择 2~4 个商品横向对比价格、成色、卖家等维度

## 8. 实施建议

1. **第 1 期预估工时**：3~5 天
   - 前端 React 重构：1~2 天
   - 溢价分析后端：1 天
   - 溢价分析前端组件：1 天
   - 联调测试：0.5~1 天

2. **建议在新分支上开发**，保留 Vue 版本作为回退

3. **优先保证现有功能不回归**，再叠加新功能

4. **第 2 期开始前评估是否需要引入 SQLite**，如果历史数据量不大，JSONL 可以继续用
