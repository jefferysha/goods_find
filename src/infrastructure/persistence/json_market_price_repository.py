"""
基于JSON文件的市场基准价仓储实现
"""
from typing import List, Optional
import json
import aiofiles
from datetime import datetime
from src.domain.models.market_price import MarketPrice
from src.domain.repositories.market_price_repository import MarketPriceRepository


class JsonMarketPriceRepository(MarketPriceRepository):
    """基于JSON文件的市场基准价仓储"""

    def __init__(self, data_file: str = "market_prices.json"):
        self.data_file = data_file

    async def _read_all(self) -> List[MarketPrice]:
        """从文件读取所有基准价"""
        try:
            async with aiofiles.open(self.data_file, 'r', encoding='utf-8') as f:
                content = await f.read()
                if not content.strip():
                    return []
                data = json.loads(content)
                return [MarketPrice(**item) for item in data]
        except FileNotFoundError:
            return []
        except json.JSONDecodeError:
            print(f"基准价文件 {self.data_file} 格式错误")
            return []

    async def _write_all(self, prices: List[MarketPrice]):
        """写入所有基准价到文件"""
        data = [p.dict() for p in prices]
        async with aiofiles.open(self.data_file, 'w', encoding='utf-8') as f:
            await f.write(json.dumps(data, ensure_ascii=False, indent=2))

    async def get_by_task_id(self, task_id: int) -> List[MarketPrice]:
        """获取指定任务的所有基准价"""
        all_prices = await self._read_all()
        return [p for p in all_prices if p.task_id == task_id]

    async def get_by_id(self, id: str) -> Optional[MarketPrice]:
        """根据ID获取基准价"""
        all_prices = await self._read_all()
        for p in all_prices:
            if p.id == id:
                return p
        return None

    async def create(self, price: MarketPrice) -> MarketPrice:
        """创建新的基准价"""
        all_prices = await self._read_all()
        all_prices.append(price)
        await self._write_all(all_prices)
        return price

    async def update(self, id: str, data: dict) -> Optional[MarketPrice]:
        """更新基准价"""
        all_prices = await self._read_all()
        for i, p in enumerate(all_prices):
            if p.id == id:
                updated_data = p.dict()
                updated_data.update(data)
                updated_data["updated_at"] = datetime.now().isoformat()
                all_prices[i] = MarketPrice(**updated_data)
                await self._write_all(all_prices)
                return all_prices[i]
        return None

    async def delete(self, id: str) -> bool:
        """删除基准价"""
        all_prices = await self._read_all()
        original_len = len(all_prices)
        all_prices = [p for p in all_prices if p.id != id]
        if len(all_prices) < original_len:
            await self._write_all(all_prices)
            return True
        return False

    async def get_all(self) -> List[MarketPrice]:
        """获取所有基准价"""
        return await self._read_all()
