"""SQLite 数据库管理器"""
import aiosqlite
import os

DB_PATH = "data/monitor.db"


async def get_db() -> aiosqlite.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    return db


async def init_db():
    """初始化数据库表"""
    db = await get_db()
    try:
        await db.executescript("""
            -- ==========================================
            -- items: 商品主表（替代 JSONL 文件读取）
            -- ==========================================
            CREATE TABLE IF NOT EXISTS items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_id TEXT NOT NULL,                  -- 商品ID（平台侧）
                task_name TEXT NOT NULL,                -- 任务名称
                keyword TEXT NOT NULL,                  -- 搜索关键词
                platform TEXT DEFAULT 'xianyu',         -- 平台

                -- 常查询字段（独立列 + 索引）
                title TEXT,                             -- 商品标题
                price REAL,                             -- 当前售价（数字化）
                original_price REAL,                    -- 原价
                region TEXT,                            -- 发货地区
                publish_time TEXT,                      -- 发布时间
                crawl_time TEXT NOT NULL,               -- 爬取时间
                item_link TEXT,                         -- 商品链接
                image_url TEXT,                         -- 主图链接
                want_count INTEGER DEFAULT 0,           -- 想要人数
                view_count INTEGER DEFAULT 0,           -- 浏览量

                -- AI 分析核心字段
                is_recommended INTEGER DEFAULT 0,       -- 是否推荐（0/1）
                ai_reason TEXT,                         -- 推荐/不推荐理由
                risk_tags TEXT,                         -- JSON: ["标签1","标签2"]

                -- 价格本评估字段
                category_id TEXT,                       -- 关联的价格本品类ID
                category_name TEXT,                     -- 品类名称
                evaluation_status TEXT,                 -- 评估状态: great_deal/good_deal/overpriced/no_config
                purchase_range_low REAL,                -- 收购区间下限（理想收购价）
                purchase_range_high REAL,               -- 收购区间上限
                estimated_profit REAL,                  -- 预估利润
                estimated_profit_rate REAL,             -- 预估利润率
                premium_rate REAL,                      -- 溢价率（相对行情价）

                -- 卖家核心字段
                seller_name TEXT,
                seller_credit TEXT,                     -- 卖家信用等级
                seller_registration TEXT,               -- 注册时长

                -- "口袋"字段：存完整嵌套 JSON，不拆
                raw_item_info TEXT,                     -- JSON: 完整商品信息
                raw_seller_info TEXT,                   -- JSON: 完整卖家信息
                raw_ai_analysis TEXT,                   -- JSON: 完整AI分析

                created_at TEXT DEFAULT (datetime('now')),
                UNIQUE(item_id, crawl_time)             -- 同一商品同一时间不重复
            );
            CREATE INDEX IF NOT EXISTS idx_items_keyword ON items(keyword);
            CREATE INDEX IF NOT EXISTS idx_items_crawl_time ON items(crawl_time);
            CREATE INDEX IF NOT EXISTS idx_items_price ON items(price);
            CREATE INDEX IF NOT EXISTS idx_items_recommended ON items(is_recommended);
            CREATE INDEX IF NOT EXISTS idx_items_task ON items(task_name);
            CREATE INDEX IF NOT EXISTS idx_items_item_id ON items(item_id);
            CREATE INDEX IF NOT EXISTS idx_items_platform ON items(platform);
            CREATE INDEX IF NOT EXISTS idx_items_category_id ON items(category_id);
            CREATE INDEX IF NOT EXISTS idx_items_evaluation_status ON items(evaluation_status);

            -- ==========================================
            -- 以下为原有业务表（保留）
            -- ==========================================
            CREATE TABLE IF NOT EXISTS alert_rules (
                id TEXT PRIMARY KEY,
                task_id INTEGER,
                name TEXT NOT NULL,
                enabled INTEGER DEFAULT 1,
                conditions TEXT NOT NULL,  -- JSON
                channels TEXT NOT NULL,    -- JSON
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS favorites (
                id TEXT PRIMARY KEY,
                item_id TEXT NOT NULL,
                task_id INTEGER NOT NULL,
                item_snapshot TEXT NOT NULL,  -- JSON
                note TEXT DEFAULT '',
                created_at TEXT DEFAULT (datetime('now')),
                UNIQUE(item_id)
            );

            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                display_name TEXT DEFAULT '',
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            );
            CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);

            -- ==========================================
            -- price_book: 价格本（定价模板）
            -- ==========================================
            CREATE TABLE IF NOT EXISTS price_book (
                id TEXT PRIMARY KEY,
                category_name TEXT NOT NULL,
                keywords TEXT DEFAULT '[]',             -- JSON: 关联关键词列表
                new_price REAL,                         -- 新品参考价
                market_price REAL,                      -- 二手行情价
                market_price_source TEXT DEFAULT 'manual', -- manual / auto_7d_median
                target_sell_price REAL,                 -- 目标出货价
                shipping_fee REAL DEFAULT 0,
                refurbish_fee REAL DEFAULT 0,
                platform_fee_rate REAL DEFAULT 0.05,
                other_fee REAL DEFAULT 0,
                min_profit_rate REAL DEFAULT 0.15,
                ideal_profit_rate REAL DEFAULT 0.25,
                platform TEXT DEFAULT 'xianyu',
                note TEXT DEFAULT '',
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_price_book_category ON price_book(category_name);

            -- ==========================================
            -- purchase_items: 采购清单
            -- ==========================================
            CREATE TABLE IF NOT EXISTS purchase_items (
                id TEXT PRIMARY KEY,
                item_id TEXT DEFAULT '',
                title TEXT DEFAULT '',
                price REAL DEFAULT 0,
                image_url TEXT DEFAULT '',
                item_link TEXT DEFAULT '',
                platform TEXT DEFAULT 'xianyu',
                keyword TEXT DEFAULT '',
                price_book_id TEXT,
                estimated_profit REAL,
                estimated_profit_rate REAL,
                purchase_range_low REAL,
                purchase_range_high REAL,
                status TEXT DEFAULT 'new',              -- new/contacting/negotiating/purchased/abandoned
                assignee TEXT,
                actual_price REAL,
                note TEXT DEFAULT '',
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_purchase_status ON purchase_items(status);
            CREATE INDEX IF NOT EXISTS idx_purchase_assignee ON purchase_items(assignee);

            -- ==========================================
            -- inventory_items: 库存台账
            -- ==========================================
            CREATE TABLE IF NOT EXISTS inventory_items (
                id TEXT PRIMARY KEY,
                title TEXT DEFAULT '',
                platform TEXT DEFAULT 'xianyu',
                keyword TEXT DEFAULT '',
                image_url TEXT DEFAULT '',
                item_link TEXT DEFAULT '',
                purchase_price REAL DEFAULT 0,
                shipping_fee REAL DEFAULT 0,
                refurbish_fee REAL DEFAULT 0,
                platform_fee REAL DEFAULT 0,
                other_fee REAL DEFAULT 0,
                total_cost REAL DEFAULT 0,
                listing_price REAL,
                status TEXT DEFAULT 'in_stock',         -- in_stock/refurbishing/listed/sold/returned
                purchase_item_id TEXT,
                price_book_id TEXT,
                assignee TEXT,
                sold_price REAL,
                sold_channel TEXT,
                sold_at TEXT,
                note TEXT DEFAULT '',
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory_items(status);
            CREATE INDEX IF NOT EXISTS idx_inventory_assignee ON inventory_items(assignee);
            CREATE INDEX IF NOT EXISTS idx_inventory_keyword ON inventory_items(keyword);

            -- ==========================================
            -- sale_records: 销售记录
            -- ==========================================
            CREATE TABLE IF NOT EXISTS sale_records (
                id TEXT PRIMARY KEY,
                inventory_item_id TEXT NOT NULL,
                title TEXT DEFAULT '',
                keyword TEXT DEFAULT '',
                platform TEXT DEFAULT 'xianyu',
                purchase_price REAL DEFAULT 0,
                total_cost REAL DEFAULT 0,
                sold_price REAL DEFAULT 0,
                profit REAL DEFAULT 0,
                profit_rate REAL DEFAULT 0,
                sold_channel TEXT DEFAULT '',
                assignee TEXT,
                sold_at TEXT DEFAULT (datetime('now')),
                created_at TEXT DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_sales_sold_at ON sale_records(sold_at);
            CREATE INDEX IF NOT EXISTS idx_sales_keyword ON sale_records(keyword);
            CREATE INDEX IF NOT EXISTS idx_sales_assignee ON sale_records(assignee);

            -- ==========================================
            -- team_members: 团队成员扩展信息
            -- ==========================================
            CREATE TABLE IF NOT EXISTS team_members (
                user_id INTEGER PRIMARY KEY,
                role TEXT DEFAULT 'member',              -- admin / member
                focus_keywords TEXT DEFAULT '[]',        -- JSON: 关注品类
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            -- ==========================================
            -- seller_lists: 卖家黑白名单
            -- ==========================================
            CREATE TABLE IF NOT EXISTS seller_lists (
                seller_id TEXT PRIMARY KEY,
                seller_name TEXT NOT NULL DEFAULT '',
                list_type TEXT NOT NULL DEFAULT 'blacklist',  -- blacklist / whitelist
                reason TEXT DEFAULT '',
                created_at TEXT DEFAULT (datetime('now'))
            );

            -- ==========================================
            -- seller_profiles: 卖家信用档案（缓存）
            -- ==========================================
            CREATE TABLE IF NOT EXISTS seller_profiles (
                seller_id TEXT PRIMARY KEY,
                seller_name TEXT DEFAULT '',
                credit_score REAL DEFAULT 0,
                credit_level TEXT DEFAULT 'normal',     -- reliable / normal / risky
                total_sold INTEGER DEFAULT 0,
                positive_rate REAL DEFAULT 0,
                account_age_days INTEGER DEFAULT 0,
                last_updated TEXT DEFAULT (datetime('now'))
            );

            -- ==========================================
            -- market_prices: 市场基准价（替代 market_prices.json）
            -- ==========================================
            CREATE TABLE IF NOT EXISTS market_prices (
                id TEXT PRIMARY KEY,
                task_id INTEGER NOT NULL,
                keyword TEXT NOT NULL,
                reference_price REAL NOT NULL,
                fair_used_price REAL,
                condition TEXT DEFAULT 'good',
                category TEXT DEFAULT '',
                platform TEXT DEFAULT 'xianyu',
                source TEXT DEFAULT '',
                note TEXT DEFAULT '',
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_market_prices_task_id ON market_prices(task_id);
            CREATE INDEX IF NOT EXISTS idx_market_prices_keyword ON market_prices(keyword);

            -- ==========================================
            -- pricing_thresholds: 溢价阈值（替代 pricing_thresholds.json）
            -- ==========================================
            CREATE TABLE IF NOT EXISTS pricing_thresholds (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER,
                low_price_max REAL NOT NULL DEFAULT -15.0,
                fair_max REAL NOT NULL DEFAULT 5.0,
                slight_premium_max REAL NOT NULL DEFAULT 20.0,
                UNIQUE(task_id)
            );

            -- ==========================================
            -- login_states: 登录/账号状态（替代 state/*.json + xianyu_state.json）
            -- ==========================================
            CREATE TABLE IF NOT EXISTS login_states (
                name TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                updated_at TEXT DEFAULT (datetime('now'))
            );

            -- ==========================================
            -- cross_platform_config: 跨平台比价配置（汇率等）
            -- ==========================================
            CREATE TABLE IF NOT EXISTS cross_platform_config (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT UNIQUE NOT NULL,
                value TEXT NOT NULL,
                updated_at TEXT DEFAULT (datetime('now'))
            );

            -- ==========================================
            -- keyword_category_map: 关键词→品类手动映射
            -- ==========================================
            CREATE TABLE IF NOT EXISTS keyword_category_map (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                keyword TEXT NOT NULL,
                platform TEXT NOT NULL,
                category_id TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                UNIQUE(keyword, platform)
            );
        """)
        await db.commit()
    finally:
        await db.close()
