"""平台管理路由"""
from fastapi import APIRouter
from src.domain.models.platform import get_all_platforms, get_enabled_platforms

router = APIRouter(prefix="/api/platforms", tags=["platforms"])


@router.get("")
async def list_platforms():
    """获取所有平台信息（包括未启用的）"""
    platforms = get_all_platforms()
    return [p.dict() for p in platforms]


@router.get("/enabled")
async def list_enabled_platforms():
    """获取所有已启用平台"""
    platforms = get_enabled_platforms()
    return [p.dict() for p in platforms]
