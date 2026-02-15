"""
价格本自动匹配与评估服务
"""
import re
from typing import Optional, Dict, Any, Tuple


class PriceMatchingService:
    """商品自动匹配价格本并计算评估信息"""
    
    def __init__(self):
        from src.services.price_book_service import PriceBookService
        self.price_book_service = PriceBookService()
    
    async def match_and_evaluate(self, item_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        商品自动匹配价格本并计算评估信息
        
        Args:
            item_data: 商品原始数据
            
        Returns:
            评估结果字典，包含品类ID、评估状态、收购区间、预估利润等
        """
        # 1. 通过关键词匹配价格本品类
        price_book_entry = await self._find_matching_category(
            item_data.get('搜索关键字', ''),
            item_data.get('商品信息', {}).get('商品标题', '')
        )
        
        if not price_book_entry:
            return {
                'category_id': None,
                'category_name': None,
                'evaluation_status': 'no_config',
                'purchase_range_low': None,
                'purchase_range_high': None,
                'estimated_profit': None,
                'estimated_profit_rate': None,
                'premium_rate': None
            }
        
        # 2. 计算收购区间
        purchase_range = self._calculate_purchase_range(price_book_entry)
        
        # 3. 提取商品价格
        current_price = self._extract_price(
            item_data.get('商品信息', {}).get('当前售价', '')
        )
        
        # 4. 评估商品价格
        evaluation = self._evaluate_price(
            current_price,
            purchase_range,
            price_book_entry
        )
        
        return evaluation
    
    async def _find_matching_category(self, task_keyword: str, title: str) -> Optional[Dict[str, Any]]:
        """
        通过关键词匹配价格本品类
        
        Args:
            task_keyword: 任务关键词
            title: 商品标题
            
        Returns:
            匹配的价格本条目，如果没有匹配则返回 None
        """
        entries = await self.price_book_service.get_all()
        
        title_lower = title.lower()
        task_keyword_lower = task_keyword.lower()
        
        for entry in entries:
            keywords = entry.get('keywords', [])
            if not keywords:
                continue
                
            for keyword in keywords:
                keyword_lower = keyword.lower()
                if keyword_lower in title_lower or keyword_lower in task_keyword_lower:
                    return entry
        
        return None
    
    def _calculate_purchase_range(self, entry: Dict[str, Any]) -> Tuple[float, float]:
        """
        计算收购区间
        
        Args:
            entry: 价格本条目
            
        Returns:
            (理想收购价, 收购上限) 元组
        """
        target_sell = entry.get('target_sell_price', 0)
        if target_sell <= 0:
            return (0.0, 0.0)
        
        fees = entry.get('fees', {})
        
        # 总费用 = 固定费用 + 平台手续费
        total_fees = (
            fees.get('shipping_fee', 0) +
            fees.get('refurbish_fee', 0) +
            fees.get('other_fee', 0) +
            target_sell * fees.get('platform_fee_rate', 0)
        )
        
        # 收购上限 = 目标出货价 - 总费用 - 最低利润
        min_profit_rate = entry.get('min_profit_rate', 0.15)
        min_profit = target_sell * min_profit_rate
        upper = target_sell - total_fees - min_profit
        
        # 理想收购价 = 目标出货价 - 总费用 - 理想利润
        ideal_profit_rate = entry.get('ideal_profit_rate', 0.25)
        ideal_profit = target_sell * ideal_profit_rate
        ideal = target_sell - total_fees - ideal_profit
        
        return (max(0, ideal), max(0, upper))
    
    def _extract_price(self, price_str: str) -> float:
        """
        从价格字符串提取数值
        
        Args:
            price_str: 价格字符串，如 "¥1,999" 或 "1999元"
            
        Returns:
            价格数值
        """
        if not price_str:
            return 0.0
        
        # 移除 ¥ 符号、逗号、元等
        price_str = str(price_str).replace('¥', '').replace(',', '').replace('元', '').strip()
        
        # 提取数字
        match = re.search(r'[\d.]+', price_str)
        if match:
            try:
                return float(match.group())
            except ValueError:
                return 0.0
        
        return 0.0
    
    def _evaluate_price(
        self,
        current_price: float,
        purchase_range: Tuple[float, float],
        entry: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        评估商品价格状态
        
        Args:
            current_price: 当前售价
            purchase_range: 收购区间 (理想价, 上限价)
            entry: 价格本条目
            
        Returns:
            评估结果字典
        """
        ideal, upper = purchase_range
        
        # 判断评估状态
        if current_price <= 0:
            status = 'no_config'
        elif current_price <= ideal:
            status = 'great_deal'  # 超值捡漏
        elif current_price <= upper:
            status = 'good_deal'   # 可收
        else:
            status = 'overpriced'  # 超出区间
        
        # 计算预估利润
        target_sell = entry.get('target_sell_price', 0)
        fees = entry.get('fees', {})
        
        total_fees = (
            fees.get('shipping_fee', 0) +
            fees.get('refurbish_fee', 0) +
            fees.get('other_fee', 0) +
            target_sell * fees.get('platform_fee_rate', 0)
        )
        
        estimated_profit = target_sell - current_price - total_fees if target_sell > 0 else 0
        estimated_profit_rate = estimated_profit / target_sell if target_sell > 0 else 0
        
        # 计算溢价率（相对行情价）
        premium_rate = None
        market_price = entry.get('market_price')
        if market_price and market_price > 0 and current_price > 0:
            premium_rate = (current_price - market_price) / market_price
        
        return {
            'category_id': entry.get('id'),
            'category_name': entry.get('category_name'),
            'evaluation_status': status,
            'purchase_range_low': ideal,
            'purchase_range_high': upper,
            'estimated_profit': estimated_profit,
            'estimated_profit_rate': estimated_profit_rate,
            'premium_rate': premium_rate
        }
