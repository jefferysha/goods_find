"""AI 议价话术 API 路由"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from src.services.bargain_service import BargainService

router = APIRouter(prefix="/api/bargain", tags=["bargain"])
bargain_service = BargainService()


class BargainRequest(BaseModel):
    """议价话术生成请求"""
    item_info: Dict[str, Any]
    target_price: float
    strategy: Optional[str] = "gentle"


@router.post("/generate")
async def generate_bargain_scripts(req: BargainRequest):
    """生成 AI 议价话术"""
    result = await bargain_service.generate_bargain_scripts(
        item_info=req.item_info,
        target_price=req.target_price,
        strategy=req.strategy or "gentle",
    )
    return result


@router.get("/strategies")
async def list_strategies():
    """获取可用的议价策略列表"""
    return bargain_service.get_available_strategies()
