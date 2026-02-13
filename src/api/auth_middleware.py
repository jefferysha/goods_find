"""JWT 鉴权中间件 - 保护 API 路由"""
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

from src.services.auth_service import decode_token, get_user_by_id
from src.domain.models.user import UserInfo

# Bearer Token 提取器
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> UserInfo:
    """从 Authorization header 提取并验证 JWT Token，返回当前用户"""
    if not credentials:
        raise HTTPException(status_code=401, detail="未提供认证令牌")

    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="认证令牌无效或已过期")

    user_id = int(payload.get("sub", 0))
    if not user_id:
        raise HTTPException(status_code=401, detail="无效的令牌内容")

    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="用户不存在")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="账户已被禁用")

    return user


async def optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[UserInfo]:
    """可选的用户认证 - 不强制要求登录"""
    if not credentials:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None
