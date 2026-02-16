"""商品匹配 API 路由"""
from fastapi import APIRouter, HTTPException
from typing import Optional, List
import os

router = APIRouter(prefix="/api/product-groups", tags=["product-match"])


def _get_service():
    from src.services.product_match_service import ProductMatchService
    db_path = os.environ.get("TEST_DB_PATH")
    return ProductMatchService(db_path=db_path) if db_path else ProductMatchService()


@router.post("")
async def create_product_group(payload: dict):
    service = _get_service()
    return await service.create_product_group(
        name=payload["name"],
        brand=payload.get("brand"),
        model=payload.get("model"),
        category_path=payload.get("category_path"),
        spec_summary=payload.get("spec_summary"),
    )


@router.get("")
async def list_product_groups(brand: Optional[str] = None, model: Optional[str] = None):
    service = _get_service()
    return await service.list_product_groups(brand=brand, model=model)


# /merge MUST be registered BEFORE /{group_id} to avoid "merge" being captured as a group_id
@router.post("/merge")
async def merge_groups(payload: dict):
    service = _get_service()
    success = await service.merge_groups(
        target_group_id=payload["target_group_id"],
        source_group_ids=payload["source_group_ids"],
    )
    return {"success": success}


@router.get("/{group_id}")
async def get_product_group(group_id: str):
    service = _get_service()
    group = await service.get_product_group(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Product group not found")
    return group


@router.delete("/{group_id}")
async def delete_product_group(group_id: str):
    service = _get_service()
    success = await service.delete_product_group(group_id)
    return {"success": success}


@router.post("/{group_id}/items")
async def link_item(group_id: str, payload: dict):
    service = _get_service()
    return await service.link_item_to_group(
        item_id=payload["item_id"],
        product_group_id=group_id,
        condition_tier=payload.get("condition_tier", "good"),
        condition_detail=payload.get("condition_detail", ""),
        confidence=payload.get("confidence", 0.0),
        matched_by=payload.get("matched_by", "manual"),
    )


@router.get("/{group_id}/items")
async def get_group_items(group_id: str):
    service = _get_service()
    return await service.get_group_items(group_id)


@router.post("/{group_id}/items/{item_id}/move")
async def move_item(group_id: str, item_id: str, payload: dict):
    service = _get_service()
    success = await service.move_item(item_id=item_id, new_group_id=payload["new_group_id"])
    return {"success": success}
