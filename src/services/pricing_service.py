"""溢价分析服务"""
import statistics
from typing import List, Optional
from src.domain.models.market_price import MarketPrice, PremiumThresholds
from src.domain.models.price_analysis import PriceAnalysis, BatchStats
from src.infrastructure.persistence.sqlite_market_price_repository import SqliteMarketPriceRepository


class PricingService:
    def __init__(self):
        self.repo = SqliteMarketPriceRepository()

    def calculate_batch_stats(self, prices: List[float]) -> BatchStats:
        if not prices:
            return BatchStats()
        return BatchStats(
            avg_price=round(statistics.mean(prices), 2),
            median_price=round(statistics.median(prices), 2),
            min_price=round(min(prices), 2),
            max_price=round(max(prices), 2),
            total_count=len(prices),
        )

    def calculate_premium_rate(self, item_price: float, reference_price: float) -> float:
        if reference_price <= 0:
            return 0.0
        return round((item_price - reference_price) / reference_price * 100, 2)

    def classify_price_level(self, premium_rate: float, thresholds: PremiumThresholds) -> str:
        if premium_rate < thresholds.low_price_max:
            return "low_price"
        elif premium_rate <= thresholds.fair_max:
            return "fair"
        elif premium_rate <= thresholds.slight_premium_max:
            return "slight_premium"
        else:
            return "high_premium"

    def calculate_percentile(self, price: float, all_prices: List[float]) -> float:
        if not all_prices:
            return 0.0
        below = sum(1 for p in all_prices if p < price)
        return round(below / len(all_prices) * 100, 2)

    async def analyze_batch(
        self,
        items: List[dict],
        task_id: int,
        thresholds: Optional[PremiumThresholds] = None,
    ) -> List[PriceAnalysis]:
        if thresholds is None:
            thresholds = PremiumThresholds()

        market_prices = await self.repo.get_by_task_id(task_id)
        ref_price_map = {mp.condition: mp.reference_price for mp in market_prices}
        default_ref = ref_price_map.get("good") or (market_prices[0].reference_price if market_prices else None)

        # Extract all prices
        all_prices: List[float] = []
        for item in items:
            price_str = str(item.get("商品信息", {}).get("当前售价", "0"))
            price_str = price_str.replace("¥", "").replace(",", "").strip()
            try:
                all_prices.append(float(price_str))
            except (ValueError, TypeError):
                all_prices.append(0.0)

        batch_stats = self.calculate_batch_stats(all_prices)
        results: List[PriceAnalysis] = []

        for i, item in enumerate(items):
            item_price = all_prices[i]
            item_id = str(item.get("商品信息", {}).get("商品ID", str(i)))

            ref = default_ref
            premium_rate = self.calculate_premium_rate(item_price, ref) if ref else None
            level = self.classify_price_level(premium_rate, thresholds) if premium_rate is not None else "unknown"

            item_stats = BatchStats(
                avg_price=batch_stats.avg_price,
                median_price=batch_stats.median_price,
                min_price=batch_stats.min_price,
                max_price=batch_stats.max_price,
                total_count=batch_stats.total_count,
                percentile=self.calculate_percentile(item_price, all_prices),
            )

            results.append(PriceAnalysis(
                item_id=item_id,
                item_price=item_price,
                reference_price=ref,
                premium_rate=premium_rate,
                price_level=level,
                batch_stats=item_stats,
            ))

        return results
