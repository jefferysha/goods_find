"""
WebSocket 路由
提供实时通信功能，支持新商品发现事件的实时推送
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Set, Optional, Dict, Any


router = APIRouter()

# 全局 WebSocket 连接管理
active_connections: Set[WebSocket] = set()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
):
    """WebSocket 端点"""
    # 接受连接
    await websocket.accept()
    active_connections.add(websocket)

    try:
        # 保持连接并接收消息
        while True:
            # 接收客户端消息（如果有的话）
            data = await websocket.receive_text()
            # 这里可以处理客户端发送的消息
            # 目前我们主要用于服务端推送，所以暂时不处理
    except WebSocketDisconnect:
        active_connections.remove(websocket)
    except Exception as e:
        print(f"WebSocket 错误: {e}")
        if websocket in active_connections:
            active_connections.remove(websocket)


async def broadcast_message(message_type: str, data: dict):
    """向所有连接的客户端广播消息"""
    message = {
        "type": message_type,
        "data": data
    }

    # 移除已断开的连接
    disconnected = set()

    for connection in active_connections:
        try:
            await connection.send_json(message)
        except Exception:
            disconnected.add(connection)

    # 清理断开的连接
    for connection in disconnected:
        active_connections.discard(connection)


# --- 内部 API：爬虫子进程通过 HTTP 回调推送新商品事件 ---

class NewItemEvent(BaseModel):
    """爬虫发现新商品时的事件"""
    task_name: str
    keyword: str
    item_id: str
    title: str
    price: Optional[float] = None
    image_url: Optional[str] = None
    item_link: Optional[str] = None
    seller_name: Optional[str] = None
    is_recommended: Optional[bool] = None
    ai_reason: Optional[str] = None
    evaluation_status: Optional[str] = None
    estimated_profit: Optional[float] = None
    instant_notify: bool = False  # 是否为秒推模式下的速报


@router.post("/api/internal/new-item-event")
async def receive_new_item_event(event: NewItemEvent):
    """
    接收爬虫子进程推送的新商品事件，并通过 WebSocket 广播到前端。
    这个端点供爬虫进程内部调用，不需要用户认证。
    """
    await broadcast_message("new_item_discovered", event.dict())
    return {"status": "ok"}
