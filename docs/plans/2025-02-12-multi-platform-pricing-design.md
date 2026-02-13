# 多平台聚合 + 溢价分析优化 设计方案

> 日期: 2025-02-12
> 状态: 已确认，准备实施

## 背景

当前平台仅接入闲鱼，需要在数据模型和 UI 上为多平台做好准备，同时优化市场价录入和溢价对比体验。

## 决策摘要

| 问题 | 决策 |
|------|------|
| 使用场景 | 个人/极小范围使用 |
| 市场价来源 | 保持手动录入，优化体验（批量导入、快捷录入、品类模板） |
| 多平台展示 | 平台聚合视图：数据模型加 platform 字段，UI 预留多平台结构 |
| 平台视觉 | Tab 筛选 + 商品卡片平台标识，两者结合 |

## Part 1: 数据模型扩展

### 平台注册表

```python
PLATFORMS = {
    "xianyu": {"name": "闲鱼", "icon": "xianyu", "color": "#FF6600", "enabled": True},
    "zhuanzhuan": {"name": "转转", "icon": "zhuanzhuan", "color": "#5AC8FA", "enabled": False},
    "jd_used": {"name": "京东二手", "icon": "jd", "color": "#E4393C", "enabled": False},
    "pdd_used": {"name": "拼多多二手", "icon": "pdd", "color": "#E02E24", "enabled": False},
    "taobao_used": {"name": "淘宝二手", "icon": "taobao", "color": "#FF5000", "enabled": False},
}
```

### 模型变更

- `Task` 增加 `platform: str = "xianyu"`
- `ResultItem` 增加 `platform: str = "xianyu"`（通过爬取时自动填入）
- `MarketPrice` 增加:
  - `platform: str = "xianyu"`
  - `category: str = ""` — 品类分类
  - `fair_used_price: float | None = None` — 合理二手价
  - `source: str = ""` — 价格来源说明

## Part 2: 市场价录入优化

- 批量导入 CSV
- 结果页"设为基准价"快捷按钮
- 品类模板预设
- `MarketPrice` 增加 `fair_used_price` 用于更精准的溢价对比

## Part 3: 前端 UI 改造

### 结果页
- 顶部平台 Tab 切换（全部 | 闲鱼 | 转转(即将支持) | ...）
- 未启用平台灰色 + 角标
- Tab 显示各平台商品数量

### 商品卡片
- 左上角平台 Logo/颜色角标
- 溢价对比增强：参考价 + 溢价率进度条 + 颜色分级徽章
- 操作按钮：收藏/对比/详情

### 任务创建
- 增加"目标平台"下拉选择
- 未启用平台显示但置灰 + "(即将支持)"

### 仪表盘
- 统计卡片增加"已接入平台数"指标
- 价格趋势支持按平台叠加
- 新增"捡漏排行榜"

## 实施优先级

### 第 1 批: 数据基础
1. 后端平台注册表 + 模型 platform 字段
2. MarketPrice 新增字段
3. 前端类型定义同步

### 第 2 批: UI 聚合视图
4. 结果页平台 Tab + 商品卡片平台角标
5. 任务创建平台选择
6. 溢价对比展示增强

### 第 3 批: 体验优化
7. 市场价批量导入 + 快捷录入
8. 仪表盘平台维度
9. 捡漏排行榜
