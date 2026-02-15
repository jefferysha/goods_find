"""
登录状态管理路由 —— 数据存储在 SQLite login_states 表
"""
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from src.infrastructure.persistence.sqlite_login_state_repository import SqliteLoginStateRepository


router = APIRouter(prefix="/api/login-state", tags=["login-state"])
state_repo = SqliteLoginStateRepository()

# 默认的登录状态名称（兼容旧逻辑）
DEFAULT_STATE_NAME = "xianyu_default"


class LoginStateUpdate(BaseModel):
    """登录状态更新模型"""
    content: str


@router.post("", response_model=dict)
async def update_login_state(data: LoginStateUpdate):
    """接收前端发送的登录状态 JSON 字符串，保存到数据库"""
    try:
        json.loads(data.content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="提供的内容不是有效的JSON格式。")

    await state_repo.save(DEFAULT_STATE_NAME, data.content)
    return {"message": "登录状态已成功更新。"}


@router.delete("", response_model=dict)
async def delete_login_state():
    """删除默认登录状态"""
    success = await state_repo.delete(DEFAULT_STATE_NAME)
    if success:
        return {"message": "登录状态已成功删除。"}
    return {"message": "登录状态不存在，无需删除。"}
