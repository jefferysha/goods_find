"""品类管理 API 路由"""
from fastapi import APIRouter, HTTPException
from typing import Optional, List
import os

router = APIRouter(prefix="/api/categories", tags=["categories"])


def _get_service():
    from src.services.category_service import CategoryService
    db_path = os.environ.get("TEST_DB_PATH")
    return CategoryService(db_path=db_path) if db_path else CategoryService()


@router.post("")
async def create_category(payload: dict):
    service = _get_service()
    return await service.create_category(
        name=payload["name"],
        level=payload.get("level", 1),
        parent_id=payload.get("parent_id"),
        keywords=payload.get("keywords"),
    )


@router.get("/tree")
async def get_category_tree():
    service = _get_service()
    return await service.get_category_tree()


@router.get("/{category_id}")
async def get_category(category_id: str):
    service = _get_service()
    cat = await service.get_category(category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return cat


@router.put("/{category_id}")
async def update_category(category_id: str, payload: dict):
    service = _get_service()
    result = await service.update_category(
        category_id,
        name=payload.get("name"),
        keywords=payload.get("keywords"),
    )
    if not result:
        raise HTTPException(status_code=404, detail="Category not found")
    return result


@router.delete("/{category_id}")
async def delete_category(category_id: str):
    service = _get_service()
    success = await service.delete_category(category_id)
    return {"success": success}


@router.get("/{category_id}/path")
async def get_category_path(category_id: str):
    service = _get_service()
    path = await service.get_category_path(category_id)
    return {"path": path}
