"""用户模型"""
from pydantic import BaseModel, Field
from typing import Optional


class User(BaseModel):
    id: int = 0
    username: str
    password_hash: str = ""
    display_name: str = ""
    is_active: bool = True
    created_at: str = ""
    updated_at: str = ""


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=32, pattern=r"^[a-zA-Z0-9_]+$")
    password: str = Field(..., min_length=6, max_length=64)
    display_name: str = ""


class UserLogin(BaseModel):
    username: str
    password: str


class UserInfo(BaseModel):
    """返回给前端的用户信息（不含密码）"""
    id: int
    username: str
    display_name: str
    is_active: bool
    created_at: str
    role: str = "member"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserInfo


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6, max_length=64)
