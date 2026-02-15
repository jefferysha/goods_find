"""卖家信用评分 API 路由"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from src.services.seller_credit_service import SellerCreditService

router = APIRouter(prefix="/api/seller-credit", tags=["seller-credit"])
seller_credit_service = SellerCreditService()


class SellerListRequest(BaseModel):
    seller_id: str
    seller_name: str
    reason: Optional[str] = ""


@router.get("/{seller_id}")
async def get_seller_credit(seller_id: str):
    """获取卖家信用信息"""
    status = await seller_credit_service.check_seller_status(seller_id)
    profile = await seller_credit_service.get_seller_profile(seller_id)

    if profile:
        return {**profile, **status}

    # 如果没有存档，返回基本状态
    return {
        "seller_id": seller_id,
        "credit_score": None,
        "credit_level": None,
        **status,
    }


@router.post("/blacklist")
async def add_to_blacklist(req: SellerListRequest):
    """添加到黑名单"""
    success = await seller_credit_service.add_to_blacklist(
        req.seller_id, req.seller_name, req.reason or ""
    )
    if not success:
        raise HTTPException(status_code=500, detail="操作失败")
    return {"message": "已加入黑名单"}


@router.post("/whitelist")
async def add_to_whitelist(req: SellerListRequest):
    """添加到白名单"""
    success = await seller_credit_service.add_to_whitelist(
        req.seller_id, req.seller_name, req.reason or ""
    )
    if not success:
        raise HTTPException(status_code=500, detail="操作失败")
    return {"message": "已加入白名单"}


@router.delete("/list/{seller_id}")
async def remove_from_list(seller_id: str):
    """从黑/白名单中移除"""
    success = await seller_credit_service.remove_from_list(seller_id)
    if not success:
        raise HTTPException(status_code=404, detail="该卖家不在名单中")
    return {"message": "已从名单移除"}


@router.get("/list/blacklist")
async def get_blacklist():
    """获取黑名单"""
    return await seller_credit_service.get_blacklist()


@router.get("/list/whitelist")
async def get_whitelist():
    """获取白名单"""
    return await seller_credit_service.get_whitelist()
