"""基准价仓储接口"""
from abc import ABC, abstractmethod
from typing import List, Optional
from src.domain.models.market_price import MarketPrice


class MarketPriceRepository(ABC):
    @abstractmethod
    async def get_by_task_id(self, task_id: int) -> List[MarketPrice]: ...

    @abstractmethod
    async def get_by_id(self, id: str) -> Optional[MarketPrice]: ...

    @abstractmethod
    async def create(self, price: MarketPrice) -> MarketPrice: ...

    @abstractmethod
    async def update(self, id: str, data: dict) -> Optional[MarketPrice]: ...

    @abstractmethod
    async def delete(self, id: str) -> bool: ...

    @abstractmethod
    async def get_all(self) -> List[MarketPrice]: ...
