# routers/websocket_router.py — Phase 5: WebSocket endpoint
# SQLAlchemy 2.0: select() + execute()
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy import select
from app.auth import decode_access_token
from app.database import SessionLocal
from app.websocket.connection_manager import manager
from app import models

logger = logging.getLogger(__name__)
router = APIRouter(tags=["WebSocket"])


def _get_user(token: str) -> models.User | None:
    db = SessionLocal()
    try:
        email = decode_access_token(token)
        if not email: return None
        return db.execute(
            select(models.User).where(
                models.User.email     == email,
                models.User.is_active == True
            )
        ).scalar_one_or_none()
    finally:
        db.close()


@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int, token: str = Query(...)):
    """
    WebSocket endpoint — authenticated via JWT query param.
    Connect: ws://localhost:8000/ws/{user_id}?token=<access_token>
    """
    user = _get_user(token)
    if not user or user.id != user_id:
        await websocket.close(code=4001, reason="Unauthorized")
        return
    await manager.connect(websocket, user_id=user.id, role=user.role)
    try:
        while True:
            data = await websocket.receive_text()
            if "ping" in data.lower():
                await websocket.send_text('{"event":"pong","data":{}}')
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id=user.id)
    except Exception as e:
        manager.disconnect(websocket, user_id=user.id)
        logger.error(f"WS error user {user_id}: {e}")


@router.get("/ws/status")
def ws_status():
    return {"active_connections": manager.active_connection_count(),
            "connected_users":    manager.connected_user_ids()}
