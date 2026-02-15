"""
闲鱼账号管理路由 —— 数据存储在 SQLite login_states 表
"""
import json
import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from src.infrastructure.persistence.sqlite_login_state_repository import SqliteLoginStateRepository


router = APIRouter(prefix="/api/accounts", tags=["accounts"])
state_repo = SqliteLoginStateRepository()

ACCOUNT_NAME_RE = re.compile(r"^[a-zA-Z0-9_-]{1,50}$")


class AccountCreate(BaseModel):
    name: str
    content: str


class AccountUpdate(BaseModel):
    content: str


def _validate_name(name: str) -> str:
    trimmed = name.strip()
    if not trimmed or not ACCOUNT_NAME_RE.match(trimmed):
        raise HTTPException(status_code=400, detail="账号名称只能包含字母、数字、下划线或短横线。")
    return trimmed


def _validate_json(content: str) -> None:
    try:
        json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="提供的内容不是有效的JSON格式。")


@router.get("", response_model=List[dict])
async def list_accounts():
    accounts = await state_repo.list_all()
    # 过滤掉默认登录状态，只返回用户创建的账号
    return [a for a in accounts if a["name"] != "xianyu_default"]


@router.get("/{name}", response_model=dict)
async def get_account(name: str):
    account_name = _validate_name(name)
    content = await state_repo.get(account_name)
    if content is None:
        raise HTTPException(status_code=404, detail="账号不存在")
    return {"name": account_name, "content": content}


@router.post("", response_model=dict)
async def create_account(data: AccountCreate):
    account_name = _validate_name(data.name)
    _validate_json(data.content)
    existing = await state_repo.get(account_name)
    if existing is not None:
        raise HTTPException(status_code=409, detail="账号已存在")
    await state_repo.save(account_name, data.content)
    return {"message": "账号已添加", "name": account_name}


@router.put("/{name}", response_model=dict)
async def update_account(name: str, data: AccountUpdate):
    account_name = _validate_name(name)
    _validate_json(data.content)
    existing = await state_repo.get(account_name)
    if existing is None:
        raise HTTPException(status_code=404, detail="账号不存在")
    await state_repo.save(account_name, data.content)
    return {"message": "账号已更新", "name": account_name}


@router.delete("/{name}", response_model=dict)
async def delete_account(name: str):
    account_name = _validate_name(name)
    success = await state_repo.delete(account_name)
    if not success:
        raise HTTPException(status_code=404, detail="账号不存在")
    return {"message": "账号已删除"}
