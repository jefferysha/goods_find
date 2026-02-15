"""团队管理 API 路由"""
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
from src.services.team_service import TeamService
from src.api.auth_middleware import get_current_user, require_admin
from src.domain.models.user import UserInfo

router = APIRouter(prefix="/api/team", tags=["team"])
service = TeamService()


@router.get("/members")
async def get_members(current_user: UserInfo = Depends(get_current_user)):
    members = await service.get_all_members()
    return members


@router.get("/members/{user_id}")
async def get_member(user_id: int, current_user: UserInfo = Depends(get_current_user)):
    member = await service.get_member(user_id)
    if not member:
        raise HTTPException(status_code=404, detail="成员未找到")
    return member


@router.put("/members/{user_id}")
async def update_member(user_id: int, data: dict, current_user: UserInfo = Depends(require_admin)):
    member = await service.update_member(user_id, data)
    if not member:
        raise HTTPException(status_code=404, detail="成员未找到")
    return {"message": "更新成功", "data": member}


@router.get("/performance")
async def get_team_performance(
    user_id: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: UserInfo = Depends(get_current_user),
):
    data = await service.get_member_performance(
        user_id=user_id, start_date=start_date, end_date=end_date,
    )
    return data


@router.get("/workspace/{user_id}")
async def get_workspace(user_id: int, current_user: UserInfo = Depends(get_current_user)):
    data = await service.get_workspace_data(user_id)
    if not data:
        raise HTTPException(status_code=404, detail="成员未找到")
    return data
