"""
测试价格匹配服务
"""
import sys
sys.path.insert(0, '/Users/jiayin/Documents/code_manager/h-backend/ai-goofish-monitor')

from src.services.price_matching_service import PriceMatchingService

# 模拟商品数据
test_item = {
    '搜索关键字': 'MacBook Air M2',
    '商品信息': {
        '商品ID': 'test123',
        '商品标题': 'MacBook Air M2 13寸 8+256G 99新 无磕碰',
        '当前售价': '¥7,200',
        '商品主图链接': 'https://example.com/image.jpg',
        '商品链接': 'https://example.com/item/123'
    },
    'platform': 'xianyu',
    '爬取时间': '2026-02-13 10:30:00'
}

# 创建服务实例
service = PriceMatchingService()

# 执行匹配和评估
try:
    result = service.match_and_evaluate(test_item)
    
    print("=" * 60)
    print("价格匹配服务测试结果")
    print("=" * 60)
    print(f"商品标题: {test_item['商品信息']['商品标题']}")
    print(f"当前售价: {test_item['商品信息']['当前售价']}")
    print("-" * 60)
    print(f"匹配品类: {result.get('category_name') or '未匹配'}")
    print(f"评估状态: {result.get('evaluation_status')}")
    
    if result.get('purchase_range_low') is not None:
        print(f"收购区间: ¥{result.get('purchase_range_low', 0):.0f} ~ ¥{result.get('purchase_range_high', 0):.0f}")
    else:
        print(f"收购区间: 无配置")
    
    if result.get('estimated_profit') is not None:
        print(f"预估利润: ¥{result.get('estimated_profit', 0):.0f}")
        print(f"预估利润率: {result.get('estimated_profit_rate', 0) * 100:.1f}%")
    else:
        print(f"预估利润: 无数据")
    
    if result.get('premium_rate') is not None:
        print(f"溢价率: {result.get('premium_rate') * 100:.1f}%")
    print("=" * 60)
    
except Exception as e:
    print(f"测试失败: {e}")
    import traceback
    traceback.print_exc()
