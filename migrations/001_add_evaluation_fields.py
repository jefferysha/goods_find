"""
数据库迁移：为 items 表添加价格评估字段

迁移 ID: 001
创建时间: 2026-02-13
描述: 添加价格本评估相关字段到 items 表
"""
import aiosqlite
import os
import asyncio

DB_PATH = "data/monitor.db"


async def check_column_exists(db: aiosqlite.Connection, table: str, column: str) -> bool:
    """检查列是否已存在"""
    cursor = await db.execute(f"PRAGMA table_info({table})")
    columns = await cursor.fetchall()
    return any(col[1] == column for col in columns)


async def migrate_up():
    """执行迁移：添加新字段"""
    if not os.path.exists(DB_PATH):
        print(f"❌ 数据库文件不存在: {DB_PATH}")
        return False
    
    db = await aiosqlite.connect(DB_PATH)
    try:
        print("=" * 60)
        print("开始迁移：添加价格评估字段到 items 表")
        print("=" * 60)
        
        # 要添加的字段列表
        fields_to_add = [
            ("category_id", "TEXT"),
            ("category_name", "TEXT"),
            ("evaluation_status", "TEXT"),
            ("purchase_range_low", "REAL"),
            ("purchase_range_high", "REAL"),
            ("estimated_profit", "REAL"),
            ("estimated_profit_rate", "REAL"),
            ("premium_rate", "REAL"),
        ]
        
        # 逐个检查并添加字段
        for field_name, field_type in fields_to_add:
            exists = await check_column_exists(db, "items", field_name)
            if exists:
                print(f"✓ 字段 '{field_name}' 已存在，跳过")
            else:
                print(f"→ 添加字段 '{field_name}' ({field_type})...")
                await db.execute(f"ALTER TABLE items ADD COLUMN {field_name} {field_type}")
                print(f"✓ 字段 '{field_name}' 添加成功")
        
        await db.commit()
        
        # 创建索引
        print("\n→ 创建索引...")
        try:
            await db.execute("CREATE INDEX IF NOT EXISTS idx_items_category_id ON items(category_id)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_items_evaluation_status ON items(evaluation_status)")
            await db.commit()
            print("✓ 索引创建成功")
        except Exception as e:
            print(f"⚠ 索引创建警告: {e}")
        
        print("\n" + "=" * 60)
        print("✅ 迁移完成！")
        print("=" * 60)
        
        # 显示表结构
        print("\n当前 items 表结构：")
        cursor = await db.execute("PRAGMA table_info(items)")
        columns = await cursor.fetchall()
        for col in columns:
            print(f"  - {col[1]} ({col[2]})")
        
        return True
        
    except Exception as e:
        print(f"\n❌ 迁移失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        await db.close()


async def migrate_down():
    """回滚迁移：删除新字段（SQLite 不支持 DROP COLUMN，需要重建表）"""
    print("⚠️  SQLite 不支持直接删除列")
    print("如需回滚，请备份数据后删除数据库文件重新初始化")
    return False


async def main():
    """主函数"""
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "down":
        success = await migrate_down()
    else:
        success = await migrate_up()
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())
