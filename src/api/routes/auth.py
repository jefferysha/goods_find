"""认证路由 - 注册、登录、用户信息、修改密码"""
from fastapi import APIRouter, HTTPException, Depends

from src.domain.models.user import (
    UserCreate,
    UserLogin,
    UserInfo,
    TokenResponse,
    ChangePasswordRequest,
)
from src.services import auth_service
from src.api.auth_middleware import get_current_user

router = APIRouter(prefix="/api/auth", tags=["认证"])


@router.post("/register", response_model=TokenResponse)
async def register(data: UserCreate):
    """用户注册"""
    try:
        result = await auth_service.register(data)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    """用户登录"""
    try:
        result = await auth_service.login(data.username, data.password)
        return result
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/me", response_model=UserInfo)
async def get_me(current_user: UserInfo = Depends(get_current_user)):
    """获取当前登录用户信息"""
    return current_user


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: UserInfo = Depends(get_current_user),
):
    """修改密码"""
    try:
        await auth_service.change_password(
            current_user.id, data.old_password, data.new_password
        )
        return {"message": "密码修改成功"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/check")
async def check_auth(current_user: UserInfo = Depends(get_current_user)):
    """检查 Token 是否有效（前端心跳检测用）"""
    return {"valid": True, "username": current_user.username}
